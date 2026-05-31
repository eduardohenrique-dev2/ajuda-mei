import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyTickets } from "@/lib/tickets.functions";
import { StatusBadge } from "./dashboard";

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({ meta: [{ title: "Meus tickets — Sala do Empreendedor" }] }),
  component: TicketsPage,
});

function TicketsPage() {
  const fetchMy = useServerFn(listMyTickets);
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: () => fetchMy(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meus atendimentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Histórico completo dos seus tickets, com número de protocolo.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
        ) : (tickets ?? []).length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-muted-foreground">Você ainda não tem atendimentos.</p>
            <p className="mt-1 text-xs text-muted-foreground">Use o chat no canto inferior direito para abrir um.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Protocolo</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Abertura</th>
              </tr>
            </thead>
            <tbody>
              {tickets!.map(t => (
                <tr key={t.id} className="border-t border-border hover:bg-card/40">
                  <td className="px-4 py-3 font-mono text-xs">{t.protocolo}</td>
                  <td className="px-4 py-3">{t.titulo}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.categoria}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(t.criado_em).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
