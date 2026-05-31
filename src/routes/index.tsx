import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Search, FileText, ShieldCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sala do Empreendedor — Atendimento ao MEI" },
      { name: "description", content: "Tire dúvidas sobre DAS, declaração anual, regularização e mais. Atendimento humano e inteligente para o MEI." },
      { property: "og:title", content: "Sala do Empreendedor — Atendimento ao MEI" },
      { property: "og:description", content: "Atendimento humano e inteligente para o Microempreendedor Individual." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-card/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-bold">
              SE
            </div>
            <span className="font-semibold tracking-tight">Sala do Empreendedor</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/login" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              Entrar
            </Link>
            <Link to="/cadastro" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
              Cadastrar
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Plataforma oficial da Sala do Empreendedor
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
                Tire dúvidas sobre o seu MEI <span className="text-primary">em minutos</span>.
              </h1>
              <p className="mt-5 max-w-lg text-muted-foreground">
                Atendimento humano e inteligente para pagar DAS, fazer declaração anual,
                regularizar pendências e mais. Sem filas, sem burocracia.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/cadastro" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
                  Começar agora <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/login" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-accent">
                  Já tenho cadastro
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                { icon: MessageCircle, title: "Chat 24h", desc: "Pergunte e receba resposta da nossa base oficial." },
                { icon: Search, title: "Busca inteligente", desc: "Encontre soluções por sentido, não só palavra-chave." },
                { icon: FileText, title: "Protocolo digital", desc: "Acompanhe seu atendimento pelo número do protocolo." },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Sala do Empreendedor · Atendimento ao MEI
      </footer>
    </div>
  );
}
