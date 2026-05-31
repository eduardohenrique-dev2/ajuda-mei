import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAnalytics } from "@/lib/staff.functions";
import { TrendingUp, Inbox, CheckCircle2, BookOpen, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Atendimento" }] }),
  component: AnalyticsPage,
});

const STATUS_LABEL: Record<string, string> = {
  novo: "Novos", em_analise: "Em análise", aguardando_mei: "Aguardando MEI",
  resolvido: "Resolvidos", encerrado: "Encerrados",
};

function AnalyticsPage() {
  const fetchData = useServerFn(getAnalytics);
  const { data, isLoading } = useQuery({ queryKey: ["analytics"], queryFn: () => fetchData() });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Carregando métricas...</p>;
  }

  const maxDia = Math.max(1, ...data.por_dia_14d.map(d => d.total));
  const totalCategorias = Object.values(data.por_categoria).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visão consolidada da Sala do Empreendedor (últimos 30 dias).</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Calendar} label="Novos hoje" value={data.novos_hoje} accent="primary" />
        <Stat icon={Inbox} label="Em aberto" value={data.abertos} accent="warning" />
        <Stat icon={CheckCircle2} label="Resolvidos (30d)" value={data.resolvidos_30d} accent="success" />
        <Stat icon={BookOpen} label="Soluções ativas" value={data.solucoes_ativas} accent="info" />
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-medium">Tickets nos últimos 14 dias</h2>
        </div>
        {data.por_dia_14d.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Sem dados.</p>
        ) : (
          <div className="mt-6 flex h-40 items-end gap-1">
            {data.por_dia_14d.map(d => (
              <div key={d.dia} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary/70 transition hover:bg-primary"
                  style={{ height: `${(d.total / maxDia) * 100}%` }}
                  title={`${d.dia}: ${d.total}`}
                />
                <span className="text-[9px] text-muted-foreground">{d.dia.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium">Por categoria (30d)</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(data.por_categoria).length === 0 && (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            )}
            {Object.entries(data.por_categoria)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, total]) => (
                <div key={cat}>
                  <div className="flex justify-between text-xs">
                    <span className="capitalize">{cat.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">{total}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(total / totalCategorias) * 100}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium">Por status (total)</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(data.por_status).length === 0 && (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            )}
            {Object.entries(data.por_status).map(([s, total]) => (
              <div key={s} className="flex items-center justify-between rounded-md bg-background px-3 py-2 text-sm">
                <span>{STATUS_LABEL[s] ?? s}</span>
                <span className="font-mono text-xs text-muted-foreground">{total}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: {
  icon: typeof TrendingUp; label: string; value: number;
  accent: "primary" | "warning" | "success" | "info";
}) {
  const map = {
    primary: "bg-primary/15 text-primary",
    warning: "bg-warning/15 text-warning",
    success: "bg-emerald-500/15 text-emerald-400",
    info: "bg-info/15 text-info",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className={`grid h-10 w-10 place-items-center rounded-lg ${map[accent]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
