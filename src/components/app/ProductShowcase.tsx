import { useState } from "react";
import { ArrowLeft, ArrowRight, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import dashboard from "@/assets/nexo-demo-light-dashboard.jpg.asset.json";
import finance from "@/assets/nexo-demo-light-financeiro.jpg.asset.json";
import crm from "@/assets/nexo-demo-light-crm.jpg.asset.json";
import clients from "@/assets/nexo-demo-light-clientes.jpg.asset.json";
import projects from "@/assets/nexo-demo-light-projetos.jpg.asset.json";
import darkDashboard from "@/assets/nexo-demo-dark-dashboard.jpg.asset.json";
import darkFinance from "@/assets/nexo-demo-dark-financeiro.jpg.asset.json";
import darkCrm from "@/assets/nexo-demo-dark-crm.jpg.asset.json";
import darkClients from "@/assets/nexo-demo-dark-clientes.jpg.asset.json";
import darkProjects from "@/assets/nexo-demo-dark-projetos.jpg.asset.json";

type Theme = "light" | "dark";

const SCREENS = [
  { title: "Dashboard", lightImage: dashboard.url, darkImage: darkDashboard.url, headline: "Decida com o negócio inteiro à vista.", copy: "Receitas, despesas, previsões e metas do mês. Veja os indicadores que importam para o próximo passo." },
  { title: "Financeiro", lightImage: finance.url, darkImage: darkFinance.url, headline: "Saiba o que entra. E o que ainda falta entrar.", copy: "Organize receitas e despesas, acompanhe pendências e registre parcelas e recorrências em diferentes moedas." },
  { title: "CRM", lightImage: crm.url, darkImage: darkCrm.url, headline: "Uma conversa não precisa virar uma oportunidade perdida.", copy: "Acompanhe cada negociação por etapa, organize etiquetas e mantenha a data de retorno por perto." },
  { title: "Clientes", lightImage: clients.url, darkImage: darkClients.url, headline: "Seu relacionamento começa com organização.", copy: "Veja seus clientes em planilha, lista ou Kanban. Abra o cadastro completo quando precisar e reúna os links do Drive." },
  { title: "Projetos", lightImage: projects.url, darkImage: darkProjects.url, headline: "Mais clareza entre a venda e a entrega.", copy: "Reúna projetos, clientes, prazos e etiquetas. Mantenha o trabalho organizado sem perder o contexto." },
];

export function ProductShowcase({ compact = false, theme = "light" }: { compact?: boolean; theme?: Theme }) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [zoom, setZoom] = useState<(typeof SCREENS)[number] | null>(null);
  const connect = (nextApi: CarouselApi) => {
    setApi(nextApi);
    if (nextApi) nextApi.on("select", () => setSelected(nextApi.selectedScrollSnap()));
  };
  const imageFor = (screen: (typeof SCREENS)[number]) => theme === "dark" ? screen.darkImage : screen.lightImage;
  return (
    <>
      <Carousel opts={{ loop: true, align: "start" }} setApi={connect} aria-label={compact ? "Detalhes das áreas do sistema" : "Fotos do NEXO HUB"} className="min-w-0">
        {!compact && <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2" role="group" aria-label="Escolher área do sistema">
          {SCREENS.map((screen, index) => <Button key={screen.title} variant={selected === index ? "default" : "ghost"} onClick={() => api?.scrollTo(index)} aria-pressed={selected === index}>{screen.title}</Button>)}
        </div></div>}
        <CarouselContent>
          {SCREENS.map((screen, index) => <CarouselItem key={screen.title} className={compact ? "basis-[88%] md:basis-1/2 lg:basis-1/3" : ""}>
            <figure>
              <div className="relative aspect-[1280/900] overflow-hidden rounded-md border border-border bg-card">
                <img src={imageFor(screen)} alt={`Tela de ${screen.title} do NEXO HUB, com dados fictícios de demonstração`} width={1280} height={900} loading="lazy" className="h-full w-full object-contain" />
                <Button size="icon" variant="secondary" className="absolute bottom-3 right-3" aria-label={`Ampliar ${screen.title}`} title={`Ampliar ${screen.title}`} onClick={() => setZoom(screen)}><Maximize2 className="h-4 w-4" /></Button>
              </div>
              <figcaption className="pt-5">
                {compact ? <><span className="text-xs font-medium text-primary">0{index + 1} / {screen.title}</span><h3 className="mt-2 text-xl font-semibold">{screen.headline}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{screen.copy}</p></> : <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><h3 className="text-xl font-semibold sm:max-w-sm">{screen.headline}</h3><p className="max-w-md text-sm leading-relaxed text-muted-foreground">{screen.copy}</p></div>}
              </figcaption>
            </figure>
          </CarouselItem>)}
        </CarouselContent>
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Telas reais do sistema, com dados fictícios de demonstração.</p>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="icon" variant="outline" aria-label={compact ? "Detalhe anterior" : "Foto anterior"} title="Anterior" onClick={() => api?.scrollPrev()}><ArrowLeft className="h-4 w-4" /></Button>
            <span className="w-12 text-center text-xs text-muted-foreground">{selected + 1} / {SCREENS.length}</span>
            <Button size="icon" variant="outline" aria-label={compact ? "Próximo detalhe" : "Próxima foto"} title="Próximo" onClick={() => api?.scrollNext()}><ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Carousel>
      <Dialog open={!!zoom} onOpenChange={(open) => { if (!open) setZoom(null); }}>
        <DialogContent className={`max-h-[92vh] overflow-y-auto sm:max-w-6xl ${theme === "dark" ? "dark" : ""}`}>
          <DialogHeader><DialogTitle>{zoom?.title} | NEXO HUB</DialogTitle></DialogHeader>
          {zoom && <img src={theme === "dark" ? zoom.darkImage : zoom.lightImage} alt={`Foto ampliada de ${zoom.title}`} width={1280} height={900} className="h-auto w-full" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
