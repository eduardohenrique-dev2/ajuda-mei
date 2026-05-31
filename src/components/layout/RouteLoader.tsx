export function RouteLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando conteúdo"
      className="flex min-h-[40vh] items-center justify-center p-6"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs text-muted-foreground">Carregando…</span>
      </div>
    </div>
  );
}
