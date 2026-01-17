import logging
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"
APPS_ENV = Path(__file__).resolve().parents[3] / "apps" / ".env"
AGENTS_ENV = Path(__file__).resolve().parents[1] / ".env"


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

    pusher_app_id: str = Field(validation_alias=AliasChoices("PUSHER_APP_ID"))
    pusher_key: str = Field(validation_alias=AliasChoices("PUSHER_KEY"))
    pusher_secret: str = Field(validation_alias=AliasChoices("PUSHER_SECRET"))
    pusher_cluster: str = Field(validation_alias=AliasChoices("PUSHER_CLUSTER"))

    r2_account_id: str = Field(validation_alias=AliasChoices("R2_ACCOUNT_ID"))
    r2_access_key_id: str = Field(validation_alias=AliasChoices("R2_ACCESS_KEY_ID"))
    r2_secret_access_key: str = Field(
        validation_alias=AliasChoices("R2_SECRET_ACCESS_KEY")
    )
    r2_endpoint: str | None = Field(
        default=None, validation_alias=AliasChoices("R2_ENDPOINT")
    )
    r2_bucket_inbox_attachments: str = Field(
        default="ia-four-sales-crm",
        validation_alias=AliasChoices("R2_BUCKET_INBOX_ATTACHMENTS"),
    )
    r2_bucket_agent_knowledge: str = Field(
        default="ia-four-sales-crm",
        validation_alias=AliasChoices("R2_BUCKET_AGENT_KNOWLEDGE"),
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
        env_file=(AGENTS_ENV, APPS_ENV, ROOT_ENV, ".env"),
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()


def _ensure_non_empty(value: str | None, key: str, errors: list[str]) -> None:
    if value is None or (isinstance(value, str) and not value.strip()):
        errors.append(key)


def validate_settings(cfg: Settings, logger: logging.Logger | None = None) -> None:
    errors: list[str] = []
    _ensure_non_empty(cfg.supabase_url, "SUPABASE_URL", errors)
    _ensure_non_empty(cfg.supabase_service_role_key, "SUPABASE_SERVICE_ROLE_KEY", errors)
    _ensure_non_empty(cfg.redis_url, "REDIS_URL", errors)
    _ensure_non_empty(cfg.pusher_app_id, "PUSHER_APP_ID", errors)
    _ensure_non_empty(cfg.pusher_key, "PUSHER_KEY", errors)
    _ensure_non_empty(cfg.pusher_secret, "PUSHER_SECRET", errors)
    _ensure_non_empty(cfg.pusher_cluster, "PUSHER_CLUSTER", errors)
    _ensure_non_empty(cfg.r2_account_id, "R2_ACCOUNT_ID", errors)
    _ensure_non_empty(cfg.r2_access_key_id, "R2_ACCESS_KEY_ID", errors)
    _ensure_non_empty(cfg.r2_secret_access_key, "R2_SECRET_ACCESS_KEY", errors)
    _ensure_non_empty(cfg.r2_bucket_inbox_attachments, "R2_BUCKET_INBOX_ATTACHMENTS", errors)
    _ensure_non_empty(cfg.r2_bucket_agent_knowledge, "R2_BUCKET_AGENT_KNOWLEDGE", errors)

    if errors:
        raise ValueError(f"Missing env vars: {', '.join(errors)}")

    warn = logger.warning if logger else logging.getLogger(__name__).warning
    if not cfg.agents_api_key:
        warn("AGENTS_API_KEY not configured. Internal auth is disabled.")
    if not cfg.baileys_api_url:
        warn("BAILEYS_API_URL not configured. Baileys features are disabled.")
