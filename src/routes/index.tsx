import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Check, ChevronDown, LayoutDashboard, Moon, Rocket, ShieldCheck, Sun, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductShowcase } from "@/components/app/ProductShowcase";
import { CoverVideo } from "@/components/app/CoverVideo";
import coverClip from "@/assets/videos/nexo-hub-walkthrough-light-dark.mp4.asset.json";
import lightPoster from "@/assets/nexo-demo-light-dashboard.jpg.asset.json";
import darkPoster from "@/assets/nexo-demo-dark-dashboard.jpg.asset.json";
import { planId, type Tier, TRIAL_DAYS, TRIAL_CANCEL_CUTOFF_MS } from "@/lib/billing";
import { createCheckoutSession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { PricingPlans } from "@/components/app/PricingPlans";
import { siteMode, SYSTEM_ORIGIN } from "@/lib/site";
import { getRequestHost } from "@/lib/site.functions";


// Trechos do vídeo da capa para cada tema, em segundos.
const LIGHT_END_SECONDS = 18;
const DARK_START_SECONDS = 18;
const DARK_END_SECONDS = 29;
// Se o evento seeked não chegar, confere a posição depois deste tempo.
const SEEK_FALLBACK_MS = 1500;

// O vídeo fica escondido até estar posicionado no trecho seguro do tema atual.
const VIDEO_GUARD_CSS = `.lp-hero[data-video-ready="false"] video { visibility: hidden !important; }`;

type DemoTheme = "light" | "dark";

// Cores neutras de cada tema. São aplicadas direto no contêiner da página de vendas,
// para que o site inteiro mude de tema independentemente de outras regras de estilo.
const NEUTRALS: Record<DemoTheme, Record<string, string>> = {
  light: {
    background: "#ffffff",
    foreground: "#0b0b0f",
    card: "#f6f6f8",
    "card-foreground": "#0b0b0f",
    popover: "#ffffff",
    "popover-foreground": "#0b0b0f",
    muted: "#f0f0f3",
    "muted-foreground": "#5a5a66",
    secondary: "#f0f0f3",
    "secondary-foreground": "#0b0b0f",
    accent: "#f0f0f3",
    "accent-foreground": "#0b0b0f",
    border: "#e3e3e8",
    input: "#e3e3e8",
  },
  dark: {
    background: "#09090b",
    foreground: "#fafafa",
    card: "#131316",
    "card-foreground": "#fafafa",
    popover: "#131316",
    "popover-foreground": "#fafafa",
    muted: "#1c1c20",
    "muted-foreground": "#a1a1aa",
    secondary: "#1c1c20",
    "secondary-foreground": "#fafafa",
    accent: "#1c1c20",
    "accent-foreground": "#fafafa",
    border: "#27272c",
    input: "#27272c",
  },
};

const HERO_SHADE: Record<DemoTheme, string> = {
  light: "linear-gradient(90deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.15) 100%)",
  dark: "linear-gradient(90deg, rgba(9,9,11,0.94) 0%, rgba(9,9,11,0.7) 50%, rgba(9,9,11,0.15) 100%)",
};

function themeStyle(theme: DemoTheme): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [name, value] of Object.entries(NEUTRALS[theme])) {
    vars[`--${name}`] = value;
    vars[`--color-${name}`] = value;
  }
  vars["colorScheme"] = theme;
  return vars as CSSProperties;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXO HUB | Clientes, projetos e financeiro em um só lugar" },
      { name: "description", content: "Organize sua empresa com o NEXO HUB: CRM, clientes, projetos, metas e financeiro. Conheça as telas e teste grátis por 3 dias." },
      { property: "og:title", content: "NEXO HUB | Sua gestão, conectada" },
      { property: "og:description", content: "Menos informações espalhadas. Mais clareza para vender, entregar e crescer. Conheça o NEXO HUB e teste por 3 dias." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async () => {
    const mode = siteMode(await getRequestHost());
    // On the system address the home page is the app, not the sales page.
    if (mode === "system") throw redirect({ to: "/sistema" });
    return { mode };
  },
  component: LandingPage,
});

const BENEFITS = [
  { icon: LayoutDashboard, title: "Enxergue o próximo passo", text: "Metas, resultados e previsões reunidos para você acompanhar o negócio." },
  { icon: Users, title: "Não perca o fio da conversa", text: "Clientes e negociações organizados, do primeiro contato ao projeto." },
  { icon: Wallet, title: "Tenha clareza do seu dinheiro", text: "Receitas, despesas e pendências com visão rápida do mês." },
];

function TrialButton({ annual = false, tier = "business", label = "Testar grátis por 3 dias", outline = false }: { annual?: boolean; tier?: Tier; label?: string; outline?: boolean }) {
  return <Button asChild size="lg" variant={outline ? "outline" : "default"}><Link to="/assinar" search={{ plano: annual ? "anual" : "mensal", tier }}>{label}<ArrowUpRight className="h-4 w-4" /></Link></Button>;
}

function LandingPage() {
  const checkout = useServerFn(createCheckoutSession);
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [demoTheme, setDemoTheme] = useState<DemoTheme>("light");
  // Tema para o qual o vídeo já foi posicionado com segurança. Enquanto for diferente do tema atual, o vídeo fica escondido.
  const [videoReadyTheme, setVideoReadyTheme] = useState<DemoTheme | null>(null);
  const videoReady = videoReadyTheme === demoTheme;
  const heroRef = useRef<HTMLElement>(null);
  const originalDocumentTheme = useRef<{ hadDarkClass: boolean; colorScheme: string; backgroundColor: string } | null>(null);
  const { mode } = Route.useLoaderData();
  // On the sales address, signing in happens on the system address.
  const loginHref: string = mode === "sales" ? `${SYSTEM_ORIGIN}/login` : "/login";
  const startCheckout = async (tier: Tier, cycle: "mensal" | "anual") => {
    setCheckoutError("");
    setPendingTier(tier);
    try {
      const result = await checkout({ data: {
        priceId: planId(tier, cycle),
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/assinar/obrigado?session_id={CHECKOUT_SESSION_ID}`,
      } });
      if ("error" in result) {
        setCheckoutError(result.error);
        return;
      }
      window.location.assign(result.url);
    } catch {
      setCheckoutError("Não foi possível abrir a Stripe. Tente novamente.");
    } finally {
      setPendingTier(null);
    }
  };

  const changeDemoTheme = (theme: DemoTheme) => {
    // Esconde o vídeo antes de atualizar o tema e remontar o elemento de vídeo.
    setVideoReadyTheme(null);
    setDemoTheme(theme);
  };

  // Aplica a escolha no documento inteiro e preserva o que estava ativo antes da página de vendas.
  useEffect(() => {
    const root = document.documentElement;
    if (originalDocumentTheme.current === null) {
      originalDocumentTheme.current = {
        hadDarkClass: root.classList.contains("dark"),
        colorScheme: root.style.colorScheme,
        backgroundColor: root.style.backgroundColor,
      };
    }
    root.classList.toggle("dark", demoTheme === "dark");
    root.style.colorScheme = demoTheme;
    root.style.backgroundColor = NEUTRALS[demoTheme]["background"] ?? "";
  }, [demoTheme]);

  useEffect(() => () => {
    const original = originalDocumentTheme.current;
    if (!original) return;
    const root = document.documentElement;
    root.classList.toggle("dark", original.hadDarkClass);
    root.style.colorScheme = original.colorScheme;
    root.style.backgroundColor = original.backgroundColor;
  }, []);

  // Mantém o vídeo da capa dentro do trecho do tema escolhido. O vídeo só aparece depois do evento seeked confirmar a posição.
  useEffect(() => {
    const video = heroRef.current?.querySelector<HTMLVideoElement>("video");
    if (!video) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;
    let fallbackTimer: number | undefined;
    let isSeeking = false;

    const range = () => {
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return null;
      const segment = demoTheme === "dark"
        ? { start: DARK_START_SECONDS, end: Math.min(DARK_END_SECONDS, duration) }
        : { start: 0, end: Math.min(LIGHT_END_SECONDS, duration) };
      return segment.end > segment.start ? segment : null;
    };

    const clearFallback = () => {
      if (fallbackTimer !== undefined) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = undefined;
      }
    };

    const isInside = (segment: { start: number; end: number }) =>
      video.currentTime >= segment.start && video.currentTime < segment.end;

    const seekToSegmentStart = () => {
      const segment = range();
      if (!segment) return;
      clearFallback();
      video.pause();
      isSeeking = true;
      setVideoReadyTheme(null);
      video.currentTime = segment.start;
      // Plano B: se o navegador não disparar seeked, confere a posição depois de um tempo.
      fallbackTimer = window.setTimeout(onSeeked, SEEK_FALLBACK_MS);
    };

    const onSeeked = () => {
      if (!isSeeking) return;
      clearFallback();
      const segment = range();
      if (!segment) return;
      if (!isInside(segment)) {
        seekToSegmentStart();
        return;
      }
      isSeeking = false;
      setVideoReadyTheme(demoTheme);
      if (!reduceMotion) void video.play().catch(() => undefined);
    };

    const restart = () => {
      if (!range()) return;
      seekToSegmentStart();
    };

    const blockPlayWhileSeeking = () => {
      if (isSeeking) video.pause();
    };

    const keepInRange = () => {
      const segment = range();
      if (!segment || isSeeking || video.paused) return;
      if (video.currentTime < segment.start || video.currentTime >= segment.end) {
        seekToSegmentStart();
      }
    };

    const monitorPlayback = () => {
      keepInRange();
      animationFrame = window.requestAnimationFrame(monitorPlayback);
    };

    video.pause();
    video.addEventListener("loadedmetadata", restart);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("play", blockPlayWhileSeeking);
    video.addEventListener("timeupdate", keepInRange);
    if (video.readyState >= 1) restart();
    animationFrame = window.requestAnimationFrame(monitorPlayback);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      clearFallback();
      video.removeEventListener("loadedmetadata", restart);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("play", blockPlayWhileSeeking);
      video.removeEventListener("timeupdate", keepInRange);
    };
  }, [demoTheme]);

  return (
    <div style={themeStyle(demoTheme)} className={`nexo-lp min-h-screen bg-background text-foreground ${demoTheme === "dark" ? "dark" : ""}`}>
      <style>{VIDEO_GUARD_CSS}</style>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <Link to="/" aria-label="NEXO HUB, início" className="flex items-center gap-3"><img src="/ultrax-attached-b6d76d11-e9f3-4cbb-9c6f-6bfde7abb0ed.svg" alt="Símbolo NEXO HUB" className="h-auto w-14 max-w-full object-contain sm:w-16" /><span className="border-l border-border pl-3 text-sm font-semibold">NEXO HUB</span></Link>
          <nav aria-label="Menu principal" className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            <a href="#sistema" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">O sistema</a>
            <a href="#planos" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">Planos</a>
            <div className="flex items-center gap-1" role="group" aria-label="Tema da demonstração">
              <Button size="sm" variant={demoTheme === "light" ? "default" : "outline"} aria-pressed={demoTheme === "light"} onClick={() => changeDemoTheme("light")}><Sun className="h-4 w-4" /><span>Ver em tema claro</span></Button>
              <Button size="sm" variant={demoTheme === "dark" ? "default" : "outline"} aria-pressed={demoTheme === "dark"} onClick={() => changeDemoTheme("dark")}><Moon className="h-4 w-4" /><span>Ver em tema escuro</span></Button>
            </div>
            <Button asChild variant="ghost" size="sm"><a href={loginHref}>Entrar<ArrowUpRight className="h-4 w-4" /></a></Button>
          </nav>
        </div>
      </header>

      <main>
        <section ref={heroRef} data-video-ready={videoReady ? "true" : "false"} className="lp-hero relative isolate overflow-hidden">
          <Fragment key={demoTheme}>
            <CoverVideo src={coverClip.url} poster={demoTheme === "dark" ? darkPoster.url : lightPoster.url} />
          </Fragment>
          <div className="lp-hero-shade absolute inset-0 -z-10" style={{ background: HERO_SHADE[demoTheme] }} />
          <div className="mx-auto flex min-h-[570px] max-w-6xl flex-col justify-center px-5 py-16 sm:px-8 sm:py-20">
            <p className="mb-5 text-sm font-medium text-primary">GESTÃO CONECTADA. ROTINA MAIS LEVE.</p>
            <h1 className="text-5xl font-bold sm:text-7xl">NEXO HUB</h1>
            <p className="mt-5 max-w-lg text-2xl font-medium leading-snug sm:text-3xl">Seu negócio inteiro.<br />Um só lugar para cuidar dele.</p>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">Clientes, vendas, projetos e financeiro conectados. Menos informações espalhadas, mais clareza para crescer.</p>
            <div className="mt-8 flex flex-wrap items-center gap-4"><TrialButton /><a href="#sistema" className="inline-flex items-center gap-2 text-sm font-medium">Conhecer o sistema<ChevronDown className="h-4 w-4" /></a></div>
            <p className="mt-4 text-xs text-muted-foreground">{TRIAL_DAYS} dias sem cobrança.</p>
          </div>
        </section>

        <section className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-9 sm:grid-cols-3 sm:px-8">
            {BENEFITS.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4"><Icon className="mt-1 h-5 w-5 shrink-0 text-primary" /><div><h2 className="text-base font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></div></div>)}
          </div>
        </section>

        <section id="sistema" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
          <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold text-primary">POR DENTRO DO NEXO HUB</p><h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Organização que você vê.</h2></div><p className="max-w-sm text-sm leading-relaxed text-muted-foreground">Para agências, prestadores de serviço e quem precisa cuidar do negócio sem perder o foco nas entregas.</p></div>
          <ProductShowcase theme={demoTheme} />
        </section>

        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <p className="text-xs font-semibold text-primary">CADA ETAPA TEM SEU LUGAR</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold sm:text-4xl">Da oportunidade ao resultado,<br className="hidden sm:block" /> sem perder nada pelo caminho.</h2>
            <div className="mt-10"><ProductShowcase compact theme={demoTheme} /></div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-6 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" />Conta própria e dados separados</span><span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-primary" />Acesso pelo navegador</span><span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-primary" />Equipe com permissões</span></div>
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
          <div className="mb-10 text-center"><p className="text-xs font-semibold text-primary">COMECE PELO SEU NEGÓCIO</p><h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Teste na prática. Escolha seu plano.</h2><p className="mt-4 text-muted-foreground">Três tamanhos de equipe. Mensal ou anual, com 3 dias grátis em todos.</p></div>
          {checkoutError && <p role="alert" className="mb-4 text-center text-sm text-destructive">{checkoutError}</p>}
          <PricingPlans onCheckout={(tier, cycle) => void startCheckout(tier, cycle)} pendingTier={pendingTier} />
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">A cobrança é automática ao terminar o teste de {TRIAL_DAYS} dias. Cancele antes das últimas {TRIAL_CANCEL_CUTOFF_MS / 3600000} horas para não ser cobrado. Nesse intervalo final, o cancelamento do teste fica indisponível.</p>

          <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-primary/40 bg-primary/5 p-8 text-center sm:p-10">
            <Rocket className="mx-auto h-8 w-8 text-primary" />
            <h3 className="mt-4 text-2xl font-semibold sm:text-3xl">Quer construir seu próprio software, seja para cobranças, organização, gerenciamento de equipe, entre outros?</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Nós criamos um sistema personalizado para a sua empresa, com a sua marca, o seu domínio e as funcionalidades que você precisa. Dados só seus, totalmente privados. Você comanda tudo, do seu jeito e no seu tempo, sem mensalidade pelo sistema.</p>
            <Button asChild size="lg" className="mt-6 gap-2">
              <a href="https://wa.me/5531997462404?text=Quero%20conhecer%20mais%20sobre%20um%20sistema%20personalizado" target="_blank" rel="noreferrer">Quero conhecer mais<ArrowUpRight className="h-4 w-4" /></a>
            </Button>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 md:grid-cols-[1fr_1.5fr]">
            <div><p className="text-xs font-semibold text-primary">SEM COMPLICAÇÃO</p><h2 className="mt-3 text-3xl font-semibold">Antes de começar.</h2></div>
            <div className="divide-y divide-border">
              {[
                ["Preciso instalar algum programa?", "Não. Você acessa o NEXO HUB pelo navegador, no computador ou no celular."],
                ["Como funciona o teste gratuito?", `Você escolhe um plano e configura sua assinatura. São ${TRIAL_DAYS} dias sem cobrança. Para não ser cobrado, cancele antes das últimas ${TRIAL_CANCEL_CUTOFF_MS / 3600000} horas do teste.`],
                ["Minha conta vem com os dados de outra empresa?", "Não. Sua conta começa com seu próprio espaço, separado das contas de outros assinantes."],
                ["Posso organizar o sistema do meu jeito?", "Sim. Você pode personalizar nomes e ordem das abas, criar etiquetas e organizar opções de cadastro na sua conta."],
                ["A inteligência artificial já está disponível?", "O NEXIA com IA está em breve para assinantes. Os planos apresentados não dependem desse recurso."],
              ].map(([question, answer]) => <details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{question}<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{answer}</p></details>)}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-primary text-primary-foreground"><div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center"><div><h2 className="text-3xl font-semibold">Mais organização.<br />Mais espaço para crescer.</h2><p className="mt-3 text-sm">Conheça o NEXO HUB no seu próprio ritmo.</p></div><Button asChild size="lg" variant="secondary"><Link to="/assinar" search={{ plano: "mensal" }}>Começar meus 3 dias grátis<ArrowUpRight className="h-4 w-4" /></Link></Button></div></section>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-xs text-muted-foreground sm:px-8"><span>NEXO HUB. Sua gestão, conectada.</span><Button asChild variant="link" size="sm"><a href={loginHref}>Já tenho conta<ArrowUpRight className="h-3 w-3" /></a></Button></footer>
    </div>
  );
}
