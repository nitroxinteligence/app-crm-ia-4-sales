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
            return response.json()
