import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Listagem pública de setores ativos. Sem auth — usada na landing/exploração.
export const listSectorsPublic = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("sectors")
    .select("id, nome, categoria, descricao, telefone, email, endereco, horario, site, palavras_chave")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
});
