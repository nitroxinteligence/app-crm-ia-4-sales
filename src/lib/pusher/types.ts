import type { AutorMensagem, StatusConversa, TipoMensagem } from "@/lib/types";

export type PusherMessagePayload = {
  event_id: string;
  workspace_id: string;
  conversation_id: string;
  message: {
    id: string;
    autor: AutorMensagem;
    tipo: TipoMensagem;
    conteudo: string | null;
    created_at: string;
    interno?: boolean | null;
    sender_id?: string | null;
    sender_nome?: string | null;
    sender_avatar_url?: string | null;
    quoted_message_id?: string | null;
    quoted_autor?: AutorMensagem | null;
    quoted_sender_id?: string | null;
    quoted_sender_nome?: string | null;
    quoted_tipo?: string | null;
    quoted_conteudo?: string | null;
  };
};

export type PusherAttachmentPayload = {
  event_id: string;
  workspace_id: string;
  conversation_id: string;
  message_id: string;
  attachment: {
    id: string;
    storage_path: string;
    tipo: string;
    tamanho_bytes?: number | null;
  };
};

export type PusherConversationUpdatedPayload = {
  event_id: string;
  workspace_id: string;
  conversation_id: string;
  status?: StatusConversa;
  owner_id?: string | null;
  ultima_mensagem?: string | null;
  ultima_mensagem_em?: string | null;
  tags?: string[];
};

export type PusherTagsUpdatedPayload = {
  event_id: string;
  workspace_id: string;
  conversation_id: string;
  tags: string[];
};
