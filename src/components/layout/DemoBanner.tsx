import { useState } from "react";
import { Info, X } from "lucide-react";

export function DemoBanner() {
  const [closed, setClosed] = useState(false);
  if (closed) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 border-b border-warning/40 bg-warning/10 px-4 py-2 text-xs text-warning"
    >
      <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="flex-1 text-warning-foreground/90">
        <strong className="font-semibold">Modo demonstração ativo</strong>
        <span className="ml-1 text-muted-foreground">— dados simulados para testes</span>
      </span>
      <button
        type="button"
        onClick={() => setClosed(true)}
        aria-label="Fechar aviso de modo demonstração"
        className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
