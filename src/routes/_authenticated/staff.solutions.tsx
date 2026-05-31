import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { listSolutions, createSolution, updateSolution, deleteSolution } from "@/lib/solutions.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff/solutions")({
  head: () => ({ meta: [{ title: "Soluções — Atendimento" }] }),
  component: StaffSolutionsPage,
});

const CATEGORIAS = [
  "declaracao_anual","das","parcelamento","regularizacao",
  "funcionarios","notas_fiscais","cadastro","pendencias",
  "outros_setores","outros",
] as const;

type Editing = {
  id?: string;
  titulo: string;
  categoria: string;
  descricao: string;
  passo_a_passo: string[];
  link_oficial: string;
  tags: string[];
};

const empty: Editing = {
  titulo: "", categoria: "das", descricao: "",
  passo_a_passo: [""], link_oficial: "", tags: [],
};

function StaffSolutionsPage() {
  const list = useServerFn(listSolutions);
  const create = useServerFn(createSolution);
  const update = useServerFn(updateSolution);
  const del = useServerFn(deleteSolution);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["solutions"], queryFn: () => list() });

  const [editor, setEditor] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const save = async () => {
    if (!editor) return;
    setBusy(true);
    try {
      const payload = {
        titulo: editor.titulo,
        categoria: editor.categoria as any,
        descricao: editor.descricao,
        passo_a_passo: editor.passo_a_passo.map(s => s.trim()).filter(Boolean),
        link_oficial: editor.link_oficial || undefined,
        tags: editor.tags,
      };
      if (editor.id) {
        await update({ data: { id: editor.id, ...payload } });
        toast.success("Solução atualizada");
      } else {
        await create({ data: payload });
        toast.success("Solução criada");
      }
      qc.invalidateQueries({ queryKey: ["solutions"] });
      setEditor(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Desativar esta solução?")) return;
    try {
      await del({ data: { id } });
      qc.invalidateQueries({ queryKey: ["solutions"] });
      toast.success("Solução removida");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Base de soluções</h1>
          <p className="mt-1 text-sm text-muted-foreground">Conteúdos buscados pelo chat via embedding.</p>
        </div>
        <Button onClick={() => setEditor({ ...empty })}>
          <Plus className="mr-2 h-4 w-4" /> Nova solução
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(data ?? []).map(s => (
            <article key={s.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
                    {s.categoria}
                  </span>
                  <h3 className="mt-2 font-medium">{s.titulo}</h3>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditor({
                    id: s.id, titulo: s.titulo, categoria: s.categoria,
                    descricao: s.descricao,
                    passo_a_passo: ((s.passo_a_passo as string[]) ?? []).length ? (s.passo_a_passo as string[]) : [""],
                    link_oficial: s.link_oficial ?? "",
                    tags: s.tags ?? [],
                  })} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => remove(s.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{s.descricao}</p>
            </article>
          ))}
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editor.id ? "Editar solução" : "Nova solução"}</h2>
              <button onClick={() => setEditor(null)} className="rounded p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={editor.titulo} onChange={e => setEditor({ ...editor, titulo: e.target.value })} maxLength={200} />
              </div>
              <div>
                <Label>Categoria</Label>
                <select
                  value={editor.categoria}
                  onChange={e => setEditor({ ...editor, categoria: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={editor.descricao} onChange={e => setEditor({ ...editor, descricao: e.target.value })} rows={3} maxLength={5000} />
              </div>
              <div>
                <Label>Passo a passo</Label>
                <div className="mt-1 space-y-2">
                  {editor.passo_a_passo.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={p}
                        onChange={e => {
                          const arr = [...editor.passo_a_passo]; arr[i] = e.target.value;
                          setEditor({ ...editor, passo_a_passo: arr });
                        }}
                        placeholder={`Passo ${i + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => setEditor({ ...editor, passo_a_passo: editor.passo_a_passo.filter((_, j) => j !== i) })}
                        className="rounded px-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditor({ ...editor, passo_a_passo: [...editor.passo_a_passo, ""] })}>
                    + Passo
                  </Button>
                </div>
              </div>
              <div>
                <Label>Link oficial</Label>
                <Input
                  value={editor.link_oficial}
                  onChange={e => setEditor({ ...editor, link_oficial: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Tags</Label>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-2">
                  {editor.tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                      {t}
                      <button type="button" onClick={() => setEditor({ ...editor, tags: editor.tags.filter(x => x !== t) })}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && tagInput.trim()) {
                        e.preventDefault();
                        setEditor({ ...editor, tags: [...new Set([...editor.tags, tagInput.trim()])] });
                        setTagInput("");
                      }
                    }}
                    className="flex-1 bg-transparent text-sm outline-none"
                    placeholder="Digite e Enter..."
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditor(null)}>Cancelar</Button>
              <Button onClick={save} disabled={busy || !editor.titulo.trim() || !editor.descricao.trim()}>
                {busy ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
