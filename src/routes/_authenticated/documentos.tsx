import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { FileText, Download, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { usePageView } from "@/lib/use-analytics";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { STATUS_LABEL, DOCUMENT_TYPES, formatBytes } from "@/lib/document-extract";

export const Route = createFileRoute("/_authenticated/documentos")({
  component: DocumentosPage,
  head: () => ({ meta: [{ title: "Meus documentos | Sala do Empreendedor" }] }),
});

type DocRow = {
  id: string;
  tipo: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  status: string;
  version: number;
  rejection_reason: string | null;
  created_at: string;
};

const statusIcon: Record<string, React.ReactNode> = {
  uploaded: <Clock className="h-3 w-3" aria-hidden="true" />,
  processing: <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />,
  pending_review: <Clock className="h-3 w-3" aria-hidden="true" />,
  approved: <CheckCircle2 className="h-3 w-3" aria-hidden="true" />,
  rejected: <XCircle className="h-3 w-3" aria-hidden="true" />,
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  rejected: "destructive",
  pending_review: "secondary",
  processing: "outline",
  uploaded: "outline",
};

function typeLabel(t: string) {
  return DOCUMENT_TYPES.find((d) => d.value === t)?.label ?? t;
}

function DocumentosPage() {
  usePageView();
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocRow[] | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("documents")
      .select("id,tipo,file_name,file_path,file_size_bytes,status,version,rejection_reason,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setDocs((data ?? []) as DocRow[]);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const download = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (error || !data) return;
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Meus documentos</h1>
        <p className="text-sm text-muted-foreground">
          Envie cópias digitais. Você pode anexar arquivos prontos, fotos ou digitalizar com a câmera.
          Toda análise é feita por uma pessoa do atendimento.
        </p>
      </header>

      <DocumentUploader onUploaded={load} />

      <section aria-labelledby="docs-list">
        <h2 id="docs-list" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Histórico
        </h2>
        {docs === null ? (
          <div className="grid gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : docs.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Você ainda não enviou documentos. Use o formulário acima para começar.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id}>
                <Card className="flex flex-wrap items-center gap-3 p-3">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabel(d.tipo)} · v{d.version} · {formatBytes(d.file_size_bytes)} ·{" "}
                      {new Date(d.created_at).toLocaleString("pt-BR")}
                    </p>
                    {d.status === "rejected" && d.rejection_reason && (
                      <p className="mt-1 text-xs text-destructive">Motivo: {d.rejection_reason}</p>
                    )}
                  </div>
                  <Badge variant={statusVariant[d.status] ?? "outline"} className="gap-1">
                    {statusIcon[d.status]} {STATUS_LABEL[d.status] ?? d.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => download(d.file_path, d.file_name)}
                    className="min-h-9"
                  >
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" /> Baixar
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
