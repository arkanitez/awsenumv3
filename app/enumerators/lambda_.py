from __future__ import annotations
from typing import List
import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError
from ..graph import Graph

CFG = BotoConfig(retries={'max_attempts': 8, 'mode': 'adaptive'}, read_timeout=20, connect_timeout=10)
def mk_id(*parts: str) -> str: return ":".join([p for p in parts if p])

def enumerate(session: boto3.Session, account_id: str, region: str, g: Graph, warnings: List[str]) -> None:
    lam = session.client('lambda', region_name=region, config=CFG)
    try:
        paginator = lam.get_paginator('list_functions')
        for page in paginator.paginate():
            for fn in page.get('Functions', []) or []:
                arn = fn['FunctionArn']; name = fn['FunctionName']
                vpcid = fn.get('VpcConfig', {}).get('VpcId')
                g.add_node(mk_id('lambda', account_id, region, arn), name, 'lambda', region, details={'runtime': fn.get('Runtime')}, parent=mk_id('vpc', account_id, region, vpcid) if vpcid else None)
    except ClientError as e:
        warnings.append(f'lambda list_functions: {e.response["Error"]["Code"]}')
