-- Restrict canal_id values to WhatsApp + Instagram (without dropping enum)

do $$
begin
  if exists (select 1 from pg_type where typname = 'canal_id') then
    if to_regclass('public.leads') is not null then
      update public.leads
        set canal_origem = 'whatsapp'
        where canal_origem in ('messenger', 'email', 'linkedin');
    end if;

    if to_regclass('public.conversations') is not null then
      update public.conversations
        set canal = 'whatsapp'
        where canal in ('messenger', 'email', 'linkedin');
    end if;

    if to_regclass('public.integrations') is not null then
      update public.integrations
        set canal = 'whatsapp'
        where canal in ('messenger', 'email', 'linkedin');
    end if;

    if to_regclass('public.events') is not null then
      update public.events
        set canal = 'whatsapp'
        where canal in ('messenger', 'email', 'linkedin');
    end if;

    alter table public.leads drop constraint if exists leads_canal_origem_check;
    alter table public.leads
      add constraint leads_canal_origem_check
      check (canal_origem in ('whatsapp', 'instagram'));

    alter table public.conversations drop constraint if exists conversations_canal_check;
    alter table public.conversations
      add constraint conversations_canal_check
      check (canal in ('whatsapp', 'instagram'));

    alter table public.integrations drop constraint if exists integrations_canal_check;
    alter table public.integrations
      add constraint integrations_canal_check
      check (canal in ('whatsapp', 'instagram'));

    if to_regclass('public.events') is not null then
      alter table public.events drop constraint if exists events_canal_check;
      alter table public.events
        add constraint events_canal_check
        check (canal is null or canal in ('whatsapp', 'instagram'));
    end if;
  end if;
end $$;
