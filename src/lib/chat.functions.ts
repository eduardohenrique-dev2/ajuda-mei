import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const loadChatHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessao_id: string }) =>
    z.object({ sessao_id: z.string().trim().min(4).max(80) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("chat_history")
      .select("id, papel, mensagem, criado_em")
      .eq("sessao_id", data.sessao_id)
      .eq("mei_id", context.userId)
      .order("criado_em", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows;
  });

const saveInput = z.object({
  sessao_id: z.string().trim().min(4).max(80),
  papel: z.enum(["mei", "bot", "atendente", "sistema"]),
  mensagem: z.string().trim().min(1).max(5000),
  intent: z.string().trim().max(80).optional(),
  ticket_id: z.string().uuid().optional(),
});

export const saveChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof saveInput>) => saveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("chat_history").insert({
      mei_id: context.userId,
      sessao_id: data.sessao_id,
      papel: data.papel,
      mensagem: data.mensagem,
      intent_detectado: data.intent ?? null,
      ticket_id: data.ticket_id ?? null,
      canal: "web",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
