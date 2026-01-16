from __future__ import annotations

import pusher

from app.config import settings

_pusher_client: pusher.Pusher | None = None


def get_pusher_client() -> pusher.Pusher:
    global _pusher_client
    if _pusher_client is None:
        _pusher_client = pusher.Pusher(
            app_id=settings.pusher_app_id,
            key=settings.pusher_key,
            secret=settings.pusher_secret,
            cluster=settings.pusher_cluster,
            ssl=True,
        )
    return _pusher_client
