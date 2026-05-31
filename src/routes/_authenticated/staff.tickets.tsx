import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAllTickets } from "@/lib/staff.functions";
import { StatusBadge } from "../_authenticated/dashboard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff/tickets")({
  head: () => ({ meta: [{ title: "Fila — Atendimento" }] }),
  component: StaffTicketsPage,
});

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "novo", label: "Novos" },
  { value: "em_analise", label: "Em análise" },
  { value: "aguardando_mei", label: "Aguardando MEI" },
  { value: "resolvido", label: "Resolvidos" },
];

function StaffTicketsPage() {
  const [status, setStatus] = useState("novo");
  const [q, setQ] = useState("");
  const fetchAll = useServerFn(listAllTickets);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["staff-tickets", status, q],
    queryFn: () => fetchAll({ data: { status, q: q || undefined } }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fila de atendimento</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tickets dos MEIs aguardando ação.</p>
        </div>
        <button onClick={() => refetch()} className="text-xs text-primary hover:underline">Atualizar</button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              status === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-card/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <div className="relative ml-auto w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar protocolo ou título" className="pl-8" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
        ) : (data ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum ticket com esse filtro.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Protocolo</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Abertura</th>
              </tr>
            </thead>
            <tbody>
              {data!.map(t => (
                <tr key={t.id} className="border-t border-border hover:bg-card/40">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link to={"/staff/tickets/$id" as any} params={{ id: t.id } as any} className="text-primary hover:underline">
                      {t.protocolo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{t.titulo}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.categoria}</td>
                  <td className="px-4 py-3 text-xs uppercase text-muted-foreground">{t.prioridade}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(t.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
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
