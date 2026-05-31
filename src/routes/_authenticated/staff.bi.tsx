import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, Inbox, CheckCircle2, Clock, Users, FileText, FolderArchive,
  Download, Filter, BarChart3, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBIDashboard, type BIFilters } from "@/lib/bi.functions";
import { listSectorsPublic } from "@/lib/sectors-public.functions";
import { downloadCSV, toCSV } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/staff/bi")({
  head: () => ({ meta: [{ title: "BI Operacional — Atendimento" }] }),
  component: BIPage,
});

const CATEGORIAS = [
  "declaracao_anual", "das", "parcelamento", "regularizacao", "funcionarios",
  "notas_fiscais", "cadastro", "pendencias", "outros_setores", "outros",
] as const;
const STATUSES = ["novo", "em_analise", "aguardando_mei", "resolvido", "encerrado"] as const;
const STATUS_LABEL: Record<string, string> = {
  novo: "Novos", em_analise: "Em análise", aguardando_mei: "Aguardando MEI",
  resolvido: "Resolvidos", encerrado: "Encerrados",
};
const STATUS_COLOR: Record<string, string> = {
  novo: "var(--info)",
  em_analise: "var(--warning)",
  aguardando_mei: "color-mix(in oklab, var(--warning) 70%, transparent)",
  resolvido: "var(--primary)",
  encerrado: "var(--muted-foreground)",
};
const PIE_COLORS = [
  "var(--primary)",
  "var(--info)",
  "var(--warning)",
  "var(--destructive)",
  "var(--muted-foreground)",
  "color-mix(in oklab, var(--primary) 60%, transparent)",
];

function toLocalInput(d: Date) {
  // <input type="date"> precisa yyyy-mm-dd
  return d.toISOString().slice(0, 10);
}
function fromLocalInput(s: string, endOfDay = false): string {
  const d = new Date(`${s}T${endOfDay ? "23:59:59" : "00:00:00"}.000Z`);
  return d.toISOString();
}

function BIPage() {
  const today = new Date();
  const thirtyAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [fromDate, setFromDate] = useState(toLocalInput(thirtyAgo));
  const [toDate, setToDate] = useState(toLocalInput(today));
  const [sectorId, setSectorId] = useState<string>("all");
  const [categoria, setCategoria] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const filters: BIFilters = useMemo(() => ({
    from: fromLocalInput(fromDate),
    to: fromLocalInput(toDate, true),
    sector_id: sectorId === "all" ? undefined : sectorId,
    categoria: categoria === "all" ? undefined : categoria,
    status: status === "all" ? undefined : status,
  }), [fromDate, toDate, sectorId, categoria, status]);

  const fetchBI = useServerFn(getBIDashboard);
  const fetchSectors = useServerFn(listSectorsPublic);

  const { data: sectors } = useQuery({
    queryKey: ["bi-sectors"],
    queryFn: () => fetchSectors(),
    staleTime: 5 * 60_000,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["bi-dashboard", filters],
    queryFn: () => fetchBI({ data: filters as never }),
  });

  const exportAllCSV = () => {
    if (!data) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCSV(`bi-kpis-${stamp}.csv`, toCSV(
      Object.entries(data.kpis).map(([metrica, valor]) => ({ metrica, valor: String(valor) }))
    ));
    downloadCSV(`bi-serie-${stamp}.csv`, toCSV(data.serie_temporal as Record<string, unknown>[]));
    downloadCSV(`bi-categorias-${stamp}.csv`, toCSV(data.por_categoria as Record<string, unknown>[]));
    downloadCSV(`bi-setores-${stamp}.csv`, toCSV(data.por_setor as Record<string, unknown>[]));
    downloadCSV(`bi-funil-${stamp}.csv`, toCSV(data.funil as Record<string, unknown>[]));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">BI Operacional</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Indicadores executivos, funil e analytics da Sala do Empreendedor.
          </p>
        </div>
        <Button onClick={exportAllCSV} variant="outline" size="sm" disabled={!data}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" /> Exportar CSV
        </Button>
      </header>

      {/* Filtros globais */}
      <section
        aria-label="Filtros do dashboard"
        className="rounded-xl border border-border bg-card p-4"
      >
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Filter className="h-3.5 w-3.5" aria-hidden="true" /> Filtros
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="bi-from" className="text-xs text-muted-foreground">De</label>
            <Input id="bi-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-10" />
          </div>
          <div>
            <label htmlFor="bi-to" className="text-xs text-muted-foreground">Até</label>
            <Input id="bi-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-10" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Setor</label>
            <Select value={sectorId} onValueChange={setSectorId}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os setores</SelectItem>
                {(sectors ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Categoria</label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <Tabs defaultValue="executivo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="executivo">Executivo</TabsTrigger>
          <TabsTrigger value="operacional">Operacional</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <div aria-live="polite" className="sr-only">
          {isFetching ? "Atualizando dados..." : ""}
        </div>

        {/* EXECUTIVO */}
        <TabsContent value="executivo" className="space-y-6">
          <KPIGrid loading={isLoading} data={data} variant="executive" />

          <ChartCard title="Tickets criados x resolvidos" icon={TrendingUp}>
            {isLoading ? <ChartSkeleton /> : (data?.serie_temporal.length ?? 0) === 0 ? (
              <EmptyChart label="Sem tickets no período." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data!.serie_temporal} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="criados" name="Criados" stroke="var(--primary)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="resolvidos" name="Resolvidos" stroke="var(--info)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Top categorias de problemas" icon={BarChart3}>
              {isLoading ? <ChartSkeleton /> : (data?.por_categoria.length ?? 0) === 0 ? (
                <EmptyChart label="Sem categorias no período." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data!.por_categoria} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                    <YAxis type="category" dataKey="categoria" stroke="var(--muted-foreground)" fontSize={10}
                      width={110}
                      tickFormatter={(v: string) => v.replace(/_/g, " ")} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="total" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Distribuição por setor" icon={Users}>
              {isLoading ? <ChartSkeleton /> : (data?.por_setor.length ?? 0) === 0 ? (
                <EmptyChart label="Sem dados por setor." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={data!.por_setor} dataKey="total" nameKey="setor" innerRadius={60} outerRadius={100} paddingAngle={2}>
                      {data!.por_setor.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </TabsContent>

        {/* OPERACIONAL */}
        <TabsContent value="operacional" className="space-y-6">
          <ChartCard title="Funil operacional" icon={Activity} subtitle="Chat → Solução → Ticket → Resolvido">
            {isLoading ? <ChartSkeleton /> : <FunnelView steps={data?.funil ?? []} />}
          </ChartCard>

          <ChartCard title="Status dos tickets por dia" icon={BarChart3} subtitle="Empilhado por status no período">
            {isLoading ? <ChartSkeleton /> : (data?.status_por_dia.length ?? 0) === 0 ? (
              <EmptyChart label="Sem tickets no período." />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data!.status_por_dia} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {STATUSES.map((s) => (
                    <Bar key={s} dataKey={s} stackId="a" name={STATUS_LABEL[s]} fill={STATUS_COLOR[s]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </TabsContent>

        {/* DOCUMENTOS */}
        <TabsContent value="documentos" className="space-y-6">
          {isLoading ? (
            <KPIGridSkeleton n={3} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <KPICard icon={FolderArchive} label="Documentos enviados" value={data?.kpis.documentos_enviados ?? 0} accent="primary" />
              <KPICard icon={FileText} label="Pendentes revisão" value={data?.kpis.documentos_pendentes ?? 0} accent="warning" />
              <KPICard icon={CheckCircle2} label="Aprovados no período" value={data?.kpis.documentos_aprovados ?? 0} accent="success" />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Métricas detalhadas e fila de revisão em{" "}
            <a href="/staff/documentos" className="text-primary hover:underline">Revisar documentos</a>.
          </p>
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics" className="space-y-6">
          <ChartCard title="Eventos rastreados" icon={Activity} subtitle="Volume por tipo de evento no período">
            {isLoading ? <ChartSkeleton /> : Object.keys(data?.eventos ?? {}).length === 0 ? (
              <EmptyChart label="Sem eventos no período." />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={Object.entries(data!.eventos).map(([event, total]) => ({ event, total })).sort((a, b) => b.total - a.total)}
                  layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="event" stroke="var(--muted-foreground)" fontSize={10} width={150} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="total" fill="var(--info)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- subcomponentes ---------- */

function KPIGrid({ loading, data }: { loading: boolean; data: any; variant?: "executive" }) {
  if (loading || !data) return <KPIGridSkeleton n={6} />;
  const k = data.kpis;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <KPICard icon={Inbox} label="Tickets no período" value={k.tickets_periodo} accent="primary" />
      <KPICard icon={Activity} label="Abertos agora" value={k.tickets_abertos} accent="warning" />
      <KPICard icon={CheckCircle2} label="Resolvidos" value={k.tickets_resolvidos} accent="success"
        sub={`Taxa ${k.taxa_resolucao_pct}%`} />
      <KPICard icon={Clock} label="Tempo médio" value={`${k.tempo_medio_resolucao_h}h`} accent="info" />
      <KPICard icon={Users} label="Usuários ativos" value={k.usuarios_ativos} accent="primary" />
      <KPICard icon={FolderArchive} label="Documentos" value={k.documentos_enviados} accent="muted"
        sub={`${k.documentos_pendentes} pendentes`} />
    </div>
  );
}

function KPIGridSkeleton({ n }: { n: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="mt-3 h-6 w-16" />
          <Skeleton className="mt-1 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function KPICard({
  icon: Icon, label, value, accent, sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  accent: "primary" | "info" | "warning" | "success" | "muted";
  sub?: string;
}) {
  const map: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    info: "bg-info/15 text-info",
    warning: "bg-warning/15 text-warning",
    success: "bg-primary/15 text-primary",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${map[accent]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-2xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground/80">{sub}</p>}
    </div>
  );
}

function ChartCard({
  title, subtitle, icon: Icon, children,
}: {
  title: string; subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-medium">{title}</h2>
        {subtitle && <span className="text-xs text-muted-foreground">— {subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-[280px] w-full rounded-lg" />;
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="grid h-[200px] place-items-center rounded-lg border border-dashed border-border">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function FunnelView({ steps }: { steps: { etapa: string; valor: number }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.valor));
  if (max === 0) return <EmptyChart label="Sem dados de funil no período." />;
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const pct = Math.round((s.valor / max) * 100);
        const conv = i > 0 && steps[i - 1].valor > 0
          ? Math.round((s.valor / steps[i - 1].valor) * 100)
          : null;
        return (
          <li key={s.etapa}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium">{s.etapa}</span>
              <span className="text-muted-foreground">
                {s.valor.toLocaleString("pt-BR")}
                {conv !== null && <span className="ml-2 text-xs">({conv}%)</span>}
              </span>
            </div>
            <div
              className="h-7 rounded-md bg-muted"
              role="img"
              aria-label={`${s.etapa}: ${s.valor}`}
            >
              <div
                className="h-full rounded-md bg-gradient-to-r from-primary to-primary/60 transition-all"
                style={{ width: `${Math.max(pct, 4)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
