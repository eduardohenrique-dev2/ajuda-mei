import { Skeleton } from "@/components/ui/skeleton";

export function FullPageLoader({ label = "Carregando..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="grid min-h-dvh place-items-center bg-background p-6"
    >
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
