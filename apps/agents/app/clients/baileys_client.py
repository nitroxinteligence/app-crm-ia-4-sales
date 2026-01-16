import httpx

from app.config import settings


class BaileysClient:
    def __init__(self, integration_account_id: str) -> None:
        self.integration_account_id = integration_account_id

    def _base_url(self) -> str:
        base = settings.baileys_api_url.strip()
        if not base:
            raise ValueError("BAILEYS_API_URL not configured")
        return base.rstrip("/")

    def send_text(self, to: str, text: str) -> dict:
        payload = {
            "integrationAccountId": self.integration_account_id,
            "to": to,
            "type": "text",
            "text": text,
        }
        headers = {"Content-Type": "application/json"}
        if settings.baileys_api_key:
            headers["X-API-KEY"] = settings.baileys_api_key
        with httpx.Client(timeout=20) as client:
            response = client.post(
                f"{self._base_url()}/messages/send",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            message_id = data.get("messageId") if isinstance(data, dict) else None
            if message_id:
                return {"messages": [{"id": message_id}]}
            return data

    def list_groups(self) -> dict:
        headers = {"Content-Type": "application/json"}
        if settings.baileys_api_key:
            headers["X-API-KEY"] = settings.baileys_api_key
        with httpx.Client(timeout=20) as client:
            response = client.get(
                f"{self._base_url()}/sessions/{self.integration_account_id}/groups",
                headers=headers,
            )
            response.raise_for_status()
            return response.json()
