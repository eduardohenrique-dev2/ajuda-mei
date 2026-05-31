import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateEmbedding } from "./ai.functions";

const CATEGORIAS = z.enum([
  "declaracao_anual","das","parcelamento","regularizacao",
  "funcionarios","notas_fiscais","cadastro","pendencias",
  "outros_setores","outros",
]);

export const listSolutions = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("solutions")
    .select("id, titulo, categoria, descricao, passo_a_passo, link_oficial, tags, ativo, criado_em")
    .eq("ativo", true)
    .order("criado_em", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data;
});

const createSolutionInput = z.object({
  titulo: z.string().trim().min(3).max(200),
  categoria: CATEGORIAS,
  descricao: z.string().trim().min(10).max(5000),
  passo_a_passo: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
  link_oficial: z.string().trim().url().max(500).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export const createSolution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof createSolutionInput>) => createSolutionInput.parse(d))
  .handler(async ({ data, context }) => {
    // Verifica papel
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const isStaff = (roles ?? []).some(r => ["atendente","gestor","admin"].includes(r.role));
    if (!isStaff) throw new Error("Apenas atendentes podem criar soluções");

    const embeddingInput = `${data.titulo}\n${data.descricao}\n${data.passo_a_passo.join("\n")}`;
    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(embeddingInput);
    } catch (e) {
      console.error("[createSolution] embedding falhou (fallback sem busca semântica):", e);
    }

    const { data: inserted, error } = await supabaseAdmin.from("solutions").insert({
      titulo: data.titulo,
      categoria: data.categoria,
      descricao: data.descricao,
      passo_a_passo: data.passo_a_passo,
      link_oficial: data.link_oficial || null,
      tags: data.tags,
      embedding: embedding as unknown as string | null,
      criado_por: context.userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return inserted;
  });

const updateSolutionInput = createSolutionInput.partial().extend({
  id: z.string().uuid(),
  ativo: z.boolean().optional(),
});

export const updateSolution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof updateSolutionInput>) => updateSolutionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const isStaff = (roles ?? []).some(r => ["atendente","gestor","admin"].includes(r.role));
    if (!isStaff) throw new Error("Apenas atendentes podem editar soluções");

    const { id, ...patch } = data;
    const updatePayload: Record<string, any> = { ...patch, atualizado_em: new Date().toISOString() };

    // Regenerar embedding se conteúdo mudou
    if (patch.titulo || patch.descricao || patch.passo_a_passo) {
      const { data: current } = await supabaseAdmin
        .from("solutions")
        .select("titulo, descricao, passo_a_passo")
        .eq("id", id)
        .single();
      const titulo = patch.titulo ?? current?.titulo ?? "";
      const descricao = patch.descricao ?? current?.descricao ?? "";
      const passos = (patch.passo_a_passo ?? (current?.passo_a_passo as string[]) ?? []) as string[];
      try {
        const embedding = await generateEmbedding(`${titulo}\n${descricao}\n${passos.join("\n")}`);
        updatePayload.embedding = embedding as unknown as string;
      } catch (e) {
        console.error("[updateSolution] embedding falhou:", e);
      }
    }
    if (patch.link_oficial === "") updatePayload.link_oficial = null;

    const { error } = await supabaseAdmin.from("solutions").update(updatePayload as any).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSolution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const isStaff = (roles ?? []).some(r => ["atendente","gestor","admin"].includes(r.role));
    if (!isStaff) throw new Error("Apenas atendentes podem remover soluções");
    // Soft delete
    const { error } = await supabaseAdmin.from("solutions").update({ ativo: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const searchSolutions = createServerFn({ method: "POST" })
  .inputValidator((d: { query: string; limit?: number }) =>
    z.object({
      query: z.string().trim().min(2).max(500),
      limit: z.number().int().min(1).max(10).default(5),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    let embedding: number[];
    try {
      embedding = await generateEmbedding(data.query);
    } catch (e) {
      console.error("[searchSolutions] embedding falhou, fallback ILIKE:", e);
      const { data: rows } = await supabaseAdmin
        .from("solutions")
        .select("id, titulo, categoria, descricao, passo_a_passo, link_oficial")
        .eq("ativo", true)
        .ilike("titulo", `%${data.query}%`)
        .limit(data.limit);
      return (rows ?? []).map(r => ({ ...r, similarity: 0 }));
    }

    const { data: rows, error } = await supabaseAdmin.rpc("match_solutions", {
      query_embedding: embedding as unknown as string,
      match_count: data.limit,
      min_similarity: 0.3,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
