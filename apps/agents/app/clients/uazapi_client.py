import re
from urllib.parse import urlparse

import httpx

from app.config import settings

DEFAULT_PATH_SUFFIXES = (
    "",
    "/api/v2",
    "/api/v2.0",
    "/api/v1",
    "/api",
    "/v2",
    "/v2.0",
    "/v1",
)


def _build_base_urls(raw_value: str) -> list[str]:
    raw = (raw_value or "").strip()
    if not raw:
        return []

    values = [value for value in re.split(r"[\\s,]+", raw) if value]
    is_explicit_list = bool(re.search(r"[\\s,]", raw))
    unique: list[str] = []
    seen: set[str] = set()

    def add(value: str) -> None:
        normalized = value.rstrip("/")
        if not normalized or normalized in seen:
            return
        seen.add(normalized)
        unique.append(normalized)

    for value in values:
        trimmed = value.rstrip("/")
        if not trimmed:
            continue
        parsed = urlparse(trimmed)
        if parsed.scheme and parsed.netloc:
            origin = f"{parsed.scheme}://{parsed.netloc}"
            path = parsed.path.rstrip("/")
            if path and path != "/":
                add(f"{origin}{path}")
            else:
                add(origin)
            if not is_explicit_list:
                for suffix in DEFAULT_PATH_SUFFIXES:
                    add(f"{origin}{suffix}" if suffix else origin)
        else:
            add(trimmed)

    return unique


class UazapiClient:
    def __init__(self, token: str) -> None:
        self.token = (token or "").strip()
        self._base_urls_cache: list[str] | None = None

    def _base_urls(self) -> list[str]:
        if self._base_urls_cache is None:
            raw = settings.uazapi_base_urls or settings.uazapi_base_url
            self._base_urls_cache = _build_base_urls(raw)
        return self._base_urls_cache

    def _headers(self) -> dict:
        if not self.token:
            return {}
        headers = {"token": self.token}
        auth_value = (
            self.token
            if self.token.lower().startswith("bearer ")
            else f"Bearer {self.token}"
        )
        headers["Authorization"] = auth_value
        return headers

    def send_text(self, to: str, text: str) -> dict:
        payload = {
            "number": to,
            "text": text,
        }
        return self._post("/send/text", payload)

    def send_media(self, to: str, media_type: str, file_url: str, caption: str | None = None) -> dict:
        payload = {
            "number": to,
            "type": media_type,
            "file": file_url,
        }
        if caption:
            payload["text"] = caption
        return self._post("/send/media", payload)

    def instance_status(self) -> dict:
        return self._request("GET", "/instance/status", timeout=20)

    def chat_find(self, payload: dict) -> dict:
        return self._post("/chat/find", payload)

    def message_find(self, payload: dict) -> dict:
        return self._post("/message/find", payload)

    def _post(self, path: str, payload: dict) -> dict:
        return self._request("POST", path, payload=payload, timeout=25)

    def _request(self, method: str, path: str, payload: dict | None = None, timeout: int = 25) -> dict:
        base_urls = self._base_urls()
        if not base_urls:
            raise httpx.HTTPError("UAZAPI base URL not configured")
        last_error: Exception | None = None
        headers = self._headers()
        for base_url in base_urls:
            url = f"{base_url}{path}"
            try:
                with httpx.Client(timeout=timeout) as client:
                    response = client.request(
                        method,
                        url,
                        headers=headers,
                        json=payload,
                    )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as exc:
                last_error = exc
                continue
        if last_error:
            raise last_error
        raise httpx.HTTPError("UAZAPI request failed")
