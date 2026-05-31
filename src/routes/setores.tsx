import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSectorsPublic } from "@/lib/sectors-public.functions";
import { Phone, Mail, MapPin, Clock, ExternalLink, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicHeader, PublicFooter } from "@/components/layout/PublicHeader";
import { usePageView, useAnalytics } from "@/lib/use-analytics";

export const Route = createFileRoute("/setores")({
  head: () => ({
    meta: [
      { title: "Setores e órgãos parceiros — Sala do Empreendedor" },
      { name: "description", content: "Contatos oficiais dos setores que atendem o MEI: tributos, vigilância, desenvolvimento econômico e mais." },
      { property: "og:title", content: "Setores parceiros" },
      { property: "og:description", content: "Contatos oficiais dos setores que atendem o MEI." },
    ],
  }),
  component: PublicSectorsPage,
});

function PublicSectorsPage() {
  usePageView({ area: "public_setores" });
  const { track } = useAnalytics();
  const list = useServerFn(listSectorsPublic);
  const { data, isLoading } = useQuery({ queryKey: ["public-sectors"], queryFn: () => list() });

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight">Setores e órgãos parceiros</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Contatos oficiais para cada tipo de atendimento. Acesso livre.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-1 h-4 w-2/3" />
                </div>
              ))
            ) : (data ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center sm:col-span-2 lg:col-span-3">
                <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Nenhum setor cadastrado ainda.</p>
              </div>
            ) : (
              data!.map(s => (
                <article key={s.id} className="rounded-xl border border-border bg-card p-5">
                  <span className="inline-flex rounded-full bg-info/15 px-2 py-0.5 text-xs font-medium capitalize text-info">
                    {s.categoria}
                  </span>
                  <h3 className="mt-3 font-medium">{s.nome}</h3>
                  {s.descricao && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{s.descricao}</p>}
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {s.telefone && <li className="flex items-start gap-2"><Phone className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" /><a href={`tel:${s.telefone}`} className="hover:underline">{s.telefone}</a></li>}
                    {s.email && <li className="flex items-start gap-2"><Mail className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" /><a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a></li>}
                    {s.endereco && <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">{s.endereco}</span></li>}
                    {s.horario && <li className="flex items-start gap-2"><Clock className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">{s.horario}</span></li>}
                    {s.site && <li className="flex items-start gap-2"><ExternalLink className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" /><a href={s.site} target="_blank" rel="noreferrer" onClick={() => track("link_click", { sector_id: s.id, url: s.site })} className="text-info hover:underline">Site oficial</a></li>}
                  </ul>
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
