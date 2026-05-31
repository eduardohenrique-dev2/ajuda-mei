import { Button } from "@/components/ui/button";

export type QuickFilter = {
  id: string;
  label: string;
  /** Termos para filtragem em título/descrição/tags. */
  matchers: string[];
};

export const DEFAULT_QUICK_FILTERS: QuickFilter[] = [
  { id: "das", label: "DAS", matchers: ["das"] },
  { id: "declaracao", label: "Declaração", matchers: ["declaração", "declaracao", "dasn"] },
  { id: "regularizacao", label: "Regularização", matchers: ["regulariz"] },
  { id: "funcionario", label: "Funcionário", matchers: ["funcionário", "funcionario", "esocial"] },
];

type Props = {
  active: string | null;
  onChange: (id: string | null) => void;
};

export function SolutionFilterChips({ active, onChange }: Props) {
  return (
    <div
      role="toolbar"
      aria-label="Filtros rápidos de soluções"
      className="mt-4 flex flex-wrap gap-2"
    >
      <Button
        size="sm"
        variant={active === null ? "default" : "outline"}
        onClick={() => onChange(null)}
        aria-pressed={active === null}
        className="h-9 rounded-full"
      >
        Todas
      </Button>
      {DEFAULT_QUICK_FILTERS.map((f) => (
        <Button
          key={f.id}
          size="sm"
          variant={active === f.id ? "default" : "outline"}
          onClick={() => onChange(active === f.id ? null : f.id)}
          aria-pressed={active === f.id}
          className="h-9 rounded-full"
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}

export function applyQuickFilter<T extends { titulo: string; descricao: string; categoria?: unknown; tags?: unknown }>(
  items: T[],
  activeId: string | null
): T[] {
  if (!activeId) return items;
  const filter = DEFAULT_QUICK_FILTERS.find((f) => f.id === activeId);
  if (!filter) return items;
  const matchers = filter.matchers.map((m) => m.toLowerCase());
  return items.filter((s) => {
    const hay = [
      s.titulo,
      s.descricao,
      String(s.categoria ?? ""),
      ...(Array.isArray(s.tags) ? (s.tags as string[]) : []),
    ]
      .join(" ")
      .toLowerCase();
    return matchers.some((m) => hay.includes(m));
  });
}
