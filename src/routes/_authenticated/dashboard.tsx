import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyTickets } from "@/lib/tickets.functions";
import { Ticket, MessageCircle, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Início — Sala do Empreendedor" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const fetchMy = useServerFn(listMyTickets);
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: () => fetchMy(),
  });

  const abertos = (tickets ?? []).filter(t => t.status !== "resolvido" && t.status !== "encerrado").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, bem-vindo de volta 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use o chat no canto inferior direito ou explore as ações abaixo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tickets em aberto" value={abertos} icon={Ticket} accent="primary" />
        <StatCard label="Tickets totais" value={tickets?.length ?? 0} icon={Ticket} accent="info" />
        <StatCard label="Base de soluções" value="—" icon={BookOpen} accent="warning" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard
          to="/tickets"
          icon={Ticket}
          title="Meus atendimentos"
          desc="Veja o status e protocolo dos seus tickets."
        />
        <ActionCard
          to="/solutions"
          icon={BookOpen}
          title="Base de soluções"
          desc="Consulte respostas oficiais sobre DAS, declaração e mais."
        />
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <h3 className="mt-3 font-medium">Abrir conversa</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Toque no botão verde no canto inferior direito para falar com o assistente.
          </p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Últimos tickets</h2>
          <Link to="/tickets" className="text-sm text-primary hover:underline">Ver todos</Link>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
          ) : (tickets ?? []).length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Você ainda não abriu nenhum atendimento. Use o chat para começar.
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
  accent: "primary" | "info" | "warning";
}) {
  const map = {
    primary: "bg-primary/15 text-primary",
    info: "bg-info/15 text-info",
    warning: "bg-warning/15 text-warning",
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
