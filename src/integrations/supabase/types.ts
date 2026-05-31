export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          acao: string
          actor_id: string | null
          criado_em: string
          detalhes: Json
          id: string
          recurso: string
          recurso_id: string | null
        }
        Insert: {
          acao: string
          actor_id?: string | null
          criado_em?: string
          detalhes?: Json
          id?: string
          recurso: string
          recurso_id?: string | null
        }
        Update: {
          acao?: string
          actor_id?: string | null
          criado_em?: string
          detalhes?: Json
          id?: string
          recurso?: string
          recurso_id?: string | null
        }
        Relationships: []
      }
      avaliacoes: {
        Row: {
          comentario: string | null
          criado_em: string
          id: string
          mei_id: string
          nota: number
          ticket_id: string
        }
        Insert: {
          comentario?: string | null
          criado_em?: string
          id?: string
          mei_id: string
          nota: number
          ticket_id: string
        }
        Update: {
          comentario?: string | null
          criado_em?: string
          id?: string
          mei_id?: string
          nota?: number
          ticket_id?: string
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          canal: Database["public"]["Enums"]["ticket_channel"]
          criado_em: string
          id: string
          intent_detectado: string | null
          mei_id: string | null
          mensagem: string
          papel: string
          sessao_id: string
          ticket_id: string | null
        }
        Insert: {
          canal?: Database["public"]["Enums"]["ticket_channel"]
          criado_em?: string
          id?: string
          intent_detectado?: string | null
          mei_id?: string | null
          mensagem: string
          papel: string
          sessao_id: string
          ticket_id?: string | null
        }
        Update: {
          canal?: Database["public"]["Enums"]["ticket_channel"]
          criado_em?: string
          id?: string
          intent_detectado?: string | null
          mei_id?: string | null
          mensagem?: string
          papel?: string
          sessao_id?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          atualizado_em: string
          cnpj: string | null
          criado_em: string
          email: string | null
          id: string
          nome: string
          status: Database["public"]["Enums"]["mei_status"]
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string
          cnpj?: string | null
          criado_em?: string
          email?: string | null
          id: string
          nome: string
          status?: Database["public"]["Enums"]["mei_status"]
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string
          cnpj?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["mei_status"]
          telefone?: string | null
        }
        Relationships: []
      }
      sectors: {
        Row: {
          ativo: boolean
          categoria: string
          criado_em: string
          descricao: string | null
          email: string | null
          endereco: string | null
          horario: string | null
          id: string
          nome: string
          palavras_chave: string[]
          site: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          categoria: string
          criado_em?: string
          descricao?: string | null
          email?: string | null
          endereco?: string | null
          horario?: string | null
          id?: string
          nome: string
          palavras_chave?: string[]
          site?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string
          criado_em?: string
          descricao?: string | null
          email?: string | null
          endereco?: string | null
          horario?: string | null
          id?: string
          nome?: string
          palavras_chave?: string[]
          site?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      solutions: {
        Row: {
          ativo: boolean
          atualizado_em: string
          categoria: Database["public"]["Enums"]["solution_category"]
          criado_em: string
          criado_por: string | null
          descricao: string
          embedding: string | null
          id: string
          link_oficial: string | null
          palavras_chave: string[]
          passo_a_passo: Json
          setor_id: string | null
          tags: string[]
          titulo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          categoria: Database["public"]["Enums"]["solution_category"]
          criado_em?: string
          criado_por?: string | null
          descricao: string
          embedding?: string | null
          id?: string
          link_oficial?: string | null
          palavras_chave?: string[]
          passo_a_passo?: Json
          setor_id?: string | null
          tags?: string[]
          titulo: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: Database["public"]["Enums"]["solution_category"]
          criado_em?: string
          criado_por?: string | null
          descricao?: string
          embedding?: string | null
          id?: string
          link_oficial?: string | null
          palavras_chave?: string[]
          passo_a_passo?: Json
          setor_id?: string | null
          tags?: string[]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "solutions_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          anexos: Json
          autor_id: string
          criado_em: string
          id: string
          interna: boolean
          mensagem: string
          papel: string
          ticket_id: string
        }
        Insert: {
          anexos?: Json
          autor_id: string
          criado_em?: string
          id?: string
          interna?: boolean
          mensagem: string
          papel: string
          ticket_id: string
        }
        Update: {
          anexos?: Json
          autor_id?: string
          criado_em?: string
          id?: string
          interna?: boolean
          mensagem?: string
          papel?: string
          ticket_id?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          atendente_id: string | null
          atualizado_em: string
          canal: Database["public"]["Enums"]["ticket_channel"]
          categoria: Database["public"]["Enums"]["solution_category"]
          criado_em: string
          descricao: string
          encerrado_em: string | null
          id: string
          mei_id: string
          prioridade: Database["public"]["Enums"]["ticket_priority"]
          protocolo: string
          setor_id: string | null
          solucao_sugerida_id: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          titulo: string
        }
        Insert: {
          atendente_id?: string | null
          atualizado_em?: string
          canal?: Database["public"]["Enums"]["ticket_channel"]
          categoria?: Database["public"]["Enums"]["solution_category"]
          criado_em?: string
          descricao: string
          encerrado_em?: string | null
          id?: string
          mei_id: string
          prioridade?: Database["public"]["Enums"]["ticket_priority"]
          protocolo?: string
          setor_id?: string | null
          solucao_sugerida_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          titulo: string
        }
        Update: {
          atendente_id?: string | null
          atualizado_em?: string
          canal?: Database["public"]["Enums"]["ticket_channel"]
          categoria?: Database["public"]["Enums"]["solution_category"]
          criado_em?: string
          descricao?: string
          encerrado_em?: string | null
          id?: string
          mei_id?: string
          prioridade?: Database["public"]["Enums"]["ticket_priority"]
          protocolo?: string
          setor_id?: string | null
          solucao_sugerida_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_solucao_sugerida_id_fkey"
            columns: ["solucao_sugerida_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      escalate_stale_tickets: { Args: never; Returns: Json }
      generate_protocolo: { Args: never; Returns: string }
      get_analytics: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      match_solutions: {
        Args: {
          match_count?: number
          min_similarity?: number
          query_embedding: string
        }
        Returns: {
          categoria: Database["public"]["Enums"]["solution_category"]
          descricao: string
          id: string
          link_oficial: string
          passo_a_passo: Json
          similarity: number
          titulo: string
        }[]
      }
    }
    Enums: {
      app_role: "mei" | "atendente" | "gestor" | "admin"
      mei_status: "pendente_validacao" | "verificado"
      solution_category:
        | "declaracao_anual"
        | "das"
        | "parcelamento"
        | "regularizacao"
        | "funcionarios"
        | "notas_fiscais"
        | "cadastro"
        | "pendencias"
        | "outros_setores"
        | "outros"
      ticket_channel: "web" | "whatsapp" | "presencial"
      ticket_priority: "baixa" | "normal" | "alta" | "urgente"
      ticket_status:
        | "novo"
        | "em_analise"
        | "aguardando_mei"
        | "resolvido"
        | "encerrado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["mei", "atendente", "gestor", "admin"],
      mei_status: ["pendente_validacao", "verificado"],
      solution_category: [
        "declaracao_anual",
        "das",
        "parcelamento",
        "regularizacao",
        "funcionarios",
        "notas_fiscais",
        "cadastro",
        "pendencias",
        "outros_setores",
        "outros",
      ],
      ticket_channel: ["web", "whatsapp", "presencial"],
      ticket_priority: ["baixa", "normal", "alta", "urgente"],
      ticket_status: [
        "novo",
        "em_analise",
        "aguardando_mei",
        "resolvido",
        "encerrado",
      ],
    },
  },
} as const
