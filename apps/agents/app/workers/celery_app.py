import ssl
from urllib.parse import urlparse

from celery import Celery

from app.config import settings

redis_url = settings.redis_url
use_ssl = urlparse(redis_url).scheme == "rediss"
ssl_options = {"ssl_cert_reqs": ssl.CERT_REQUIRED} if use_ssl else None

celery_app = Celery(
    "vp_agents",
    broker=redis_url,
    backend=redis_url,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_track_started=True,
    broker_use_ssl=ssl_options,
    redis_backend_use_ssl=ssl_options,
    broker_connection_retry_on_startup=True,
    broker_transport_options={
        "health_check_interval": 30,
        "socket_keepalive": True,
        "socket_connect_timeout": 10,
        "socket_timeout": 30,
        "retry_on_timeout": True,
    },
    result_backend_transport_options={
        "health_check_interval": 30,
        "socket_keepalive": True,
        "socket_connect_timeout": 10,
        "socket_timeout": 30,
        "retry_on_timeout": True,
    },
)
