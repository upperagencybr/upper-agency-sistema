import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";

export const Route = createFileRoute("/assinar/obrigado")({
  head: () => ({
    meta: [
      { title: "Assinatura confirmada | NEXO HUB" },
      { name: "description", content: "Sua assinatura do Nexo Hub foi iniciada." },
      { property: "og:title", content: "Assinatura confirmada" },
      { property: "og:description", content: "Confira seu e-mail para criar sua senha de acesso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="panel max-w-md p-8 text-center">
        <MailCheck className="mx-auto mb-4 h-8 w-8 text-primary" />
        <h1 className="text-xl font-bold">Tudo certo, seus 3 dias grátis começaram</h1>
        <p className="mt-2 text-sm text-muted-foreground">Boas-vindas ao NEXO HUB! Confira seu e-mail para abrir o link e criar sua senha. Seu login é o mesmo e-mail informado na Stripe.</p>
        <p className="mt-3 text-sm text-muted-foreground">Não recebeu o link? Confira o spam ou fale com <a className="text-primary underline" href="mailto:agencyadm@outlook.com">agencyadm@outlook.com</a>.</p>
        <Link to="/login" className="mt-6 inline-block text-sm text-primary underline">Ir para o login</Link>
      </div>
    </div>
  ),
});
