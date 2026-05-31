import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FiltersSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sector_id: z.string().uuid().optional(),
  categoria: z.string().max(40).optional(),
  status: z.string().max(40).optional(),
});

export type BIFilters = z.infer<typeof FiltersSchema>;

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const ok = (data ?? []).some((r: any) => ["atendente", "gestor", "admin"].includes(r.role));
  if (!ok) throw new Error("Acesso restrito a atendentes.");
}

function defaultRange(input: BIFilters) {
  const to = input.to ? new Date(input.to) : new Date();
  const from = input.from ? new Date(input.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

function dayKey(d: string | Date) {
  return new Date(d).toISOString().slice(0, 10);
}

function fillDailySeries(from: Date, to: Date, points: Map<string, Record<string, number>>) {
  const days: { dia: string; [k: string]: number | string }[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor <= end) {
    const k = cursor.toISOString().slice(0, 10);
    days.push({ dia: k, ...(points.get(k) ?? {}) });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/**
 * Retorna dados consolidados de BI para o dashboard operacional.
 * RLS já garante que apenas staff lê tickets/documents/analytics; mesmo assim
 * verificamos a role explicitamente.
 */
export const getBIDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FiltersSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabase } = context;
    const { from, to } = defaultRange(data);
    const fromISO = from.toISOString();
    const toISO = to.toISOString();

    // ---------- Tickets ----------
    let tq = supabase
      .from("tickets")
      .select("id, status, categoria, prioridade, setor_id, criado_em, atualizado_em, encerrado_em, mei_id, protocolo")
      .gte("criado_em", fromISO)
      .lte("criado_em", toISO);
    if (data.sector_id) tq = tq.eq("setor_id", data.sector_id);
    if (data.categoria) tq = tq.eq("categoria", data.categoria as any);
    if (data.status) tq = tq.eq("status", data.status as any);
    const { data: tickets, error: tErr } = await tq;
    if (tErr) throw new Error(tErr.message);
    const T = tickets ?? [];

    // Tickets abertos (snapshot atual) — ignora filtro de período pq é estado.
    let abertosQ = supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(resolvido,encerrado)");
    if (data.sector_id) abertosQ = abertosQ.eq("setor_id", data.sector_id);
    if (data.categoria) abertosQ = abertosQ.eq("categoria", data.categoria as any);
    const { count: abertosCount } = await abertosQ;

    // ---------- Documentos ----------
    let dq = supabase
      .from("documents")
      .select("id, status, tipo, created_at, reviewed_at, user_id")
      .gte("created_at", fromISO)
      .lte("created_at", toISO);
    const { data: docs } = await dq;
    const D = docs ?? [];

    // ---------- Analytics events (funil) ----------
    let eq_ = supabase
      .from("analytics_events")
      .select("event_name, user_id, session_id, criado_em")
      .gte("criado_em", fromISO)
      .lte("criado_em", toISO);
    const { data: events } = await eq_;
    const E = events ?? [];

    // ---------- KPIs ----------
    const resolvidos = T.filter((t: any) => t.status === "resolvido" || t.status === "encerrado");
    const tempoMedioH = (() => {
      const durations = resolvidos
        .map((t: any) => {
          const fim = t.encerrado_em ?? t.atualizado_em;
          if (!fim) return null;
          return (new Date(fim).getTime() - new Date(t.criado_em).getTime()) / 36e5;
        })
        .filter((x: number | null): x is number => x !== null && x >= 0);
      if (!durations.length) return 0;
      return Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10;
    })();
    const usuariosUnicos = new Set(
      [...T.map((t: any) => t.mei_id), ...E.map((e: any) => e.user_id)].filter(Boolean)
    ).size;
    const taxaResolucao = T.length > 0 ? Math.round((resolvidos.length / T.length) * 1000) / 10 : 0;

    const kpis = {
      tickets_periodo: T.length,
      tickets_abertos: abertosCount ?? 0,
      tickets_resolvidos: resolvidos.length,
      taxa_resolucao_pct: taxaResolucao,
      tempo_medio_resolucao_h: tempoMedioH,
      usuarios_ativos: usuariosUnicos,
      protocolos: new Set(T.map((t: any) => t.protocolo).filter(Boolean)).size,
      documentos_enviados: D.length,
      documentos_pendentes: D.filter((d: any) => d.status === "pending_review" || d.status === "uploaded" || d.status === "processing").length,
      documentos_aprovados: D.filter((d: any) => d.status === "approved").length,
    };

    // ---------- Funil operacional ----------
    const count = (name: string) => E.filter((e: any) => e.event_name === name).length;
    const funil = [
      { etapa: "Chat iniciado", valor: count("chat_message") },
      { etapa: "Solução aberta", valor: count("solution_opened") + count("link_click") },
      { etapa: "Ticket criado", valor: T.length },
      { etapa: "Resolvido", valor: resolvidos.length },
    ];

    // ---------- Série temporal: tickets criados x resolvidos por dia ----------
    const tsMap = new Map<string, Record<string, number>>();
    for (const t of T) {
      const k = dayKey(t.criado_em);
      const cur = tsMap.get(k) ?? { criados: 0, resolvidos: 0 };
      cur.criados = (cur.criados ?? 0) + 1;
      tsMap.set(k, cur);
    }
    for (const t of resolvidos) {
      const fim = t.encerrado_em ?? t.atualizado_em;
      if (!fim) continue;
      const k = dayKey(fim);
      if (new Date(fim) < from || new Date(fim) > to) continue;
      const cur = tsMap.get(k) ?? { criados: 0, resolvidos: 0 };
      cur.resolvidos = (cur.resolvidos ?? 0) + 1;
      tsMap.set(k, cur);
    }
    const serie_temporal = fillDailySeries(from, to, tsMap);

    // ---------- Bar: top categorias ----------
    const catMap = new Map<string, number>();
    for (const t of T) {
      const k = String(t.categoria ?? "outros");
      catMap.set(k, (catMap.get(k) ?? 0) + 1);
    }
    const por_categoria = Array.from(catMap.entries())
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // ---------- Donut: setores ----------
    const sectorMap = new Map<string, number>();
    for (const t of T) {
      const k = t.setor_id ?? "sem_setor";
      sectorMap.set(k, (sectorMap.get(k) ?? 0) + 1);
    }
    const sectorIds = Array.from(sectorMap.keys()).filter((id) => id !== "sem_setor");
    let sectorNames = new Map<string, string>();
    if (sectorIds.length) {
      const { data: secs } = await supabase
        .from("sectors").select("id, nome").in("id", sectorIds);
      sectorNames = new Map((secs ?? []).map((s: any) => [s.id, s.nome]));
    }
    const por_setor = Array.from(sectorMap.entries()).map(([id, total]) => ({
      setor: id === "sem_setor" ? "Sem setor" : (sectorNames.get(id) ?? "—"),
      total,
    })).sort((a, b) => b.total - a.total);

    // ---------- Stacked: status por dia ----------
    const STATUS_KEYS = ["novo", "em_analise", "aguardando_mei", "resolvido", "encerrado"] as const;
    const stackMap = new Map<string, Record<string, number>>();
    for (const t of T) {
      const k = dayKey(t.criado_em);
      const cur = stackMap.get(k) ?? Object.fromEntries(STATUS_KEYS.map((s) => [s, 0]));
      cur[String(t.status)] = (cur[String(t.status)] ?? 0) + 1;
      stackMap.set(k, cur);
    }
    const status_por_dia = fillDailySeries(from, to, stackMap);

    // ---------- Eventos analytics agregados ----------
    const eventCounts: Record<string, number> = {};
    for (const e of E) {
      eventCounts[e.event_name] = (eventCounts[e.event_name] ?? 0) + 1;
    }

    return {
      range: { from: fromISO, to: toISO },
      kpis,
      funil,
      serie_temporal,
      por_categoria,
      por_setor,
      status_por_dia,
      eventos: eventCounts,
    };
  });

export type BIDashboard = Awaited<ReturnType<typeof getBIDashboard>>;
