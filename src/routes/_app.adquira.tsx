import { useI18n } from "@/lib/i18n-context";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronDown, Mail, MessageCircle, Palette, ShieldCheck, SlidersHorizontal, Sparkles, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/adquira")({
  head: () => ({
    meta: [
      { title: "Adquira seu sistema | NEXO HUB" },
      { name: "description", content: "Sistemas e softwares personalizados para a sua empresa, feitos pela Upper." },
      { property: "og:title", content: "Adquira seu sistema | NEXO HUB" },
      { property: "og:description", content: "Sistemas e softwares personalizados para a sua empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Adquira,
});

const EMAIL = "agencyadm@outlook.com";
const WHATSAPP = "5531997462404"; // número com DDI e DDD, só dígitos

const ITEMS = [
  "Sistema do zero com a sua marca: logo, cores e nome",
  "Domínio personalizado, com o endereço da sua empresa",
  "Você comanda tudo: dados, acessos, telas e configurações",
  "Banco de dados individual e totalmente privado, só da sua empresa",
  "Funcionalidades sob medida para o jeito que sua empresa trabalha",
  "Painéis e relatórios com os números que importam para você",
  "Área de clientes, alunos ou parceiros com login próprio",
  "Cobranças, assinaturas e pagamentos online",
  "Agenda, CRM, financeiro, estoque, pedidos e o que mais precisar",
  "Automações, avisos por e-mail e integrações com outras ferramentas",
  "Inteligência artificial aplicada ao seu negócio",
  "Sites, páginas de vendas e aplicativos que funcionam no celular",
  "Equipes com permissões por pessoa e por área",
  "Suporte e melhorias contínuas depois da entrega",
];

const BENEFITS = [
  { icon: Palette, t: "Sua marca em tudo", d: "Logo, cores, nome e domínio próprio. Seu cliente vê a sua empresa, não a nossa." },
  { icon: ShieldCheck, t: "Dados só seus", d: "Banco de dados individual e totalmente privado. Ninguém mais acessa." },
  { icon: SlidersHorizontal, t: "Você comanda tudo", d: "Acessos, telas, equipes e configurações do seu jeito." },
  { icon: TrendingUp, t: "Mais tempo e lucro", d: "Automações e painéis que tiram o trabalho manual e mostram seus números." },
];

const STEPS = [
  { n: "1", t: "Reunião", d: "Entendemos sua ideia e o seu negócio." },
  { n: "2", t: "Proposta", d: "Você recebe prazos, valores e o que será feito." },
  { n: "3", t: "Criação", d: "Construímos e mostramos cada etapa para você." },
  { n: "4", t: "Entrega e suporte", d: "Seu sistema no ar, com melhorias contínuas." },
];

function Adquira() {
  const { tr } = useI18n();
  const subject = encodeURIComponent("Quero um sistema personalizado");
  const [open, setOpen] = useState(false);
  const shown = open ? ITEMS : ITEMS.slice(0, 6);
  const Contact = () => (
    <div className="flex flex-wrap justify-center gap-3">
      <Button asChild size="lg"><a href={`https://wa.me/${WHATSAPP}?text=${subject}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />{tr("Chamar no WhatsApp")}</a></Button>
      <Button asChild size="lg" variant="outline"><a href={`mailto:${EMAIL}?subject=${subject}`}><Mail className="h-4 w-4" />{EMAIL}</a></Button>
    </div>
  );
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={tr("Adquira seu sistema")} />
      <section className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/15 to-transparent px-6 py-12 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" />{tr("Feito sob medida pela Upper")}</span>
        <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">{tr("Quer um sistema personalizado para a sua empresa?")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{tr("Nós criamos do jeito que você quiser, com as suas funcionalidades, a sua marca e tudo que o seu negócio precisa.")}</p>
        <div className="mt-6"><Contact /></div>
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((b) => (
          <div key={tr(b.t)} className="group rounded-xl border border-border bg-card p-5 text-center transition-all hover:-translate-y-1 hover:border-primary/60">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><b.icon className="h-5 w-5" /></div>
            <h3 className="mt-3 font-semibold">{tr(b.t)}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{tr(b.d)}</p>
          </div>
        ))}
      </div>

      <section className="mt-10 text-center">
        <h2 className="text-2xl font-bold">{tr("O que podemos fazer por você")}</h2>
        <ul className="mx-auto mt-5 grid max-w-4xl gap-3 text-left sm:grid-cols-2">
          {shown.map((i) => <li key={i} className="flex gap-2 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-primary/50"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{tr(i)}</li>)}
        </ul>
        <Button variant="ghost" className="mt-3" onClick={() => setOpen(!open)}>{open ? tr("Ver menos") : tr("Ver tudo ({0})", [ITEMS.length])}<ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} /></Button>
      </section>

      <section className="mt-10 text-center">
        <h2 className="text-2xl font-bold">{tr("Como funciona")}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl border border-border bg-card p-5">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{s.n}</div>
              <h3 className="mt-3 font-semibold">{tr(s.t)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{tr(s.d)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-primary/40 bg-primary/10 px-6 py-10 text-center">
        <h2 className="text-2xl font-bold">{tr("Quer saber mais sobre prazos, valores e tudo que podemos oferecer?")}</h2>
        <p className="mx-auto mt-2 mb-6 max-w-xl text-muted-foreground">{tr("Marque uma reunião de entendimento: ouvimos sua ideia e mostramos como fica o sistema ou software da sua empresa.")}</p>
        <Contact />
      </section>
    </div>
  );
}
