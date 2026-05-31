import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { getTicketDetail, replyTicket, updateTicketStatus } from "@/lib/staff.functions";
import { StatusBadge } from "../_authenticated/dashboard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff/tickets/$id")({
  head: () => ({ meta: [{ title: "Ticket — Atendimento" }] }),
  component: TicketDetailPage,
});

const STATUS_FLOW = [
  { value: "novo", label: "Novo" },
  { value: "em_analise", label: "Em análise" },
  { value: "aguardando_mei", label: "Aguardando MEI" },
  { value: "resolvido", label: "Resolvido" },
  { value: "encerrado", label: "Encerrado" },
];

function TicketDetailPage() {
  const { id } = Route.useParams();
  const fetchDetail = useServerFn(getTicketDetail);
  const reply = useServerFn(replyTicket);
  const setStatus = useServerFn(updateTicketStatus);
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [interna, setInterna] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-ticket", id],
    queryFn: () => fetchDetail({ data: { id } }),
  });

  const sendReply = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try {
      await reply({ data: { ticket_id: id, mensagem: message.trim(), interna } });
      setMessage("");
      qc.invalidateQueries({ queryKey: ["staff-ticket", id] });
      qc.invalidateQueries({ queryKey: ["staff-tickets"] });
      toast.success(interna ? "Nota interna registrada" : "Resposta enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (s: string) => {
    setBusy(true);
    try {
      await setStatus({ data: { ticket_id: id, status: s as any } });
      qc.invalidateQueries({ queryKey: ["staff-ticket", id] });
      qc.invalidateQueries({ queryKey: ["staff-tickets"] });
      toast.success("Status atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Ticket não encontrado.</p>;

  const { ticket, messages, mei } = data;

  return (
    <div className="space-y-6">
      <Link to={"/staff/tickets" as any} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Voltar para a fila
      </Link>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{ticket.protocolo}</p>
            <h1 className="mt-1 text-xl font-semibold">{ticket.titulo}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{ticket.descricao}</p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs sm:grid-cols-4">
          <Field label="Categoria" value={ticket.categoria} />
          <Field label="Prioridade" value={ticket.prioridade} />
          <Field label="Canal" value={ticket.canal} />
          <Field label="Aberto em" value={new Date(ticket.criado_em).toLocaleString("pt-BR")} />
        </div>
        {mei && (
          <div className="mt-3 rounded-md border border-border bg-background p-3 text-xs">
            <p className="font-medium">{mei.nome}</p>
            <p className="text-muted-foreground">{mei.email} {mei.cnpj && `· CNPJ ${mei.cnpj}`}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FLOW.map(s => (
          <button
            key={s.value}
            disabled={busy || ticket.status === s.value}
            onClick={() => changeStatus(s.value)}
            className={`rounded-md border px-3 py-1.5 text-xs transition ${
              ticket.status === s.value
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            } disabled:opacity-50`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Conversa</h2>
        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
              Sem mensagens ainda. Envie a primeira resposta abaixo.
            </p>
          )}
          {messages.map(m => (
            <div
              key={m.id}
              className={`rounded-lg p-3 text-sm ${
                m.papel === "atendente"
                  ? "ml-auto max-w-[80%] bg-primary/15"
                  : "mr-auto max-w-[80%] bg-popover"
              } ${m.interna ? "border border-warning/40" : ""}`}
            >
              <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>{m.papel}</span>
                {m.interna && <span className="inline-flex items-center gap-1 text-warning"><Lock className="h-3 w-3" /> Interna</span>}
                <span className="ml-auto">{new Date(m.criado_em).toLocaleString("pt-BR")}</span>
              </div>
              <p className="whitespace-pre-wrap">{m.mensagem}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Escreva a resposta para o MEI..."
          rows={4}
          maxLength={5000}
        />
        <div className="mt-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={interna} onChange={e => setInterna(e.target.checked)} />
            Nota interna (não visível para o MEI)
          </label>
          <Button onClick={sendReply} disabled={busy || !message.trim()} size="sm">
            Enviar resposta
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}
