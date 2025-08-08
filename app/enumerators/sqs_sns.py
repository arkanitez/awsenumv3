from __future__ import annotations
from typing import List
import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError
from ..graph import Graph
CFG = BotoConfig(retries={'max_attempts': 8, 'mode': 'adaptive'}, read_timeout=20, connect_timeout=10)
def mk_id(*parts: str) -> str: return ":".join([p for p in parts if p])
def enumerate(session: boto3.Session, account_id: str, region: str, g: Graph, warnings: List[str]) -> None:
    sns = session.client('sns', region_name=region, config=CFG)
    try:
        for t in sns.list_topics().get('Topics', []) or []:
            arn = t['TopicArn']
            g.add_node(mk_id('sns', account_id, region, arn), arn.split(':')[-1], 'sns_topic', region)
    except ClientError as e:
        warnings.append(f'sns list_topics: {e.response["Error"]["Code"]}')
    sqs = session.client('sqs', region_name=region, config=CFG)
    try:
        for q in (sqs.list_queues().get('QueueUrls', []) or []):
            g.add_node(mk_id('sqs', account_id, region, q), q.split('/')[-1], 'sqs_queue', region)
    except ClientError as e:
        warnings.append(f'sqs list_queues: {e.response["Error"]["Code"]}')
