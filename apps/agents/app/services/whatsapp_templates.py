from typing import Any

import httpx

from app.clients.supabase import get_supabase_client
from app.config import settings
from app.services.workspaces import is_workspace_not_expired


def _list_templates(access_token: str, waba_id: str) -> list[dict]:
    url = f"{settings.whatsapp_graph_url}/{settings.whatsapp_api_version}/{waba_id}/message_templates"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {
        "fields": "name,category,language,status",
    }

    templates: list[dict] = []
    next_url: str | None = url
    next_params: dict[str, Any] | None = params

    with httpx.Client(timeout=20) as client:
        while next_url:
            response = client.get(next_url, headers=headers, params=next_params)
            response.raise_for_status()
            data = response.json() or {}
            items = data.get("data") or []
            for item in items:
                templates.append(
                    {
                        "nome": item.get("name"),
                        "categoria": item.get("category"),
                        "idioma": item.get("language"),
                        "status": item.get("status"),
                    }
                )
            paging = data.get("paging") or {}
            next_url = paging.get("next")
            next_params = None

    return [tpl for tpl in templates if tpl.get("nome") and tpl.get("idioma")]


def sync_whatsapp_templates(workspace_id: str, integration_account_id: str | None = None) -> dict:
    supabase = get_supabase_client()
    if not is_workspace_not_expired(workspace_id):
        return {"status": "blocked", "templates": 0}

    accounts_query = (
        supabase.table("integration_accounts")
        .select("id, integration_id, waba_id, business_account_id, provider, integrations!inner(workspace_id, canal)")
        .eq("integrations.canal", "whatsapp")
        .eq("integrations.workspace_id", workspace_id)
    )
    if integration_account_id:
        accounts_query = accounts_query.eq("id", integration_account_id)

    accounts = accounts_query.execute().data or []
    if not accounts:
        return {"status": "no_accounts", "templates": 0}

    templates_by_key: dict[str, dict] = {}

    for account in accounts:
        integration_id = account.get("integration_id")
        provider = account.get("provider") or "whatsapp_oficial"
        if provider != "whatsapp_oficial":
            continue
        waba_id = account.get("waba_id") or account.get("business_account_id")
        if not integration_id or not waba_id:
            continue

        token_response = (
            supabase.table("integration_tokens")
            .select("access_token")
            .eq("integration_account_id", account.get("id"))
            .limit(1)
            .execute()
        )
        tokens = token_response.data or []
        access_token = tokens[0].get("access_token") if tokens else None
        if not access_token:
            token_response = (
                supabase.table("integration_tokens")
                .select("access_token")
                .eq("integration_id", integration_id)
                .limit(1)
                .execute()
            )
            tokens = token_response.data or []
            access_token = tokens[0].get("access_token") if tokens else None
        if not access_token:
            continue

        templates = _list_templates(access_token, waba_id)
        for template in templates:
            key = f"{template.get('nome')}::{template.get('idioma')}"
            templates_by_key[key] = template

    templates_payload = [
        {
            "workspace_id": workspace_id,
            "nome": template.get("nome"),
            "categoria": template.get("categoria") or "",
            "idioma": template.get("idioma") or "",
            "status": template.get("status") or "",
        }
        for template in templates_by_key.values()
    ]

    supabase.table("whatsapp_templates").delete().eq("workspace_id", workspace_id).execute()
    if templates_payload:
        supabase.table("whatsapp_templates").insert(templates_payload).execute()

    return {"status": "ok", "templates": len(templates_payload)}
