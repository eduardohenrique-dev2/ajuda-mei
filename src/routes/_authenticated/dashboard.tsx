import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyTickets } from "@/lib/tickets.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { Ticket, MessageCircle, BookOpen, Bell, FileText, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageView } from "@/lib/use-analytics";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Início — Sala do Empreendedor" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  usePageView({ area: "dashboard_mei" });
  const fetchMy = useServerFn(listMyTickets);
  const fetchProfile = useServerFn(getMyProfile);

  const { data: tickets, isLoading: loadingTickets } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: () => fetchMy(),
  });
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
  });

  const abertos = (tickets ?? []).filter(t => t.status !== "resolvido" && t.status !== "encerrado").length;
  const aguardando = (tickets ?? []).filter(t => t.status === "aguardando_mei").length;
  const firstName = (profile?.nome ?? "").split(" ")[0] || "empreendedor";

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-8">
        {loadingProfile ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Olá, {firstName} 👋
          </h1>
        )}
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {aguardando > 0
            ? `Você tem ${aguardando} atendimento(s) aguardando uma resposta sua.`
            : "Tudo em dia por aqui. Procure uma solução ou abra um novo atendimento."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/solucoes"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="h-4 w-4" aria-hidden="true" /> Buscar solução
          </Link>
          <Link
            to="/tickets"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Ticket className="h-4 w-4" aria-hidden="true" /> Meus atendimentos
          </Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loadingTickets ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="mt-3 h-7 w-12" />
              <Skeleton className="mt-1 h-3 w-24" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Aguardando você" value={aguardando} icon={Bell} accent="warning" />
            <StatCard label="Tickets em aberto" value={abertos} icon={Ticket} accent="primary" />
            <StatCard label="Tickets totais" value={tickets?.length ?? 0} icon={FileText} accent="info" />
            <StatCard label="Documentos" value="—" icon={FileText} accent="muted" />
          </>
        )}
      </div>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Atalhos</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard to="/documentos" icon={FileText} title="Documentos" desc="Enviar e acompanhar." />
          <ActionCard to="/solutions" icon={BookOpen} title="Base de soluções" desc="Catálogo completo." />
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-medium">Abrir conversa</h3>
            <p className="mt-1 text-sm text-muted-foreground">Toque no botão verde no canto inferior direito.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Últimos tickets</h2>
          <Link to="/tickets" className="text-sm text-primary hover:underline">Ver todos</Link>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          {loadingTickets ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (tickets ?? []).length === 0 ? (
            <div className="p-8 text-center">
              <Ticket className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Você ainda não abriu nenhum atendimento.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use o chat no canto inferior direito para começar.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-card/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Protocolo</th>
                  <th className="px-4 py-2">Título</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets!.slice(0, 5).map(t => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-4 py-2 font-mono text-xs">{t.protocolo}</td>
                    <td className="px-4 py-2">{t.titulo}</td>
                    <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: {
  label: string; value: number | string; icon: React.ComponentType<{ className?: string }>;
  accent: "primary" | "info" | "warning" | "muted";
}) {
  const map = {
    primary: "bg-primary/15 text-primary",
    info: "bg-info/15 text-info",
    warning: "bg-warning/15 text-warning",
    muted: "bg-muted text-muted-foreground",
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

function ActionCard({ to, icon: Icon, title, desc }: {
  to: string; icon: React.ComponentType<{ className?: string }>; title: string; desc: string;
}) {
  return (
    <Link to={to} className="block rounded-xl border border-border bg-card p-5 transition hover:border-primary/50">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    novo: "bg-info/15 text-info",
    em_analise: "bg-warning/15 text-warning",
    aguardando_mei: "bg-warning/15 text-warning",
    resolvido: "bg-primary/15 text-primary",
    encerrado: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    novo: "Novo", em_analise: "Em análise", aguardando_mei: "Aguardando você",
    resolvido: "Resolvido", encerrado: "Encerrado",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-muted"}`}>
      {labels[status] ?? status}
    </span>
  );
}
