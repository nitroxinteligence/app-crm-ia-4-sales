import httpx

from app.config import settings

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3"


def refresh_access_token(refresh_token: str) -> dict:
    if not settings.google_client_id or not settings.google_client_secret:
        raise ValueError("Missing Google OAuth config")
    data = {
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
    }
    response = httpx.post(GOOGLE_TOKEN_URL, data=data, timeout=15)
    response.raise_for_status()
    return response.json()


def fetch_google(access_token: str, path: str, method: str = "GET", payload: dict | None = None) -> dict:
    url = f"{GOOGLE_CALENDAR_BASE}{path}"
    response = httpx.request(
        method,
        url,
        headers={"Authorization": f"Bearer {access_token}"},
        json=payload,
        timeout=15,
    )
    response.raise_for_status()
    if response.content:
        return response.json()
    return {}


def create_event(access_token: str, calendar_id: str, payload: dict) -> dict:
    return fetch_google(access_token, f"/calendars/{calendar_id}/events", "POST", payload)


def update_event(access_token: str, calendar_id: str, event_id: str, payload: dict) -> dict:
    return fetch_google(access_token, f"/calendars/{calendar_id}/events/{event_id}", "PUT", payload)


def delete_event(access_token: str, calendar_id: str, event_id: str) -> None:
    fetch_google(access_token, f"/calendars/{calendar_id}/events/{event_id}", "DELETE")


def get_event(access_token: str, calendar_id: str, event_id: str) -> dict:
    return fetch_google(access_token, f"/calendars/{calendar_id}/events/{event_id}")
