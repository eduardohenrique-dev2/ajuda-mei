import { useRef, useState } from "react";
import { Paperclip, X, FileIcon, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Anexo = { path: string; name: string; size: number; mime?: string };

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export function AttachmentPicker({
  ticketId, anexos, onChange,
}: { ticketId: string; anexos: Anexo[]; onChange: (a: Anexo[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo maior que 10 MB");
      return;
    }
    setBusy(true);
    try {
      const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
      const path = `${ticketId}/${crypto.randomUUID()}-${safe}`;
      const { error } = await supabase.storage
        .from("ticket-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      onChange([...anexos, { path, name: file.name, size: file.size, mime: file.type }]);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha no upload");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: Anexo) => {
    await supabase.storage.from("ticket-attachments").remove([a.path]).catch(() => {});
    onChange(anexos.filter(x => x.path !== a.path));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {anexos.map(a => (
          <div key={a.path} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs">
            <FileIcon className="h-3 w-3 text-muted-foreground" />
            <span className="max-w-[160px] truncate">{a.name}</span>
            <button type="button" onClick={() => remove(a)} className="text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
        Anexar arquivo (até 10 MB)
      </button>
      <input ref={inputRef} type="file" hidden onChange={onPick} />
    </div>
  );
}

export function AttachmentList({ anexos }: { anexos: Anexo[] }) {
  if (!anexos || anexos.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {anexos.map(a => <AttachmentLink key={a.path} anexo={a} />)}
    </div>
  );
}

function AttachmentLink({ anexo }: { anexo: Anexo }) {
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.storage
        .from("ticket-attachments")
        .createSignedUrl(anexo.path, 600);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao abrir");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs hover:border-primary"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
      <span className="max-w-[180px] truncate">{anexo.name}</span>
      <span className="text-muted-foreground">{formatSize(anexo.size)}</span>
    </button>
  );
}

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
