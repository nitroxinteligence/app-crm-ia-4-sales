with events as (
  select
    case
      when jsonb_typeof(payload) = 'string' then (payload #>> '{}')::jsonb
      else payload
    end as payload_doc
  from webhook_events
),
chats as (
  select distinct
    coalesce(
      payload_doc->'chat'->>'wa_chatid',
      payload_doc->'payload'->'chat'->>'wa_chatid',
      payload_doc->0->'chat'->>'wa_chatid',
      payload_doc->0->'payload'->'chat'->>'wa_chatid'
    ) as wa_chatid,
    coalesce(
      payload_doc->'chat'->>'name',
      payload_doc->'payload'->'chat'->>'name',
      payload_doc->0->'chat'->>'name',
      payload_doc->0->'payload'->'chat'->>'name'
    ) as chat_name,
    coalesce(
      payload_doc->'chat'->>'imagePreview',
      payload_doc->'payload'->'chat'->>'imagePreview',
      payload_doc->0->'chat'->>'imagePreview',
      payload_doc->0->'payload'->'chat'->>'imagePreview',
      payload_doc->'chat'->>'image',
      payload_doc->'payload'->'chat'->>'image',
      payload_doc->0->'chat'->>'image',
      payload_doc->0->'payload'->'chat'->>'image'
    ) as chat_avatar
  from events
),
values_normalized as (
  select
    wa_chatid,
    regexp_replace(wa_chatid, '\\D', '', 'g') as wa_digits,
    nullif(chat_name, '') as chat_name,
    nullif(chat_avatar, '') as chat_avatar
  from chats
  where wa_chatid like '%@g.us'
)
update leads as l
set
  whatsapp_wa_id = v.wa_chatid,
  telefone = v.wa_chatid,
  avatar_url = coalesce(l.avatar_url, v.chat_avatar),
  nome = coalesce(nullif(l.nome, ''), v.chat_name)
from values_normalized as v
where l.whatsapp_wa_id = v.wa_digits
   or l.telefone = v.wa_digits;
