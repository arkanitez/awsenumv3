from __future__ import annotations
import os
from typing import Any, List
import boto3
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import orjson

from .graph import Graph
from .reachability import derive_reachability
from .findings import analyze as analyze_findings
from .enumerators import ec2, elbv2, lambda_, apigwv2, s3, sqs_sns, dynamodb, rds, eks, ecs

DEFAULT_REGION = os.environ.get('DEFAULT_REGION', 'ap-southeast-1')

def json_response(obj: Any) -> JSONResponse:
    return JSONResponse(orjson.loads(orjson.dumps(obj)))

app = FastAPI()
app.mount('/ui', StaticFiles(directory=os.path.join(os.path.dirname(__file__), 'ui')), name='ui')

@app.get('/', response_class=HTMLResponse)
async def index():
    with open(os.path.join(os.path.dirname(__file__), 'ui', 'index.html'), 'r', encoding='utf-8') as f:
        return HTMLResponse(f.read())

def build_session(ak: str|None, sk: str|None, st: str|None, region: str) -> boto3.Session:
    if ak and sk:
        return boto3.Session(aws_access_key_id=ak, aws_secret_access_key=sk, aws_session_token=st, region_name=region)
    return boto3.Session(region_name=region)

@app.post('/enumerate')
async def enumerate_api(req: Request):
    payload = await req.json()
    ak = (payload.get('access_key_id') or '').strip() or None
    sk = (payload.get('secret_access_key') or '').strip() or None
    st = (payload.get('session_token') or '').strip() or None
    region = (payload.get('region') or DEFAULT_REGION).strip()

    sess = build_session(ak, sk, st, region)

    warnings: List[str] = []
    try:
        me = sess.client('sts').get_caller_identity()
        account_id = me.get('Account') or 'self'
    except Exception as e:
        account_id = 'self'
        warnings.append(f'sts get_caller_identity failed: {e}')

    g = Graph()

    services = [
        ('ec2', ec2.enumerate),
        ('elbv2', elbv2.enumerate),
        ('lambda', lambda_.enumerate),
        ('apigwv2', apigwv2.enumerate),
        ('s3', s3.enumerate),
        ('sqs_sns', sqs_sns.enumerate),
        ('dynamodb', dynamodb.enumerate),
        ('rds', rds.enumerate),
        ('eks', eks.enumerate),
        ('ecs', ecs.enumerate),
    ]

    for name, fn in services:
        try:
            fn(sess, account_id, region, g, warnings)
        except Exception as e:
            warnings.append(f'{name} failed: {e}')

    for e in derive_reachability(g):
        g.add_edge(**e)

    elements = g.elements()
    findings = analyze_findings(elements)
    return json_response({ 'elements': elements, 'warnings': warnings, 'findings': findings, 'region': region })

@app.get('/_health')
async def health():
    return { 'ok': True, 'region': DEFAULT_REGION }
