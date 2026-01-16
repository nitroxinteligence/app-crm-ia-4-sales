from __future__ import annotations

import functools

import boto3
from botocore.config import Config

from app.config import settings


def _resolve_endpoint() -> str:
    if settings.r2_endpoint:
        return settings.r2_endpoint
    return f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"


@functools.lru_cache(maxsize=1)
def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=_resolve_endpoint(),
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def build_r2_key(prefix: str, key: str) -> str:
    clean_key = key.lstrip("/")
    if clean_key.startswith(f"{prefix}/"):
        return clean_key
    return f"{prefix}/{clean_key}"
