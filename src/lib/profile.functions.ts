import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Valida CNPJ pelos dígitos verificadores (sem chamada externa)
function isValidCnpj(raw: string): boolean {
  const cnpj = raw.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (slice: string) => {
    const w = slice.length === 12
      ? [5,4,3,2,9,8,7,6,5,4,3,2]
      : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const sum = slice.split("").reduce((a, d, i) => a + Number(d) * w[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(cnpj.slice(0, 12));
  const d2 = calc(cnpj.slice(0, 12) + d1);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, nome, email, cnpj, telefone, status, criado_em")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const updateInput = z.object({
  nome: z.string().trim().min(2).max(120),
  telefone: z.string().trim().max(20).optional().or(z.literal("")),
  cnpj: z.string().trim().max(20).optional().or(z.literal("")),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof updateInput>) => {
    const parsed = updateInput.parse(d);
    if (parsed.cnpj && parsed.cnpj.replace(/\D/g, "").length > 0 && !isValidCnpj(parsed.cnpj)) {
      throw new Error("CNPJ inválido");
    }
    return parsed;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        nome: data.nome,
        telefone: data.telefone || null,
        cnpj: data.cnpj || null,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
