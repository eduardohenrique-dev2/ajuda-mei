import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Gera embedding via Lovable AI Gateway (768 dims — gemini-embedding-001 truncado).
 */
export async function generateEmbedding(input: string): Promise<number[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-embedding-001",
      input,
      dimensions: 768,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Embedding falhou (${res.status}): ${txt}`);
  }
  const json = await res.json();
  return json.data[0].embedding as number[];
}

/**
 * Classifica intenção da mensagem do usuário em uma categoria fixa.
 */
const CATEGORIAS = [
  "declaracao_anual","das","parcelamento","regularizacao",
  "funcionarios","notas_fiscais","cadastro","pendencias",
  "outros_setores","outros",
] as const;

export const classifyIntent = createServerFn({ method: "POST" })
  .inputValidator((d: { message: string }) =>
    z.object({ message: z.string().trim().min(1).max(2000) }).parse(d)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "Você é um classificador de intenções para a Sala do Empreendedor (MEI). " +
              `Responda APENAS com JSON {"categoria":"...","titulo_curto":"..."} onde categoria é uma de: ${CATEGORIAS.join(", ")}. titulo_curto: até 80 chars.`,
          },
          { role: "user", content: data.message },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      // Fallback gracioso
      return { categoria: "outros" as const, titulo_curto: data.message.slice(0, 80) };
    }
    const json = await res.json();
    try {
      const parsed = JSON.parse(json.choices[0].message.content);
      const categoria = (CATEGORIAS as readonly string[]).includes(parsed.categoria)
        ? parsed.categoria
        : "outros";
      return {
        categoria: categoria as (typeof CATEGORIAS)[number],
        titulo_curto: String(parsed.titulo_curto ?? data.message).slice(0, 80),
      };
    } catch {
      return { categoria: "outros" as const, titulo_curto: data.message.slice(0, 80) };
    }
  });
