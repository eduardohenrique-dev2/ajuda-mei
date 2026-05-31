import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { listSolutions } from "@/lib/solutions.functions";
import { ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicHeader, PublicFooter } from "@/components/layout/PublicHeader";
import { useAnalytics, usePageView } from "@/lib/use-analytics";
import { passoText } from "@/lib/render-helpers";
import { SolutionFilterChips, applyQuickFilter } from "@/components/solutions/SolutionFilterChips";
import { SolutionFeedback } from "@/components/solutions/SolutionFeedback";

export const Route = createFileRoute("/solucoes")({
  head: () => ({
    meta: [
      { title: "Soluções para MEI — Sala do Empreendedor" },
      { name: "description", content: "Procedimentos oficiais passo a passo: DAS, declaração anual, regularização e mais. Acesso público." },
      { property: "og:title", content: "Soluções para MEI" },
      { property: "og:description", content: "Procedimentos oficiais para o Microempreendedor Individual." },
    ],
  }),
  component: PublicSolutionsPage,
});

function PublicSolutionsPage() {
  usePageView({ area: "public_solucoes" });
  const { track } = useAnalytics();
  const list = useServerFn(listSolutions);
  const { data, isLoading } = useQuery({ queryKey: ["public-solutions"], queryFn: () => list() });
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let all = applyQuickFilter(data ?? [], activeFilter);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      all = all.filter(s =>
        s.titulo.toLowerCase().includes(needle) ||
        s.descricao.toLowerCase().includes(needle) ||
        (s.tags ?? []).some((t: string) => t.toLowerCase().includes(needle))
      );
    }
    return all;
  }, [data, q, activeFilter]);

  const onSearch = (v: string) => {
    setQ(v);
    if (v.length >= 3) track("search", { query: v, area: "solucoes" });
  };

  const onFilter = (id: string | null) => {
    setActiveFilter(id);
    if (id) track("solution_filter", { filter: id, area: "solucoes" });
  };


  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader />

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight">Soluções para o MEI</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Acesso livre. Procure por tema (DAS, declaração, regularização…).
            </p>
          </div>

          <div className="relative mt-6 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q} onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar solução..."
              className="pl-9"
              aria-label="Buscar soluções"
            />
          </div>

          <SolutionFilterChips active={activeFilter} onChange={onFilter} />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="mt-3 h-5 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-full" />
                  <Skeleton className="mt-1 h-4 w-2/3" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="md:col-span-2 rounded-xl border border-dashed border-border p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  {q || activeFilter
                    ? "Nenhuma solução encontrada com esses filtros."
                    : "Nenhuma solução publicada ainda."}
                </p>
              </div>
            ) : (
              filtered.map(s => (
                <article key={s.id} className="rounded-xl border border-border bg-card p-5">
                  <span className="inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium capitalize text-primary">
                    {String(s.categoria).replace(/_/g, " ")}
                  </span>
                  <h3 className="mt-3 font-medium">{s.titulo}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{s.descricao}</p>
                  {Array.isArray(s.passo_a_passo) && s.passo_a_passo.length > 0 && (
                    <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                      {(s.passo_a_passo as unknown[]).slice(0, 3).map((p, i) => {
                        const txt = passoText(p);
                        return txt ? <li key={i}>{txt}</li> : null;
                      })}
                    </ol>
                  )}
                  {s.link_oficial && (
                    <a href={s.link_oficial} target="_blank" rel="noreferrer"
                       onClick={() => track("link_click", { solution_id: s.id, url: s.link_oficial })}
                       className="mt-3 inline-flex items-center gap-1 text-sm text-info hover:underline">
                      Link oficial <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <SolutionFeedback solutionId={s.id} variant="public" />
                </article>
              ))
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
