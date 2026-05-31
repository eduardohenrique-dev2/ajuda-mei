import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ThumbsUp, ThumbsDown, MessageCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/lib/use-analytics";

type Props = {
  solutionId: string;
  /** Para usuários não autenticados, mostramos um CTA para o cadastro/chat público. */
  variant?: "auth" | "public";
};

/**
 * "Resolveu sua dúvida?" — feedback rápido de cada solução.
 * Sim → agradece. Não → CTA para abrir atendimento.
 */
export function SolutionFeedback({ solutionId, variant = "auth" }: Props) {
  const { track } = useAnalytics();
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);

  const handle = (value: "yes" | "no") => {
    if (answer) return;
    setAnswer(value);
    track(value === "yes" ? "solution_helpful_yes" : "solution_helpful_no", {
      solution_id: solutionId,
    });
  };

  if (answer === "yes") {
    return (
      <div
        role="status"
        className="mt-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary"
      >
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        Obrigado pelo retorno!
      </div>
    );
  }

  if (answer === "no") {
    return (
      <div className="mt-4 rounded-lg border border-warning/40 bg-warning/5 p-3">
        <p className="text-xs text-foreground">Quer ajuda de um atendente?</p>
        {variant === "auth" ? (
          <Button asChild size="sm" className="mt-2 h-9 w-full">
            <Link to="/tickets" search={{ open: "1" } as never}>
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Abrir atendimento
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" className="mt-2 h-9 w-full">
            <Link to="/cadastro">
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Criar conta e abrir atendimento
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
      <span className="text-xs text-muted-foreground">Resolveu sua dúvida?</span>
      <Button
        size="sm"
        variant="outline"
        className="h-8 px-2"
        onClick={() => handle("yes")}
        aria-label="Sim, resolveu minha dúvida"
      >
        <ThumbsUp className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
        Sim
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 px-2"
        onClick={() => handle("no")}
        aria-label="Não, ainda preciso de ajuda"
      >
        <ThumbsDown className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
        Não
      </Button>
    </div>
  );
}
