import { useCallback, useRef, useState } from "react";
import { Upload, Camera, RotateCw, FileText, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useAnalytics } from "@/lib/use-analytics";
import { extractFields, formatBytes, DOCUMENT_TYPES, type ExtractedFields } from "@/lib/document-extract";

type Props = {
  ticketId?: string;
  protocolId?: string;
  onUploaded?: () => void;
};

const ACCEPT = "image/png,image/jpeg,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", quality)
  );
}

async function rotateImage(file: Blob, degrees: number): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const rad = (degrees * Math.PI) / 180;
  const swap = degrees % 180 !== 0;
  const w = swap ? img.height : img.width;
  const h = swap ? img.width : img.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
  );
}

export function DocumentUploader({ ticketId, protocolId, onUploaded }: Props) {
  const { user } = useAuth();
  const { track } = useAnalytics();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<{ blob: Blob; name: string; type: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tipo, setTipo] = useState("outro");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrText, setOcrText] = useState("");
  const [fields, setFields] = useState<ExtractedFields>({});
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setOcrText("");
    setFields({});
    setOcrProgress(0);
  };

  const acceptFile = useCallback(async (f: File) => {
    if (f.size > MAX_BYTES) {
      toast.error("Arquivo grande demais (limite 10MB).");
      return;
    }
    if (!ACCEPT.split(",").includes(f.type)) {
      toast.error("Formato não suportado. Use PDF, JPG ou PNG.");
      return;
    }
    let blob: Blob = f;
    if (f.type.startsWith("image/")) {
      try {
        blob = await compressImage(f);
      } catch {
        // segue com original
      }
    }
    const url = URL.createObjectURL(blob);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile({ blob, name: f.name, type: blob.type });
    setPreviewUrl(url);
    setOcrText("");
    setFields({});
  }, [previewUrl]);

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const handleRotate = async () => {
    if (!file || !file.type.startsWith("image/")) return;
    const rotated = await rotateImage(file.blob, 90);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(rotated);
    setFile({ ...file, blob: rotated, type: "image/jpeg" });
    setPreviewUrl(url);
  };

  const runOCR = async () => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.info("OCR automático disponível apenas para imagens. Preencha os campos manualmente.");
      return;
    }
    setOcrLoading(true);
    setOcrProgress(0);
    try {
      const tesseract = await import("tesseract.js");
      const { data } = await tesseract.recognize(file.blob, "por", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") setOcrProgress(Math.round(m.progress * 100));
        },
      });
      const text = data.text ?? "";
      setOcrText(text);
      const extracted = extractFields(text);
      setFields(extracted);
      track("ocr_completed", { tipo, chars: text.length });
      toast.success("Texto extraído. Revise os campos antes de salvar.");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível extrair o texto. Preencha manualmente.");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const docId = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${docId}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file.blob, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("documents").insert({
        id: docId,
        user_id: user.id,
        ticket_id: ticketId ?? null,
        protocol_id: protocolId ?? null,
        tipo,
        file_name: safeName,
        file_path: path,
        mime_type: file.type,
        file_size_bytes: file.blob.size,
        ocr_text: ocrText || null,
        extracted_fields: fields as never,
        status: "pending_review",
      });
      if (insErr) throw insErr;

      track("document_upload", { tipo, ticket_id: ticketId, has_ocr: !!ocrText });
      toast.success("Documento enviado. Aguardando revisão.");
      reset();
      onUploaded?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Falha ao enviar documento.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-4 md:p-6">
      {!file && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition ${
            dragOver ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <Upload className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-medium">Envie um documento</p>
            <p className="text-sm text-muted-foreground">
              Arraste aqui, escolha do dispositivo ou tire uma foto. PDF, JPG ou PNG até 10MB.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => fileInputRef.current?.click()} className="min-h-11">
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" /> Escolher arquivo
            </Button>
            <Button
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              className="min-h-11"
            >
              <Camera className="mr-2 h-4 w-4" aria-hidden="true" /> Tirar foto
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={onSelect}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={onSelect}
          />
        </div>
      )}

      {file && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {file.type} · {formatBytes(file.blob.size)}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={reset} aria-label="Remover arquivo">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="overflow-hidden rounded-md border bg-muted/40">
            {file.type.startsWith("image/") && previewUrl ? (
              <img
                src={previewUrl}
                alt="Pré-visualização do documento"
                className="mx-auto max-h-[420px] w-auto object-contain"
              />
            ) : (
              <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
                <FileText className="h-6 w-6" aria-hidden="true" />
                <span className="text-sm">Pré-visualização indisponível para PDF.</span>
              </div>
            )}
          </div>

          {file.type.startsWith("image/") && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleRotate} className="min-h-11">
                <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" /> Girar 90°
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={runOCR}
                disabled={ocrLoading}
                className="min-h-11"
              >
                {ocrLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Extrair texto (OCR)
              </Button>
            </div>
          )}

          {ocrLoading && (
            <div role="status" aria-live="polite" className="space-y-1">
              <Progress value={ocrProgress} />
              <p className="text-xs text-muted-foreground">Lendo o documento… {ocrProgress}%</p>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="doc-tipo">Tipo de documento</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger id="doc-tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="doc-nome">Nome (opcional)</Label>
              <Input
                id="doc-nome"
                value={fields.nome ?? ""}
                onChange={(e) => setFields({ ...fields, nome: e.target.value })}
                placeholder="Ex.: Maria da Silva"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="doc-cpf">CPF (opcional)</Label>
              <Input
                id="doc-cpf"
                value={fields.cpf ?? ""}
                onChange={(e) => setFields({ ...fields, cpf: e.target.value })}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="doc-cnpj">CNPJ (opcional)</Label>
              <Input
                id="doc-cnpj"
                value={fields.cnpj ?? ""}
                onChange={(e) => setFields({ ...fields, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="doc-protocolos">Protocolos / datas detectados</Label>
              <Input
                id="doc-protocolos"
                value={[...(fields.protocolos ?? []), ...(fields.datas ?? [])].join(", ")}
                onChange={(e) => {
                  const parts = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                  setFields({
                    ...fields,
                    protocolos: parts.filter((p) => /[A-Z]/i.test(p)),
                    datas: parts.filter((p) => /^\d{2}\/\d{2}\/\d{4}$/.test(p)),
                  });
                }}
                placeholder="Será preenchido após o OCR"
              />
            </div>
            {ocrText && (
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="doc-ocr">Texto extraído (revise antes de salvar)</Label>
                <Textarea
                  id="doc-ocr"
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                  rows={5}
                  className="font-mono text-xs"
                />
              </div>
            )}
          </div>

          <div role="note" className="rounded-md border border-amber-500/30 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            O OCR é uma sugestão automática. Revise os campos — toda validação final é feita por uma pessoa do atendimento.
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={reset} className="min-h-11">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={uploading} className="min-h-11">
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Enviar para revisão
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
