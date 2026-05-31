/**
 * Defensive render helpers — evita React error #31 (render de objeto).
 * Soluções legacy podem ter passo_a_passo como string[] OU { ordem, texto }[].
 */
export function passoText(p: unknown): string {
  if (p == null) return "";
  if (typeof p === "string") return p;
  if (typeof p === "number" || typeof p === "boolean") return String(p);
  if (typeof p === "object") {
    const o = p as Record<string, unknown>;
    if (typeof o.texto === "string") return o.texto;
    if (typeof o.text === "string") return o.text;
    if (typeof o.descricao === "string") return o.descricao;
    if (typeof o.label === "string") return o.label;
  }
  return "";
}

export function asString(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}
