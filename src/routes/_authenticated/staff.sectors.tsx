import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { listSectors, upsertSector, deleteSector } from "@/lib/sectors.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff/sectors")({
  head: () => ({ meta: [{ title: "Setores — Atendimento" }] }),
  component: SectorsPage,
});

type Sector = {
  id: string; nome: string; categoria: string; descricao: string | null;
  telefone: string | null; email: string | null; endereco: string | null;
  horario: string | null; site: string | null; palavras_chave: string[]; ativo: boolean;
};

function SectorsPage() {
  const list = useServerFn(listSectors);
  const save = useServerFn(upsertSector);
  const remove = useServerFn(deleteSector);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Sector> | null>(null);

  const { data: sectors, isLoading } = useQuery({ queryKey: ["sectors"], queryFn: () => list() });

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await save({ data: {
        id: editing.id,
        nome: editing.nome ?? "",
        categoria: editing.categoria ?? "",
        descricao: editing.descricao ?? "",
        telefone: editing.telefone ?? "",
        email: editing.email ?? "",
        endereco: editing.endereco ?? "",
        horario: editing.horario ?? "",
        site: editing.site ?? "",
        palavras_chave: editing.palavras_chave ?? [],
        ativo: editing.ativo ?? true,
      }});
      toast.success("Setor salvo");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["sectors"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Remover este setor?")) return;
    try {
      await remove({ data: { id } });
      qc.invalidateQueries({ queryKey: ["sectors"] });
      toast.success("Removido");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Setores</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pontos de atendimento e órgãos parceiros.</p>
        </div>
        <Button onClick={() => setEditing({ ativo: true, palavras_chave: [] })}>
          <Plus className="mr-2 h-4 w-4" /> Novo setor
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
        ) : (sectors ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhum setor cadastrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Contato</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody>
              {(sectors as Sector[]).map(s => (
                <tr key={s.id} className="border-t border-border hover:bg-card/40">
                  <td className="px-4 py-3 font-medium">{s.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.categoria}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{s.telefone || s.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-[10px] ${s.ativo ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {s.ativo ? "ativo" : "inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditing(s)} className="mr-2 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => onDelete(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur">
          <form onSubmit={onSave} className="w-full max-w-lg space-y-3 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{editing.id ? "Editar setor" : "Novo setor"}</h2>
              <button type="button" onClick={() => setEditing(null)}><X className="h-4 w-4" /></button>
            </div>
            <Input label="Nome *" value={editing.nome ?? ""} onChange={v => setEditing({ ...editing, nome: v })} required />
            <Input label="Categoria *" value={editing.categoria ?? ""} onChange={v => setEditing({ ...editing, categoria: v })} required placeholder="ex: das, cadastro, regularizacao" />
            <TextArea label="Descrição" value={editing.descricao ?? ""} onChange={v => setEditing({ ...editing, descricao: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Telefone" value={editing.telefone ?? ""} onChange={v => setEditing({ ...editing, telefone: v })} />
              <Input label="E-mail" value={editing.email ?? ""} onChange={v => setEditing({ ...editing, email: v })} />
              <Input label="Horário" value={editing.horario ?? ""} onChange={v => setEditing({ ...editing, horario: v })} />
              <Input label="Site" value={editing.site ?? ""} onChange={v => setEditing({ ...editing, site: v })} />
            </div>
            <Input label="Endereço" value={editing.endereco ?? ""} onChange={v => setEditing({ ...editing, endereco: v })} />
            <Input
              label="Palavras-chave (separe por vírgula)"
              value={(editing.palavras_chave ?? []).join(", ")}
              onChange={v => setEditing({ ...editing, palavras_chave: v.split(",").map(s => s.trim()).filter(Boolean) })}
            />
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={editing.ativo ?? true} onChange={e => setEditing({ ...editing, ativo: e.target.checked })} />
              Ativo
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" {...rest} />
    </label>
  );
}
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
    </label>
  );
}
