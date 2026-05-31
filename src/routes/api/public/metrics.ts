import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Endpoint público no formato Prometheus exposition.
// Aponte seu Grafana Cloud / Prometheus para fazer scrape aqui.
//
// Exemplo de scrape_config:
//   - job_name: 'sala-empreendedor'
//     metrics_path: /api/public/metrics
//     scheme: https
//     static_configs:
//       - targets: ['ajuda-mei.lovable.app']

export const Route = createFileRoute("/api/public/metrics")({
  server: {
    handlers: {
      GET: async () => {
        const since30d = new Date(Date.now() - 30 * 86400_000).toISOString();
        const since24h = new Date(Date.now() - 86400_000).toISOString();

        const [tk, tkOpen, tk24h, sol, npsRow] = await Promise.all([
          supabaseAdmin.from("tickets").select("*", { count: "exact", head: true }).gte("criado_em", since30d),
          supabaseAdmin.from("tickets").select("*", { count: "exact", head: true }).not("status", "in", "(resolvido,encerrado)"),
          supabaseAdmin.from("tickets").select("*", { count: "exact", head: true }).gte("criado_em", since24h),
          supabaseAdmin.from("solutions").select("*", { count: "exact", head: true }).eq("ativo", true),
          supabaseAdmin.from("avaliacoes").select("nota").gte("criado_em", since30d),
        ]);

        const notas = (npsRow.data ?? []).map((r) => r.nota as number);
        const avg = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
        const promoters = notas.filter((n) => n >= 9).length;
        const detractors = notas.filter((n) => n <= 6).length;
        const nps = notas.length ? ((promoters - detractors) / notas.length) * 100 : 0;

        const lines = [
          "# HELP app_tickets_total Tickets criados nos últimos 30 dias",
          "# TYPE app_tickets_total gauge",
          `app_tickets_total ${tk.count ?? 0}`,
          "# HELP app_tickets_open Tickets abertos no momento",
          "# TYPE app_tickets_open gauge",
          `app_tickets_open ${tkOpen.count ?? 0}`,
          "# HELP app_tickets_last_24h Tickets criados nas últimas 24h",
          "# TYPE app_tickets_last_24h gauge",
          `app_tickets_last_24h ${tk24h.count ?? 0}`,
          "# HELP app_solutions_active Soluções ativas no catálogo",
          "# TYPE app_solutions_active gauge",
          `app_solutions_active ${sol.count ?? 0}`,
          "# HELP app_nps_score NPS (-100 a 100) últimos 30d",
          "# TYPE app_nps_score gauge",
          `app_nps_score ${nps.toFixed(2)}`,
          "# HELP app_nps_avg Média de notas NPS últimos 30d",
          "# TYPE app_nps_avg gauge",
          `app_nps_avg ${avg.toFixed(2)}`,
          "# HELP app_nps_samples Quantidade de avaliações últimos 30d",
          "# TYPE app_nps_samples gauge",
          `app_nps_samples ${notas.length}`,
          "",
        ];
        return new Response(lines.join("\n"), {
          status: 200,
          headers: { "content-type": "text/plain; version=0.0.4; charset=utf-8" },
        });
      },
    },
  },
});
