import { Link } from "@tanstack/react-router";

export function PublicHeader() {
  return (
    <header className="border-b border-border/60 bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-card/30">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground text-sm font-bold">SE</div>
          <span className="hidden font-semibold tracking-tight sm:inline">Sala do Empreendedor</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/solucoes" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>Soluções</Link>
          <Link to="/setores" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>Setores</Link>
          <Link to="/login" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground">Entrar</Link>
          <Link to="/cadastro" className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90">Cadastrar</Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} Sala do Empreendedor · Atendimento ao MEI
    </footer>
  );
}
