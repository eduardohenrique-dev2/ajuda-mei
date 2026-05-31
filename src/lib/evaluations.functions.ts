import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const submitEvaluation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticket_id: string; nota: number; comentario?: string }) =>
    z.object({
      ticket_id: z.string().uuid(),
      nota: z.number().int().min(0).max(10),
      comentario: z.string().trim().max(1000).optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("avaliacoes").insert({
      ticket_id: data.ticket_id,
      mei_id: context.userId,
      nota: data.nota,
      comentario: data.comentario ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyEvaluation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticket_id: string }) => z.object({ ticket_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("avaliacoes")
      .select("id, nota, comentario, criado_em")
      .eq("ticket_id", data.ticket_id)
      .maybeSingle();
    return row;
  });
