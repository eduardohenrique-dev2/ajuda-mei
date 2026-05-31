import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EVENT_NAMES = z.enum([
  "page_view",
  "search",
  "chat_message",
  "link_click",
  "solution_opened",
  "sector_opened",
  "ticket_created",
  "protocol_created",
  "document_upload",
  "resolved",
  "abandoned",
  "signup",
  "login",
]);

const trackInput = z.object({
  event_name: EVENT_NAMES,
  session_id: z.string().trim().min(1).max(80).optional(),
  url: z.string().trim().max(500).optional(),
  user_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Aceita eventos anônimos OU autenticados. Sem middleware para não bloquear
// chamadas públicas — usa supabaseAdmin com payload validado por Zod.
export const trackEvent = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof trackInput>) => trackInput.parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("analytics_events").insert({
      event_name: data.event_name,
      user_id: data.user_id ?? null,
      session_id: data.session_id ?? null,
      url: data.url ?? null,
      metadata: data.metadata ?? {},
    });
    if (error) {
      // Falhas de analytics nunca devem quebrar a UX.
      console.error("[trackEvent] falha:", error.message);
      return { ok: false };
    }
    return { ok: true };
  });

export const getEventStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number } | undefined) =>
    z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    const { data: stats, error } = await context.supabase.rpc("get_event_stats", { _days: data.days });
    if (error) throw new Error(error.message);
    return stats as {
      total: number;
      por_evento: Record<string, number>;
      usuarios_unicos: number;
      sessoes_unicas: number;
    };
  });
