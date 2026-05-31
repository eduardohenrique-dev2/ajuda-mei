import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listSectors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sectors")
      .select("*")
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  });

const sectorInput = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(2).max(120),
  categoria: z.string().trim().min(2).max(60),
  descricao: z.string().trim().max(2000).optional().or(z.literal("")),
  telefone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().max(120).optional().or(z.literal("")),
  endereco: z.string().trim().max(300).optional().or(z.literal("")),
  horario: z.string().trim().max(120).optional().or(z.literal("")),
  site: z.string().trim().max(200).optional().or(z.literal("")),
  palavras_chave: z.array(z.string().trim().min(1).max(40)).max(50).default([]),
  ativo: z.boolean().default(true),
});

export const upsertSector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof sectorInput>) => sectorInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      nome: data.nome,
      categoria: data.categoria,
      descricao: data.descricao || null,
      telefone: data.telefone || null,
      email: data.email || null,
      endereco: data.endereco || null,
      horario: data.horario || null,
      site: data.site || null,
      palavras_chave: data.palavras_chave,
      ativo: data.ativo,
    };
    if (data.id) {
      const { error } = await context.supabase.from("sectors").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("sectors").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sectors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
