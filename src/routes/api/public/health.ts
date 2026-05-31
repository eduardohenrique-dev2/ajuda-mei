import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ status: "ok", ts: new Date().toISOString() }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    },
  },
});
