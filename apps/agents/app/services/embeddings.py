from langchain_openai import OpenAIEmbeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.config import settings

_openai: OpenAIEmbeddings | None = None
_gemini: GoogleGenerativeAIEmbeddings | None = None


def get_openai_embeddings() -> OpenAIEmbeddings:
    global _openai
    if _openai is None:
        _openai = OpenAIEmbeddings(api_key=settings.openai_api_key)
    return _openai


def get_gemini_embeddings() -> GoogleGenerativeAIEmbeddings:
    global _gemini
    if _gemini is None:
        _gemini = GoogleGenerativeAIEmbeddings(google_api_key=settings.gemini_api_key)
    return _gemini


def embed_texts_openai(texts: list[str]) -> list[list[float]]:
    return get_openai_embeddings().embed_documents(texts)


def embed_query_openai(text: str) -> list[float]:
    return get_openai_embeddings().embed_query(text)


def embed_texts_gemini(texts: list[str]) -> list[list[float]]:
    return get_gemini_embeddings().embed_documents(texts)


def embed_query_gemini(text: str) -> list[float]:
    return get_gemini_embeddings().embed_query(text)
