import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { FileText, CheckCircle2, XCircle, Download, Loader2, RefreshCw, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useAnalytics, usePageView } from "@/lib/use-analytics";
import { STATUS_LABEL, DOCUMENT_TYPES, formatBytes } from "@/lib/document-extract";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff/documentos")({
  component: StaffDocumentos,
  head: () => ({ meta: [{ title: "Revisão de documentos | Sala do Empreendedor" }] }),
});

type DocRow = {
  id: string;
  user_id: string;
  tipo: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  status: string;
  mime_type: string;
  ocr_text: string | null;
  extracted_fields: Record<string, unknown>;
  rejection_reason: string | null;
  created_at: string;
};

type Stats = {
  enviados: number;
  pendentes_revisao: number;
  aprovados: number;
  rejeitados: number;
  taxa_aprovacao: number;
  tempo_medio_validacao_min: number;
  por_tipo: Record<string, number>;
};

function typeLabel(t: string) {
  return DOCUMENT_TYPES.find((d) => d.value === t)?.label ?? t;
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function StaffDocumentos() {
  usePageView();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const [docs, setDocs] = useState<DocRow[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [active, setActive] = useState<DocRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: docsData }, { data: statsData }] = await Promise.all([
      supabase
        .from("documents")
        .select("id,user_id,tipo,file_name,file_path,file_size_bytes,status,mime_type,ocr_text,extracted_fields,rejection_reason,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.rpc("get_document_stats", { _days: 30 }),
    ]);
    setDocs((docsData ?? []) as DocRow[]);
    setStats((statsData as Stats) ?? null);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openReview = async (d: DocRow) => {
    setActive(d);
    setReason("");
    setPreviewUrl(null);
    const { data } = await supabase.storage.from("documents").createSignedUrl(d.file_path, 120);
    if (data?.signedUrl) setPreviewUrl(data.signedUrl);
  };

  const decide = async (decision: "approved" | "rejected") => {
    if (!active || !user) return;
    if (decision === "rejected" && !reason.trim()) {
      toast.error("Informe o motivo da rejeição.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("documents")
        .update({
          status: decision,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: decision === "rejected" ? reason.trim() : null,
        })
        .eq("id", active.id);
      if (error) throw error;
      track("document_reviewed", { decision, tipo: active.tipo });
      track(decision === "approved" ? "document_approved" : "document_rejected", { tipo: active.tipo });
      toast.success(decision === "approved" ? "Documento aprovado." : "Documento rejeitado.");
      setActive(null);
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao salvar revisão.");
    } finally {
      setBusy(false);
    }
  };

  const topTipos = stats?.por_tipo
    ? Object.entries(stats.por_tipo).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Revisão de documentos</h1>
          <p className="text-sm text-muted-foreground">Métricas dos últimos 30 dias e fila de validação humana.</p>
        </div>
        <Button variant="outline" onClick={load} className="min-h-11">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Atualizar
        </Button>
      </header>

      <section aria-label="Métricas" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats ? (
          <>
            <Metric label="Enviados (30d)" value={stats.enviados} />
            <Metric label="Aguardando revisão" value={stats.pendentes_revisao} hint="Fila atual" />
            <Metric label="Taxa de aprovação" value={`${stats.taxa_aprovacao}%`} />
            <Metric label="Tempo médio validação" value={`${stats.tempo_medio_validacao_min} min`} />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        )}
      </section>

      {topTipos.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold">Tipos mais enviados</h2>
          <ul className="flex flex-wrap gap-2">
            {topTipos.map(([t, n]) => (
              <li key={t}>
                <Badge variant="secondary">{typeLabel(t)} · {n}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section aria-labelledby="fila">
        <h2 id="fila" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Fila de documentos
        </h2>
        {docs === null ? (
          <div className="grid gap-2">
            <Skeleton className="h-16" /><Skeleton className="h-16" />
          </div>
        ) : docs.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum documento enviado ainda.</Card>
        ) : (
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id}>
                <Card className="flex flex-wrap items-center gap-3 p-3">
                  <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabel(d.tipo)} · {formatBytes(d.file_size_bytes)} ·{" "}
                      {new Date(d.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Badge
                    variant={
                      d.status === "approved" ? "default"
                        : d.status === "rejected" ? "destructive"
                          : "secondary"
                    }
                  >
                    {STATUS_LABEL[d.status] ?? d.status}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => openReview(d)} className="min-h-9">
                    <Eye className="mr-2 h-4 w-4" aria-hidden="true" /> Revisar
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={!!active} onOpenChange={(o) => { if (!o) setActive(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{active?.file_name}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{typeLabel(active.tipo)}</Badge>
                <Badge variant="outline">{formatBytes(active.file_size_bytes)}</Badge>
                <Badge variant="outline">{active.mime_type}</Badge>
              </div>

              <div className="overflow-hidden rounded border bg-muted/40">
                {previewUrl && active.mime_type.startsWith("image/") ? (
                  <img src={previewUrl} alt="Documento enviado" className="mx-auto max-h-[420px] w-auto object-contain" />
                ) : previewUrl ? (
                  <iframe src={previewUrl} title="Pré-visualização" className="h-[420px] w-full" />
                ) : (
                  <div className="flex items-center justify-center p-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  </div>
                )}
              </div>

              {previewUrl && (
                <Button asChild size="sm" variant="outline">
                  <a href={previewUrl} target="_blank" rel="noopener">
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" /> Abrir em nova aba
                  </a>
                </Button>
              )}

              {active.extracted_fields && Object.keys(active.extracted_fields).length > 0 && (
                <div className="rounded-md border p-3 text-sm">
                  <p className="mb-1 font-medium">Campos extraídos pelo OCR</p>
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                    {JSON.stringify(active.extracted_fields, null, 2)}
                  </pre>
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="rej-reason" className="text-sm font-medium">Motivo (obrigatório para rejeitar)</label>
                <Textarea
                  id="rej-reason"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex.: imagem ilegível, documento expirado…"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActive(null)} disabled={busy}>Cancelar</Button>
            <Button variant="destructive" onClick={() => decide("rejected")} disabled={busy}>
              <XCircle className="mr-2 h-4 w-4" aria-hidden="true" /> Rejeitar
            </Button>
            <Button onClick={() => decide("approved")} disabled={busy}>
              <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" /> Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
