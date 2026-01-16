import logging
import mimetypes
import shutil
import subprocess
import tempfile
from pathlib import Path

from app.clients.supabase import get_supabase_client
from app.clients.r2_client import build_r2_key, get_r2_client
from app.config import settings
from app.services.ocr import (
    extract_text_from_docx,
    extract_text_from_image,
    extract_text_from_pdf,
    extract_text_from_txt,
)
from app.services.transcription import transcribe_audio

# Route logs through uvicorn to ensure visibility in dev logs.
logger = logging.getLogger("uvicorn.error")
logger.setLevel(logging.INFO)


def _download_attachment(storage_path: str, target_path: Path) -> Path:
    r2 = get_r2_client()
    object_key = build_r2_key("inbox-attachments", storage_path)
    response = r2.get_object(
        Bucket=settings.r2_bucket_inbox_attachments,
        Key=object_key,
    )
    data = response["Body"].read()
    target_path.write_bytes(data)
    return target_path


def _extract_audio_from_video(video_path: Path, audio_path: Path) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-vn",
            "-acodec",
            "pcm_s16le",
            "-ac",
            "1",
            "-ar",
            "16000",
            str(audio_path),
        ],
        check=True,
        capture_output=True,
    )


def extract_attachment_text(storage_path: str, tipo: str) -> str:
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir) / Path(storage_path).name
        _download_attachment(storage_path, temp_path)

        if tipo in ("imagem", "image"):
            return extract_text_from_image(temp_path)
        if tipo in ("pdf", "document"):
            if temp_path.suffix.lower() == ".docx":
                return extract_text_from_docx(temp_path)
            if temp_path.suffix.lower() == ".pdf":
                return extract_text_from_pdf(temp_path)
            return extract_text_from_txt(temp_path)
        if tipo in ("audio", "voice"):
            return transcribe_audio(temp_path)
        if tipo in ("video",):
            audio_path = Path(temp_dir) / f"{temp_path.stem}.mp3"
            _extract_audio_from_video(temp_path, audio_path)
            return transcribe_audio(audio_path)
        return extract_text_from_txt(temp_path)


def extract_message_media_text(message_id: str) -> str:
    supabase = get_supabase_client()
    attachments = (
        supabase.table("attachments")
        .select("storage_path, tipo")
        .eq("message_id", message_id)
        .execute()
        .data
    )
    if not attachments:
        return ""

    texts = []
    for attachment in attachments:
        try:
            texts.append(extract_attachment_text(attachment["storage_path"], attachment.get("tipo") or ""))
        except Exception:
            continue

    return "\n".join([text for text in texts if text.strip()])


def extract_upload_text_bytes(
    data: bytes, filename: str | None, content_type: str | None
) -> str:
    with tempfile.TemporaryDirectory() as temp_dir:
        name = filename or "upload"
        temp_path = Path(temp_dir) / name
        temp_path.write_bytes(data)

        mime = content_type or mimetypes.guess_type(name)[0] or ""
        logger.info(
            "sandbox_upload_received name=%s mime=%s size=%s",
            name,
            mime or "unknown",
            len(data),
        )
        if mime.startswith("image/"):
            try:
                text = extract_text_from_image(temp_path)
                logger.info(
                    "sandbox_upload_image_extracted name=%s chars=%s",
                    name,
                    len(text),
                )
                return text
            except Exception:
                logger.exception("sandbox_upload_image_failed name=%s", name)
                return ""
        if mime.startswith("audio/") or mime.startswith("video/"):
            audio_path = temp_path
            if shutil.which("ffmpeg") and temp_path.suffix.lower() != ".wav":
                converted = Path(temp_dir) / f"{temp_path.stem}.wav"
                try:
                    _extract_audio_from_video(temp_path, converted)
                    audio_path = converted
                    logger.info(
                        "sandbox_upload_audio_converted name=%s path=%s",
                        name,
                        audio_path,
                    )
                except Exception:
                    logger.exception("sandbox_upload_audio_convert_failed name=%s", name)
                    audio_path = temp_path
            try:
                text = transcribe_audio(audio_path)
                logger.info(
                    "sandbox_upload_audio_transcribed name=%s chars=%s",
                    name,
                    len(text),
                )
                return text
            except Exception:
                logger.exception("sandbox_upload_audio_failed name=%s", name)
                return ""
        if mime == "application/pdf" or temp_path.suffix.lower() == ".pdf":
            try:
                text = extract_text_from_pdf(temp_path)
                logger.info(
                    "sandbox_upload_pdf_extracted name=%s chars=%s",
                    name,
                    len(text),
                )
                return text
            except Exception:
                logger.exception("sandbox_upload_pdf_failed name=%s", name)
                return ""
        if temp_path.suffix.lower() == ".docx":
            try:
                text = extract_text_from_docx(temp_path)
                logger.info(
                    "sandbox_upload_docx_extracted name=%s chars=%s",
                    name,
                    len(text),
                )
                return text
            except Exception:
                logger.exception("sandbox_upload_docx_failed name=%s", name)
                return ""
        try:
            text = extract_text_from_txt(temp_path)
            logger.info(
                "sandbox_upload_txt_extracted name=%s chars=%s",
                name,
                len(text),
            )
            return text
        except Exception:
            logger.exception("sandbox_upload_txt_failed name=%s", name)
            return ""
