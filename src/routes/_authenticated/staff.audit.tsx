import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLog } from "@/lib/audit.functions";
import { useMyRoles } from "@/lib/use-roles";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff/audit")({
  head: () => ({ meta: [{ title: "Auditoria LGPD — Atendimento" }] }),
  component: AuditPage,
});

function AuditPage() {
  const { data: roles, isLoading: rolesLoading } = useMyRoles();
  const fetchLog = useServerFn(listAuditLog);
  const { data, isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: () => fetchLog({ data: { limit: 200 } }),
    enabled: !!roles?.isAdmin,
  });

  if (rolesLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!roles?.isAdmin) return <Navigate to="/dashboard" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Auditoria LGPD</h1>
          <p className="text-sm text-muted-foreground">Registros de acesso a dados pessoais (últimos 200).</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando registros...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Quando</th>
                <th className="px-3 py-2">Ator</th>
                <th className="px-3 py-2">Ação</th>
                <th className="px-3 py-2">Recurso</th>
                <th className="px-3 py-2">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map(r => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.criado_em).toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.actor_id?.slice(0, 8) ?? "system"}</td>
                  <td className="px-3 py-2"><span className="rounded bg-primary/10 px-2 py-0.5 text-xs">{r.acao}</span></td>
                  <td className="px-3 py-2 text-xs">{r.recurso}{r.recurso_id ? ` (${r.recurso_id.slice(0, 8)})` : ""}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    <code className="text-[10px]">{JSON.stringify(r.detalhes)}</code>
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum registro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
