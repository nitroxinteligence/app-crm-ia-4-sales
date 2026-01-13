from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    app_env: str = "development"
    port: int = 8001
    log_level: str = "info"

    supabase_url: str = Field(
        validation_alias=AliasChoices("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
    )
    supabase_service_role_key: str = Field(
        validation_alias=AliasChoices("SUPABASE_SERVICE_ROLE_KEY")
    )
    redis_url: str = Field(validation_alias=AliasChoices("REDIS_URL", "UPSTASH_REDIS_URL"))

    openai_api_key: str = Field(validation_alias=AliasChoices("OPENAI_API_KEY"))
    gemini_api_key: str = Field(validation_alias=AliasChoices("GEMINI_API_KEY"))
    agents_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("AGENTS_API_KEY"),
    )

    whatsapp_graph_url: str = "https://graph.facebook.com"
    whatsapp_api_version: str = "v19.0"
    baileys_api_url: str = Field(
        default="",
        validation_alias=AliasChoices("BAILEYS_API_URL"),
    )
    baileys_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("BAILEYS_API_KEY"),
    )
    uazapi_base_url: str = Field(
        default="https://free.uazapi.com",
        validation_alias=AliasChoices("UAZAPI_BASE_URL"),
    )
    uazapi_base_urls: str | None = Field(
        default=None,
        validation_alias=AliasChoices("UAZAPI_BASE_URLS"),
    )

    google_client_id: str | None = None
    google_client_secret: str | None = None

    @field_validator("redis_url", mode="before")
    @classmethod
    def ensure_redis_ssl_options(cls, value: str) -> str:
        if not isinstance(value, str):
            return value
        parsed = urlparse(value)
        if parsed.scheme != "rediss":
            return value
        params = dict(parse_qsl(parsed.query))
        if "ssl_cert_reqs" not in params:
            params["ssl_cert_reqs"] = "required"
        else:
            normalized = params["ssl_cert_reqs"].strip().lower()
            if normalized in {"cert_required", "required"}:
                params["ssl_cert_reqs"] = "required"
            elif normalized in {"cert_optional", "optional"}:
                params["ssl_cert_reqs"] = "optional"
            elif normalized in {"cert_none", "none"}:
                params["ssl_cert_reqs"] = "none"
        parsed = parsed._replace(query=urlencode(params))
        return urlunparse(parsed)

    model_config = SettingsConfigDict(
        env_file=(ROOT_ENV, ".env"),
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
