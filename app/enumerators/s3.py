from __future__ import annotations
from typing import List
import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError
from ..graph import Graph
CFG = BotoConfig(retries={'max_attempts': 8, 'mode': 'adaptive'}, read_timeout=20, connect_timeout=10)
def mk_id(*parts: str) -> str: return ":".join([p for p in parts if p])
def enumerate(session: boto3.Session, account_id: str, region: str, g: Graph, warnings: List[str]) -> None:
    s3 = session.client('s3', config=CFG)
    try:
        res = s3.list_buckets()
        for b in res.get('Buckets', []):
            name = b['Name']
            loc = 'us-east-1'
            try:
                lr = s3.get_bucket_location(Bucket=name)
                loc = lr.get('LocationConstraint') or 'us-east-1'
            except ClientError: pass
            g.add_node(mk_id('s3', account_id, loc, name), name, 's3_bucket', loc)
    except ClientError as e:
        warnings.append(f's3 list_buckets: {e.response["Error"]["Code"]}')
