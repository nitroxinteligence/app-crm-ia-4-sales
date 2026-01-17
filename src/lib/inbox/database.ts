import { createClient } from "@supabase/supabase-js"

export type Database = {
  public: {
    Tables: {
      messages: {
        Row: {
          id: string
          workspace_id: string
          conversation_id: string
          autor: "contato" | "equipe" | "agente"
          tipo: "texto" | "imagem" | "pdf" | "audio"
          conteudo: string | null
          interno: boolean
          whatsapp_message_id: string | null
          send_status: string | null
          send_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          workspace_id: string
          conversation_id: string
          autor?: "contato" | "equipe" | "agente"
          tipo?: "texto" | "imagem" | "pdf" | "audio"
          conteudo?: string | null
          interno?: boolean
          whatsapp_message_id?: string | null
          send_status?: string | null
          send_error?: string | null
        }
        Update: {
          autor?: "contato" | "equipe" | "agente"
          tipo?: "texto" | "imagem" | "pdf" | "audio"
          conteudo?: string | null
          interno?: boolean
          whatsapp_message_id?: string | null
          send_status?: string | null
          send_error?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          workspace_id: string
          canal: string
          lead_id: string | null
          integration_account_id: string | null
          status: string
          ultima_mensagem: string | null
          ultima_mensagem_em: string | null
        }
        Insert: {
          workspace_id: string
          canal: string
          lead_id?: string | null
          integration_account_id?: string | null
          status?: string
          ultima_mensagem?: string | null
          ultima_mensagem_em?: string | null
        }
        Update: {
          canal?: string
          lead_id?: string | null
          integration_account_id?: string | null
          status?: string
          ultima_mensagem?: string | null
          ultima_mensagem_em?: string | null
        }
        Relationships: []
      }
      attachments: {
        Row: {
          id: string
          workspace_id: string
          message_id: string
          storage_path: string
          tipo: string
          tamanho_bytes: number | null
        }
        Insert: {
          workspace_id: string
          message_id: string
          storage_path: string
          tipo: string
          tamanho_bytes?: number | null
        }
        Update: {
          storage_path?: string
          tipo?: string
          tamanho_bytes?: number | null
        }
        Relationships: []
      }
      workspace_members: {
        Row: { workspace_id: string; user_id: string; role: string }
        Insert: { workspace_id: string; user_id: string; role?: string }
        Update: { role?: string }
        Relationships: []
      }
      leads: {
        Row: { id: string; whatsapp_wa_id: string | null; telefone: string | null }
        Insert: { id?: string; whatsapp_wa_id?: string | null; telefone?: string | null }
        Update: { whatsapp_wa_id?: string | null; telefone?: string | null }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type UserClient = ReturnType<typeof createClient<Database>>
