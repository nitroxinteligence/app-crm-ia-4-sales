from pathlib import Path

import pdfplumber
import pytesseract
from docx import Document
from PIL import Image


def extract_text_from_image(path: Path) -> str:
    image = Image.open(path)
    return pytesseract.image_to_string(image)


def extract_text_from_pdf(path: Path) -> str:
    texts: list[str] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            if page_text.strip():
                texts.append(page_text)
                continue
            try:
                page_image = page.to_image(resolution=200)
                text_from_image = pytesseract.image_to_string(page_image.original)
                if text_from_image.strip():
                    texts.append(text_from_image)
            except Exception:
                continue
    return "\n".join(texts)


def extract_text_from_docx(path: Path) -> str:
    doc = Document(path)
    return "\n".join([p.text for p in doc.paragraphs if p.text])


def extract_text_from_txt(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")
