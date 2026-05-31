import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CATEGORIAS = z.enum([
  "declaracao_anual","das","parcelamento","regularizacao",
  "funcionarios","notas_fiscais","cadastro","pendencias",
  "outros_setores","outros",
]);

const anexoSchema = z.object({
  path: z.string().min(3).max(500),
  name: z.string().min(1).max(200),
  size: z.number().nonnegative(),
  mime: z.string().max(120).optional(),
});
export type Anexo = z.infer<typeof anexoSchema>;

export const listMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tickets")
      .select("id, protocolo, titulo, descricao, categoria, status, canal, prioridade, criado_em, atualizado_em")
      .order("criado_em", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data;
  });

const createTicketInput = z.object({
  titulo: z.string().trim().min(1).max(200),
  descricao: z.string().trim().min(1).max(5000),
  categoria: CATEGORIAS.default("outros"),
  canal: z.enum(["web","whatsapp","presencial"]).default("web"),
});

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof createTicketInput>) => createTicketInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("tickets")
      .insert({
        mei_id: context.userId,
        titulo: data.titulo,
        descricao: data.descricao,
        categoria: data.categoria,
        canal: data.canal,
      })
      .select("id, protocolo")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const getMyTicketDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: ticket, error } = await context.supabase
      .from("tickets")
      .select("id, protocolo, titulo, descricao, categoria, status, prioridade, canal, criado_em, atualizado_em, encerrado_em")
      .eq("id", data.id)
      .eq("mei_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ticket) throw new Error("Ticket não encontrado");
    const { data: messages } = await context.supabase
      .from("ticket_messages")
      .select("id, autor_id, papel, mensagem, interna, anexos, criado_em")
      .eq("ticket_id", data.id)
      .eq("interna", false)
      .order("criado_em", { ascending: true });
    return { ticket, messages: messages ?? [] };
  });

const replyInput = z.object({
  ticket_id: z.string().uuid(),
  mensagem: z.string().trim().min(1).max(5000),
  anexos: z.array(anexoSchema).max(10).default([]),
});

export const replyMyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof replyInput>) => replyInput.parse(d))
  .handler(async ({ data, context }) => {
    // RLS confirma propriedade
    const { error } = await context.supabase.from("ticket_messages").insert({
      ticket_id: data.ticket_id,
      autor_id: context.userId,
      papel: "mei",
      mensagem: data.mensagem,
      interna: false,
      anexos: data.anexos,
    });
    if (error) throw new Error(error.message);
    // Se estava aguardando_mei, volta para em_analise
    await context.supabase
      .from("tickets")
      .update({ status: "em_analise", atualizado_em: new Date().toISOString() })
      .eq("id", data.ticket_id)
      .eq("status", "aguardando_mei");
    return { ok: true };
  });

export const getTicketByProtocolo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { protocolo: string }) =>
    z.object({ protocolo: z.string().trim().min(3).max(30) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("tickets")
      .select("id, protocolo, titulo, descricao, categoria, status, canal, prioridade, criado_em, atualizado_em")
      .eq("protocolo", data.protocolo)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
