import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitEvaluation } from "@/lib/evaluations.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  ticketId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmitted?: () => void;
}

export function EvaluationDialog({ ticketId, open, onOpenChange, onSubmitted }: Props) {
  const submit = useServerFn(submitEvaluation);
  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (nota === null) {
      toast.error("Escolha uma nota de 0 a 10.");
      return;
    }
    setLoading(true);
    try {
      await submit({ data: { ticket_id: ticketId, nota, comentario: comentario || undefined } });
      toast.success("Obrigado pela avaliação!");
      onSubmitted?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao enviar avaliação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Como foi o atendimento?</DialogTitle>
          <DialogDescription>
            De 0 a 10, qual a chance de você recomendar este atendimento a outro MEI?
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-11 gap-1 my-4">
          {Array.from({ length: 11 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setNota(i)}
              className={`h-10 rounded border text-sm font-medium transition ${
                nota === i ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
              }`}
            >
              {i}
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Comentário (opcional)"
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          maxLength={1000}
          rows={3}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Agora não</Button>
          <Button onClick={handleSubmit} disabled={loading}>Enviar avaliação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
