with events as (
  select replace(payload::text, '\\', '') as payload_text
  from webhook_events
),
chats as (
  select distinct
    (regexp_match(payload_text, '"wa_chatid"\s*:\s*"([^\"]+@g\\.us)"'))[1] as wa_chatid
  from events
),
values_normalized as (
  select
    wa_chatid,
    regexp_replace(wa_chatid, '\\D', '', 'g') as wa_digits
  from chats
  where wa_chatid is not null
)
update leads as l
set
  whatsapp_wa_id = v.wa_chatid,
  telefone = v.wa_chatid
from values_normalized as v
where (l.whatsapp_wa_id = v.wa_digits or l.telefone = v.wa_digits)
  and (l.whatsapp_wa_id not like '%@g.us' and l.telefone not like '%@g.us');
