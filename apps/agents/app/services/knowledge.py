import tempfile
from pathlib import Path
import hashlib
import json

import tiktoken
from langdetect import detect

from app.clients.supabase import get_supabase_client
from app.clients.redis_client import get_redis_client
from app.services.embeddings import (
    embed_query_gemini,
    embed_query_openai,
    embed_texts_gemini,
    embed_texts_openai,
)
from app.services.llm import get_last_fallback_llm, get_primary_llm, get_secondary_llm
from app.services.ocr import (
    extract_text_from_docx,
    extract_text_from_image,
    extract_text_from_pdf,
    extract_text_from_txt,
)
from app.services.workspaces import is_workspace_not_expired


def chunk_text(text: str, chunk_size: int = 1200, overlap: int = 200) -> list[str]:
    if not text:
        return []
    chunks: list[str] = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + chunk_size, length)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap
        if start < 0:
            start = 0
    return chunks


def _token_count(text: str) -> int:
    encoder = tiktoken.get_encoding("cl100k_base")
    return len(encoder.encode(text))


def _qa_transform(text: str) -> str:
    prompt = (
        "Transforme o conteudo abaixo em pares de perguntas e respostas. "
        "Responda em texto simples, usando o formato 'Q:' e 'A:' em cada par. "
        "Mantenha o idioma original do conteudo.\n\n"
        f"Conteudo:\n{text}"
    )
    for llm in (get_primary_llm(), get_secondary_llm(), get_last_fallback_llm()):
        try:
            response = llm.invoke(prompt)
            return response.content if hasattr(response, "content") else str(response)
        except Exception:
            continue
    return text


def _extract_text(path: Path, mime_type: str | None) -> str:
    suffix = path.suffix.lower()
    if mime_type and mime_type.startswith("image/"):
        return extract_text_from_image(path)
    if suffix == ".pdf":
        return extract_text_from_pdf(path)
    if suffix == ".docx":
        return extract_text_from_docx(path)
    if suffix == ".txt":
        return extract_text_from_txt(path)
    return extract_text_from_txt(path)


def process_knowledge_file(file_id: str) -> dict:
    supabase = get_supabase_client()
    file_row = (
        supabase.table("agent_knowledge_files")
        .select("id, agent_id, workspace_id, storage_path, mime_type")
        .eq("id", file_id)
        .single()
        .execute()
        .data
    )
    if not file_row:
        raise ValueError("Knowledge file not found")

    if not is_workspace_not_expired(file_row.get("workspace_id")):
        supabase.table("agent_knowledge_files").update({"status": "erro"}).eq(
            "id", file_id
        ).execute()
        return {"file_id": file_id, "status": "blocked"}

    supabase.table("agent_knowledge_files").update({"status": "processando"}).eq("id", file_id).execute()

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            local_path = Path(temp_dir) / Path(file_row["storage_path"]).name
            storage = supabase.storage.from_("agent-knowledge")
            data = storage.download(file_row["storage_path"])
            local_path.write_bytes(data)

            raw_text = _extract_text(local_path, file_row.get("mime_type"))

        if not raw_text.strip():
            raise ValueError("No text extracted from file")

        chunks = chunk_text(raw_text)
        qa_chunks = [_qa_transform(chunk) for chunk in chunks]

        embeddings_openai = embed_texts_openai(qa_chunks)
        try:
            embeddings_gemini = embed_texts_gemini(qa_chunks)
        except Exception:
            embeddings_gemini = [None for _ in qa_chunks]

        payloads = []
        for idx, chunk in enumerate(qa_chunks):
            language = None
            if chunk.strip():
                try:
                    language = detect(chunk)
                except Exception:
                    language = None
            payloads.append(
                {
                    "agent_id": file_row["agent_id"],
                    "file_id": file_id,
                    "content": chunk,
                    "tokens": _token_count(chunk),
                    "embedding_openai": embeddings_openai[idx],
                    "embedding_gemini": embeddings_gemini[idx],
                    "metadata": {
                        "language": language,
                    },
                }
            )

        if payloads:
            supabase.table("agent_knowledge_chunks").insert(payloads).execute()

        supabase.table("agent_knowledge_files").update({"status": "pronto"}).eq("id", file_id).execute()
        return {"file_id": file_id, "chunks": len(payloads)}
    except Exception:
        supabase.table("agent_knowledge_files").update({"status": "erro"}).eq("id", file_id).execute()
        raise


def ingest_conversation_text(
    agent_id: str,
    conversation_id: str,
    message_id: str,
    text: str,
    source: str = "attachment",
    metadata: dict | None = None,
) -> dict | None:
    if not text.strip():
        return None

    supabase = get_supabase_client()
    existing = (
        supabase.table("agent_conversation_chunks")
        .select("id")
        .eq("agent_id", agent_id)
        .eq("message_id", message_id)
        .limit(1)
        .execute()
        .data
    )
    if existing:
        return None
    chunks = chunk_text(text)
    qa_chunks = [_qa_transform(chunk) for chunk in chunks]
    if not qa_chunks:
        return None

    embeddings_openai = embed_texts_openai(qa_chunks)
    try:
        embeddings_gemini = embed_texts_gemini(qa_chunks)
    except Exception:
        embeddings_gemini = [None for _ in qa_chunks]

    payloads = []
    base_metadata = {"source": source}
    if metadata:
        base_metadata.update(metadata)
    for idx, chunk in enumerate(qa_chunks):
        payloads.append(
            {
                "agent_id": agent_id,
                "conversation_id": conversation_id,
                "message_id": message_id,
                "content": chunk,
                "tokens": _token_count(chunk),
                "embedding_openai": embeddings_openai[idx],
                "embedding_gemini": embeddings_gemini[idx],
                "metadata": base_metadata,
            }
        )

    if payloads:
        supabase.table("agent_conversation_chunks").insert(payloads).execute()

    return {"chunks": len(payloads)}


def _retrieve_conversation_chunks(
    agent_id: str,
    conversation_id: str,
    query: str,
    match_count: int,
) -> list[dict]:
    supabase = get_supabase_client()
    try:
        embedding = embed_query_openai(query)
        response = supabase.rpc(
            "match_agent_conversation_openai",
            {
                "p_agent_id": agent_id,
                "p_conversation_id": conversation_id,
                "p_embedding": embedding,
                "p_match_count": match_count,
            },
        ).execute()

        data = response.data or []
        if data:
            return data

        try:
            embedding_gemini = embed_query_gemini(query)
        except Exception:
            return []

        response = supabase.rpc(
            "match_agent_conversation_gemini",
            {
                "p_agent_id": agent_id,
                "p_conversation_id": conversation_id,
                "p_embedding": embedding_gemini,
                "p_match_count": match_count,
            },
        ).execute()
        return response.data or []
    except Exception:
        return []


def retrieve_knowledge(
    agent_id: str,
    query: str,
    conversation_id: str | None = None,
    match_count: int = 6,
) -> list[dict]:
    supabase = get_supabase_client()
    redis = get_redis_client()
    cache_key = (
        f"agent:{agent_id}:rag:{conversation_id or 'global'}:"
        f"{hashlib.sha256(query.encode('utf-8')).hexdigest()}"
    )
    cached = redis.get(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            pass

    results: list[dict] = []
    conversation_matches = []
    if conversation_id:
        conversation_matches = _retrieve_conversation_chunks(
            agent_id, conversation_id, query, max(2, match_count // 2)
        )
        results.extend(conversation_matches)

    embedding = embed_query_openai(query)
    response = supabase.rpc(
        "match_agent_knowledge_openai",
        {"p_agent_id": agent_id, "p_embedding": embedding, "p_match_count": match_count},
    ).execute()

    data = response.data or []
    if data:
        results.extend(data)
        redis.setex(cache_key, 600, json.dumps(results[:match_count]))
        return results[:match_count]

    try:
        embedding_gemini = embed_query_gemini(query)
    except Exception:
        return results

    response = supabase.rpc(
        "match_agent_knowledge_gemini",
        {"p_agent_id": agent_id, "p_embedding": embedding_gemini, "p_match_count": match_count},
    ).execute()
    data = response.data or []
    if data:
        results.extend(data)
        redis.setex(cache_key, 600, json.dumps(results[:match_count]))
    elif results:
        redis.setex(cache_key, 600, json.dumps(results[:match_count]))
    return results[:match_count]
