import httpx

from app.config import settings


class InstagramClient:
    def __init__(self, access_token: str, instagram_id: str) -> None:
        self.access_token = access_token
        self.instagram_id = instagram_id

    def _base_url(self) -> str:
        return f"{settings.whatsapp_graph_url}/{settings.whatsapp_api_version}/{self.instagram_id}/messages"

    def send_text(self, to: str, body: str) -> dict:
        payload = {
            "recipient": {"id": to},
            "message": {"text": body},
            "messaging_type": "RESPONSE",
        }
        return self._post(payload)

    def _post(self, payload: dict) -> dict:
        headers = {"Authorization": f"Bearer {self.access_token}"}
        with httpx.Client(timeout=15) as client:
            response = client.post(self._base_url(), headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
