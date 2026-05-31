import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { getMyTicketDetail, replyMyTicket } from "@/lib/tickets.functions";
import { getMyEvaluation } from "@/lib/evaluations.functions";
import { StatusBadge } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentPicker, AttachmentList, type Anexo } from "@/components/attachments/AttachmentPicker";
import { EvaluationDialog } from "@/components/tickets/EvaluationDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tickets/$id")({
  head: () => ({ meta: [{ title: "Detalhe do ticket — Sala do Empreendedor" }] }),
  component: MyTicketDetail,
});

function MyTicketDetail() {
  const { id } = Route.useParams();
  const fetchDetail = useServerFn(getMyTicketDetail);
  const fetchEval = useServerFn(getMyEvaluation);
  const reply = useServerFn(replyMyTicket);
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [busy, setBusy] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-ticket", id],
    queryFn: () => fetchDetail({ data: { id } }),
  });

  const fechado = data ? ["resolvido", "encerrado"].includes(data.ticket.status) : false;

  const { data: evaluation } = useQuery({
    queryKey: ["evaluation", id],
    queryFn: () => fetchEval({ data: { ticket_id: id } }),
    enabled: fechado,
  });

  // Abre automaticamente o NPS se ticket fechou e ainda sem avaliação
  useEffect(() => {
    if (fechado && evaluation === null) setEvalOpen(true);
  }, [fechado, evaluation]);

  const send = async () => {
    if (!message.trim() && anexos.length === 0) return;
    setBusy(true);
    try {
      await reply({ data: { ticket_id: id, mensagem: message.trim() || "(anexo enviado)", anexos } });
      setMessage(""); setAnexos([]);
      qc.invalidateQueries({ queryKey: ["my-ticket", id] });
      toast.success("Mensagem enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Ticket não encontrado.</p>;

  const { ticket, messages } = data;

  return (
    <div className="space-y-6">
      <Link to="/tickets" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{ticket.protocolo}</p>
            <h1 className="mt-1 text-xl font-semibold">{ticket.titulo}</h1>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{ticket.descricao}</p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Conversa com o atendente</h2>
        {messages.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
            Sem mensagens ainda. Assim que um atendente responder, ela aparecerá aqui.
          </p>
        )}
        {messages.map(m => (
          <div
            key={m.id}
            className={`rounded-lg p-3 text-sm ${
              m.papel === "mei" ? "ml-auto max-w-[80%] bg-primary/15" : "mr-auto max-w-[80%] bg-popover"
            }`}
          >
            <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>{m.papel === "mei" ? "você" : "atendente"}</span>
              <span className="ml-auto">{new Date(m.criado_em).toLocaleString("pt-BR")}</span>
            </div>
            <p className="whitespace-pre-wrap">{m.mensagem}</p>
            <AttachmentList anexos={(m.anexos as Anexo[]) ?? []} />
          </div>
        ))}
      </div>

      {!fechado ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Escreva uma mensagem..." rows={3} maxLength={5000} />
          <AttachmentPicker ticketId={id} anexos={anexos} onChange={setAnexos} />
          <div className="flex justify-end">
            <Button onClick={send} disabled={busy || (!message.trim() && anexos.length === 0)} size="sm">
              Enviar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">
            Este ticket está {ticket.status}. Para uma nova solicitação, abra outro pelo chat.
          </p>
          {evaluation ? (
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span>Você avaliou este atendimento com <strong>{evaluation.nota}/10</strong>.</span>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEvalOpen(true)}>
              <Star className="mr-2 h-4 w-4" /> Avaliar atendimento
            </Button>
          )}
        </div>
      )}

      <EvaluationDialog
        ticketId={id}
        open={evalOpen}
        onOpenChange={setEvalOpen}
        onSubmitted={() => qc.invalidateQueries({ queryKey: ["evaluation", id] })}
      />
    </div>
  );
}
