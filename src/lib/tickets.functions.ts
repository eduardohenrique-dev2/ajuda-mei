import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CATEGORIAS = z.enum([
  "declaracao_anual","das","parcelamento","regularizacao",
  "funcionarios","notas_fiscais","cadastro","pendencias",
  "outros_setores","outros",
]);

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
  titulo: z.string().trim().min(3).max(200),
  descricao: z.string().trim().min(5).max(5000),
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
