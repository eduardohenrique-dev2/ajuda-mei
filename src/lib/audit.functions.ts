import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const logAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { acao: string; recurso: string; recurso_id?: string; detalhes?: Record<string, unknown> }) =>
    z.object({
      acao: z.string().min(1).max(80),
      recurso: z.string().min(1).max(80),
      recurso_id: z.string().uuid().optional(),
      detalhes: z.record(z.string(), z.any()).optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await context.supabase.from("audit_log").insert({
      actor_id: context.userId,
      acao: data.acao,
      recurso: data.recurso,
      recurso_id: data.recurso_id ?? null,
      detalhes: data.detalhes ?? {},
    });
    return { ok: true };
  });

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number; recurso?: string }) =>
    z.object({
      limit: z.number().int().min(1).max(500).default(100),
      recurso: z.string().max(80).optional(),
    }).parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("audit_log")
      .select("id, actor_id, acao, recurso, recurso_id, detalhes, criado_em")
      .order("criado_em", { ascending: false })
      .limit(data.limit);
    if (data.recurso) q = q.eq("recurso", data.recurso);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
