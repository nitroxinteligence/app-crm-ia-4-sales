from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings


def build_openai(model: str, temperature: float = 0.2):
    return ChatOpenAI(
        api_key=settings.openai_api_key,
        model=model,
        temperature=temperature,
    )


def build_gemini(model: str, temperature: float = 0.2):
    return ChatGoogleGenerativeAI(
        google_api_key=settings.gemini_api_key,
        model=model,
        temperature=temperature,
    )


def get_primary_llm():
    return build_openai("gpt-4.1-mini")


def get_secondary_llm():
    if not settings.gemini_api_key:
        return None
    return build_gemini("gemini-2.5-flash")


def get_last_fallback_llm():
    return build_openai("gpt-4o-mini")
