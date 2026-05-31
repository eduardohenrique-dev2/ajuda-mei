import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STATUSES = z.enum(["novo", "em_analise", "aguardando_mei", "resolvido", "encerrado"]);
const PRIORIDADES = z.enum(["baixa", "normal", "alta", "urgente"]);

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const ok = (data ?? []).some((r: any) => ["atendente", "gestor", "admin"].includes(r.role));
  if (!ok) throw new Error("Acesso restrito a atendentes.");
}

export const listAllTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string; q?: string }) =>
    z.object({
      status: z.string().optional(),
      q: z.string().trim().max(120).optional(),
    }).parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    let query = context.supabase
      .from("tickets")
      .select("id, protocolo, titulo, descricao, categoria, status, prioridade, canal, mei_id, atendente_id, criado_em, atualizado_em")
      .order("criado_em", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "todos") query = query.eq("status", data.status as any);
    if (data.q) query = query.or(`titulo.ilike.%${data.q}%,protocolo.ilike.%${data.q}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getTicketDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: ticket, error } = await context.supabase
      .from("tickets")
      .select("id, protocolo, titulo, descricao, categoria, status, prioridade, canal, mei_id, atendente_id, criado_em, atualizado_em")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const { data: messages } = await context.supabase
      .from("ticket_messages")
      .select("id, autor_id, papel, mensagem, interna, anexos, criado_em")
      .eq("ticket_id", data.id)
      .order("criado_em", { ascending: true });

    let mei: { nome: string; email: string | null; cnpj: string | null } | null = null;
    if (ticket.mei_id) {
      const { data: prof } = await context.supabase
        .from("profiles").select("nome, email, cnpj").eq("id", ticket.mei_id).maybeSingle();
      mei = prof ?? null;
    }
    return { ticket, messages: messages ?? [], mei };
  });

export const replyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticket_id: string; mensagem: string; interna?: boolean }) =>
    z.object({
      ticket_id: z.string().uuid(),
      mensagem: z.string().trim().min(1).max(5000),
      interna: z.boolean().default(false),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { error } = await context.supabase.from("ticket_messages").insert({
      ticket_id: data.ticket_id,
      autor_id: context.userId,
      papel: "atendente",
      mensagem: data.mensagem,
      interna: data.interna,
    });
    if (error) throw new Error(error.message);

    // Atualiza status para em_analise se ainda novo
    await context.supabase
      .from("tickets")
      .update({ status: "em_analise", atendente_id: context.userId, atualizado_em: new Date().toISOString() })
      .eq("id", data.ticket_id)
      .eq("status", "novo");
    return { ok: true };
  });

export const updateTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticket_id: string; status: string; prioridade?: string }) =>
    z.object({
      ticket_id: z.string().uuid(),
      status: STATUSES,
      prioridade: PRIORIDADES.optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const patch: Record<string, any> = {
      status: data.status,
      atendente_id: context.userId,
      atualizado_em: new Date().toISOString(),
    };
    if (data.prioridade) patch.prioridade = data.prioridade;
    if (["resolvido", "encerrado"].includes(data.status)) patch.encerrado_em = new Date().toISOString();
    const { error } = await context.supabase.from("tickets").update(patch as any).eq("id", data.ticket_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { data, error } = await context.supabase.rpc("get_analytics");
    if (error) throw new Error(error.message);
    return data as {
      total_30d: number;
      abertos: number;
      resolvidos_30d: number;
      novos_hoje: number;
      por_categoria: Record<string, number>;
      por_status: Record<string, number>;
      por_dia_14d: { dia: string; total: number }[];
      solucoes_ativas: number;
    };
  });

export const myRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const roles = (data ?? []).map(r => r.role);
    return {
      roles,
      isStaff: roles.some(r => ["atendente", "gestor", "admin"].includes(r)),
      isAdmin: roles.includes("admin"),
    };
  });
