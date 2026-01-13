from pathlib import Path

import google.generativeai as genai

from app.clients.openai_client import get_openai_client
from app.config import settings


def transcribe_audio_openai(path: Path) -> str:
    client = get_openai_client()
    with path.open("rb") as audio_file:
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
        )
    return result.text


def transcribe_audio_gemini(path: Path) -> str:
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    uploaded = genai.upload_file(path)
    response = model.generate_content(["Transcreva o audio em texto.", uploaded])
    return response.text or ""


def transcribe_audio(path: Path) -> str:
    try:
        return transcribe_audio_openai(path)
    except Exception:
        return transcribe_audio_gemini(path)
