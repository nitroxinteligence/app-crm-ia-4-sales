import httpx

from app.config import settings


class WhatsAppClient:
    def __init__(self, access_token: str, phone_number_id: str) -> None:
        self.access_token = access_token
        self.phone_number_id = phone_number_id

    def _base_url(self) -> str:
        return f"{settings.whatsapp_graph_url}/{settings.whatsapp_api_version}/{self.phone_number_id}/messages"

    def send_text(self, to: str, body: str) -> dict:
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": body},
        }
        return self._post(payload)

    def send_template(self, to: str, name: str, language_code: str, components: list[dict] | None = None) -> dict:
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": name,
                "language": {"code": language_code},
                "components": components or [],
            },
        }
        return self._post(payload)

    def _post(self, payload: dict) -> dict:
        headers = {"Authorization": f"Bearer {self.access_token}"}
        with httpx.Client(timeout=15) as client:
            response = client.post(self._base_url(), headers=headers, json=payload)
            response.raise_for_status()
            return response.json()


def fetch_media_metadata(access_token: str, media_id: str) -> dict:
    url = f"{settings.whatsapp_graph_url}/{settings.whatsapp_api_version}/{media_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"fields": "url,mime_type,file_size,sha256"}
    with httpx.Client(timeout=20) as client:
        response = client.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()


def download_media(access_token: str, media_url: str) -> bytes:
    headers = {"Authorization": f"Bearer {access_token}"}
    with httpx.Client(timeout=30) as client:
        response = client.get(media_url, headers=headers)
        response.raise_for_status()
        return response.content
