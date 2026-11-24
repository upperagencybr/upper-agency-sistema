import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "./_app.dashboard";

export const Route = createFileRoute("/_app/sistema")({
  head: () => ({
    meta: [
      { title: "Sistema | NEXO HUB" },
      { name: "description", content: "Acesse seu painel, clientes e resultados no NEXO HUB." },
      { property: "og:title", content: "Sistema | NEXO HUB" },
      { property: "og:description", content: "Seu painel de gestão e resultados no NEXO HUB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});