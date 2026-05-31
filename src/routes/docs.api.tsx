import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/docs/api")({
  head: () => ({
    meta: [
      { title: "API Docs — Sala do Empreendedor" },
      { name: "description", content: "Documentação OpenAPI/Swagger da API." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApiDocsPage,
});

const SWAGGER_CSS = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
const SWAGGER_JS = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js";

function ApiDocsPage() {
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    if (!document.querySelector(`link[href="${SWAGGER_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = SWAGGER_CSS;
      document.head.appendChild(link);
    }

    const init = () => {
      // @ts-expect-error global injetado pelo bundle UMD
      window.SwaggerUIBundle({
        url: "/docs/openapi.yaml",
        dom_id: "#swagger-ui",
        deepLinking: true,
        docExpansion: "list",
        defaultModelsExpandDepth: -1,
      });
    };

    // @ts-expect-error
    if (window.SwaggerUIBundle) {
      init();
    } else {
      const script = document.createElement("script");
      script.src = SWAGGER_JS;
      script.async = true;
      script.onload = init;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div id="swagger-ui" />
    </div>
  );
}
