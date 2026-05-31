import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSolutions } from "@/lib/solutions.functions";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/solutions")({
  head: () => ({ meta: [{ title: "Base de soluções — Sala do Empreendedor" }] }),
  component: SolutionsPage,
});

function SolutionsPage() {
  const list = useServerFn(listSolutions);
  const { data, isLoading } = useQuery({ queryKey: ["solutions"], queryFn: () => list() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Base de soluções</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Respostas oficiais e procedimentos passo a passo. Use o chat para buscar pelo sentido.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma solução publicada ainda. Atendentes podem cadastrar a partir do painel interno.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data!.map(s => (
            <article key={s.id} className="rounded-xl border border-border bg-card p-5">
              <span className="inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                {s.categoria}
              </span>
              <h3 className="mt-3 font-medium">{s.titulo}</h3>
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{s.descricao}</p>
              {Array.isArray(s.passo_a_passo) && s.passo_a_passo.length > 0 && (
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  {(s.passo_a_passo as string[]).slice(0, 3).map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ol>
              )}
              {s.link_oficial && (
                <a href={s.link_oficial} target="_blank" rel="noreferrer"
                   className="mt-3 inline-flex items-center gap-1 text-sm text-info hover:underline">
                  Link oficial <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
