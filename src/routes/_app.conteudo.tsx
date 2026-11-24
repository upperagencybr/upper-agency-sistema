import { useI18n } from "@/lib/i18n-context";
import { useIsAdmin } from "@/lib/subscription";
import { canTestNexoContent } from "@/lib/content-access";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRows, useTableMutations, type Row } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { nexoGenerate } from "@/lib/nexo.functions";
import { Button } from "@/components/ui/button";
import { Field, PageHeader, Panel } from "@/components/app/ui";

export const Route = createFileRoute("/_app/conteudo")({
  head: () => ({
    meta: [
      { title: "NEXIA | NEXO HUB" },
      { name: "description", content: "Conteúdo de Instagram criado com IA para cada empresa, do roteiro à venda." },
      { property: "og:title", content: "NEXIA | NEXO HUB" },
      { property: "og:description", content: "Posts, reels, roteiros e pautas com IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Conteudo,
});

type Company = Row<"companies">;
type Slide = { title: string; text: string };
type Post = { title: string; caption: string; hashtags: string; slides: Slide[] };
const TABS = ["Criar", "Reels sem gravar", "Pautas do mês", "Conversa com a IA", "Marca", "Salvos"] as const;
const MODELS = [
  { id: "Tweet", d: "Print de tweet com a sua foto, o seu @ e o selo de verificado" },
  { id: "Cinematográfico", d: "Foto em tela cheia sobre fundo escuro, com a mensagem em destaque" },
  { id: "Revista", d: "Capa de revista: foto cheia, marca no topo e chamadas de capa" },
  { id: "Tipográfico", d: "Só texto, em letra grande, pra ler em poucos segundos" },
  { id: "Dual", d: "Duas cenas conectadas na mesma capa, com fotos em tela cheia" },
  { id: "One Shot", d: "Foto única em destaque" },
];
const FORMATS = [{ id: "Carrossel", d: "Slides prontos, até 8" }, { id: "Reels", d: "Com roteiro completo" }, { id: "Stories", d: "Sequência de telas" }, { id: "Post único", d: "Foto e legenda forte" }];

const brandText = (c?: Company) => c ? `Nome: ${c.name}. Segmento: ${c.segment ?? ""}. Instagram: ${c.brand_instagram ?? ""}. Tom de voz: ${c.brand_voice ?? ""}. Cores: ${c.brand_colors ?? ""}. Observações: ${c.notes ?? ""}` : "";
const handle = (c?: Company) => (c?.brand_instagram || `@${(c?.name ?? "marca").toLowerCase().replace(/\s+/g, "")}`).replace(/^@?/, "@");

function parsePost(t: string): Post | null {
  try {
    const j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
    return { title: String(j.title ?? ""), caption: String(j.caption ?? ""), hashtags: String(j.hashtags ?? ""), slides: Array.isArray(j.slides) ? j.slides.map((s: Slide) => ({ title: String(s.title ?? ""), text: String(s.text ?? "") })) : [] };
  } catch { return null; }
}

function Conteudo() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  if (isLoading) return null;
  if (!canTestNexoContent(isAdmin)) return <EmBreve />;
  return <ConteudoFull />;
}

function EmBreve() {
  const { tr } = useI18n();
  return (
    <div className="panel mx-auto mt-10 max-w-md p-8 text-center">
      <h1 className="text-xl font-bold">NEXIA</h1>
      <p className="mt-2 text-sm text-muted-foreground">{tr("Em breve. Aqui você vai criar posts, Reels e roteiros com inteligência artificial.")}</p>
    </div>
  );
}

function ConteudoFull() {
  const { tr } = useI18n();
  const { data: companies = [] } = useRows("companies");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Criar");
  const [companyId, setCompanyId] = useState<number | "">("");
  const company = companies.find((c) => c.id === companyId);
  return (
    <div>
      <PageHeader title="NEXIA" sub={tr("Conteúdo de Instagram criado com IA para cada empresa: do roteiro à venda.")} />
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[["Cria", "Escolha a empresa, coloque as imagens e o tema. A IA cria o conteúdo no tom da empresa."], ["Edita", "Ajuste título, legenda, slides e roteiro do seu jeito antes de postar."], ["Posta", "Copie cada parte pronta e publique no Instagram da empresa."], ["Vende", "Todo conteúdo fecha com chamada para o cliente chamar, clicar ou comprar."]].map(([t, d], i) => (
          <div key={t} className="panel p-4"><div className="flex items-center gap-2 font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{i + 1}</span>{tr(t ?? "")}</div><p className="mt-1 text-sm text-muted-foreground">{tr(d ?? "")}</p></div>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => <button key={t} className="chip" data-on={tab === t} onClick={() => setTab(t)}>{tr(t)}</button>)}
        <select aria-label={tr("Empresa")} className="field ml-auto h-8 w-56 text-sm" value={companyId} onChange={(e) => setCompanyId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">{tr("Escolha a empresa")}</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {tab === tr("Criar") && <Criar company={company} />}
      {tab === tr("Reels sem gravar") && <TextTool company={company} task="reels" kind="reels" placeholder={tr("Ex.: 3 erros que fazem sua joia escurecer")} help={tr("Conte o que você quer divulgar. A IA monta o roteiro cena por cena, com texto na tela, narração, imagem sugerida e duração, pra você animar sem aparecer.")} />}
      {tab === tr("Pautas do mês") && <TextTool company={company} task="pautas" kind="pautas" placeholder={tr("Ex.: mês do Dia dos Namorados, foco em vendas")} help={tr("Diga o foco do mês. A IA monta 12 pautas em 4 semanas com formato, gancho e chamada.")} />}
      {tab === tr("Conversa com a IA") && <ChatTool company={company} />}
      {tab === tr("Marca") && <Marca company={company} />}
      {tab === tr("Salvos") && <Salvos />}
    </div>
  );
}

function useSave() {
  const { tr } = useI18n();
  const m = useTableMutations("nexo_contents");
  return (company: Company | undefined, kind: string, title: string, body: string) =>
    m.insert.mutateAsync({ company: company?.name ?? null, kind, title, body }).then(() => toast.success(tr("Salvo")));
}

function Criar({ company }: { company?: Company | undefined }) {
  const { tr } = useI18n();
  const gen = useServerFn(nexoGenerate);
  const save = useSave();
  const [model, setModel] = useState("Cinematográfico");
  const [format, setFormat] = useState("Carrossel");
  const [theme, setTheme] = useState("");
  const [imgs, setImgs] = useState<string[]>([]);
  const [post, setPost] = useState<Post | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!company) { toast.error(tr("Escolha a empresa")); return; }
    if (!theme.trim()) { toast.error(tr("Informe o tema")); return; }
    setBusy(true);
    try {
      const r = await gen({ data: { task: "post", brand: brandText(company), prompt: theme, model, format } });
      const p = parsePost(r.text);
      if (!p) throw new Error("A IA respondeu fora do formato, tente de novo.");
      setPost(p);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const upd = (i: number, k: keyof Slide, v: string) => post && setPost({ ...post, slides: post.slides.map((s, j) => (j === i ? { ...s, [k]: v } : s)) });
  return (
    <div className="space-y-4">
      <Panel title={tr("Modelos de post")}>
        <p className="mb-3 text-sm text-muted-foreground">{tr("Escolha o modelo antes de criar: a IA escreve já no padrão dele.")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODELS.map((m) => (
            <button key={m.id} onClick={() => setModel(m.id)} className={`rounded-md border p-3 text-left ${model === m.id ? "border-primary" : "border-border hover:border-primary/50"}`}>
              <div className="mx-auto w-40"><SlideView model={m.id} slide={{ title: "O brilho que conta a sua história", text: "Sua mensagem principal aparece aqui." }} img={imgs[0]} img2={imgs[1]} at={handle(company)} name={company?.name ?? tr("Sua marca")} /></div>
              <div className="mt-2 font-semibold">{tr(m.id)}</div><div className="text-xs text-muted-foreground">{tr(m.d)}</div>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title={tr("Criar conteúdo")}>
        <div className="space-y-3">
          <Field label={tr("Imagens do conteúdo (até 6)")}>
            <div className="flex flex-wrap items-center gap-2">
              {imgs.map((u, i) => <button key={u} aria-label={tr("Remover imagem")} onClick={() => setImgs(imgs.filter((_, j) => j !== i))}><img src={u} alt="" className="h-16 w-16 rounded object-cover" /></button>)}
              {imgs.length < 6 && <span className="inline-flex cursor-pointer rounded-md border border-border px-3 py-2 text-sm hover:border-primary">{tr("+ Adicionar imagens")}<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { setImgs([...imgs, ...Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f))].slice(0, 6)); e.target.value = ""; }} /></span>}
            </div>
          </Field>
          <Field label={tr("Tema")}><input className="field" placeholder={tr("Ex.: brinco 10300 em promoção para o Dia das Mães")} value={theme} onChange={(e) => setTheme(e.target.value)} /></Field>
          <p className="text-xs text-muted-foreground">{tr("Dê só o tema: a IA pensa o roteiro e monta o conteúdo completo, com gancho, desenvolvimento e fechamento com chamada.")}</p>
          <div className="flex flex-wrap gap-2">{MODELS.map((m) => <button key={m.id} className="chip" data-on={model === m.id} onClick={() => setModel(m.id)}>{tr(m.id)}</button>)}</div>
          <div className="grid gap-2 sm:grid-cols-4">
            {FORMATS.map((f) => <button key={f.id} onClick={() => setFormat(f.id)} className={`rounded-md border p-3 text-left ${format === f.id ? "border-primary" : "border-border"}`}><div className="font-semibold">{tr(f.id)}</div><div className="text-xs text-muted-foreground">{tr(f.d)}</div></button>)}
          </div>
          <Button onClick={run} disabled={busy}>{busy ? tr("Criando...") : tr("Criar com IA")}</Button>
        </div>
      </Panel>
      {post && (
        <Panel title={tr("Pronto para editar e postar")} action={<Button size="sm" variant="outline" onClick={() => save(company, format, post.title, JSON.stringify(post))}>{tr("Salvar")}</Button>}>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
            {post.slides.map((s, i) => <div key={i} className="w-56 shrink-0"><SlideView model={model} slide={s} img={imgs[i % Math.max(1, imgs.length)]} img2={imgs[(i + 1) % Math.max(1, imgs.length)]} at={handle(company)} name={company?.name ?? ""} n={`${i + 1}/${post.slides.length}`} /></div>)}
          </div>
          <div className="mt-4 space-y-3">
            {post.slides.map((s, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[40px_1fr_2fr]">
                <span className="kpi-label pt-2">{i + 1}</span>
                <input aria-label={tr("Título do slide")} className="field" value={s.title} onChange={(e) => upd(i, "title", e.target.value)} />
                <input aria-label={tr("Texto do slide")} className="field" value={s.text} onChange={(e) => upd(i, "text", e.target.value)} />
              </div>
            ))}
            <CopyField label={tr("Legenda")} value={post.caption} onChange={(v) => setPost({ ...post, caption: v })} />
            <CopyField label={tr("Hashtags")} value={post.hashtags} onChange={(v) => setPost({ ...post, hashtags: v })} />
          </div>
        </Panel>
      )}
    </div>
  );
}

function CopyField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { tr } = useI18n();
  return (
    <Field label={label}>
      <div className="flex gap-2"><textarea className="field min-h-24 flex-1" value={value} onChange={(e) => onChange(e.target.value)} />
        <Button type="button" size="icon" variant="outline" aria-label={tr("Copiar {0}", [label])} onClick={() => { navigator.clipboard.writeText(value); toast.success(tr("Copiado")); }}><Copy className="h-4 w-4" /></Button></div>
    </Field>
  );
}

/** Visual preview of one slide in the chosen post model (4:5). */
function SlideView({ model, slide, img, img2, at, name, n }: { model: string; slide: Slide; img?: string | undefined; img2?: string | undefined; at: string; name: string; n?: string }) {
  const { tr } = useI18n();
  const bg = img ? { backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center" } : {};
  const base = "relative aspect-[4/5] w-full overflow-hidden rounded-md bg-neutral-900 text-left";
  if (model === "Tweet") return (
    <div className={`${base} flex flex-col justify-center bg-white p-3 text-neutral-900`}>
      <div className="text-[10px] font-bold">{name} <span className="text-sky-500">●</span></div><div className="text-[9px] text-neutral-500">{at}</div>
      <div className="mt-1 text-[10px] font-semibold leading-tight">{slide.title}</div><div className="text-[9px] leading-tight">{slide.text}</div>
      {img && <img src={img} alt="" className="mt-2 h-1/2 w-full rounded object-cover" />}
    </div>
  );
  if (model === "Tipográfico") return (
    <div className={`${base} flex flex-col justify-center p-4 text-white`}>
      <div className="text-base font-black uppercase leading-tight">{slide.title}</div><div className="mt-1 text-[10px] text-neutral-300">{slide.text}</div>
      <div className="absolute bottom-2 left-4 text-[8px] font-bold tracking-widest text-amber-400">{at.toUpperCase()}</div>
    </div>
  );
  if (model === "Dual") return (
    <div className={`${base} grid grid-rows-2 text-white`}>
      <div className="flex items-end p-2" style={bg}><div className="text-[11px] font-black uppercase drop-shadow">{slide.title}</div></div>
      <div className="flex items-end p-2" style={img2 ? { backgroundImage: `url(${img2})`, backgroundSize: "cover" } : {}}><div className="text-[9px] drop-shadow">{slide.text}</div></div>
    </div>
  );
  if (model === "Revista") return (
    <div className={`${base} text-white`} style={bg}>
      <div className="absolute inset-x-0 top-2 text-center text-lg font-black tracking-wide text-amber-300 drop-shadow">{name.toUpperCase()}</div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
        <span className="rounded bg-amber-300 px-1 text-[7px] font-bold text-black">{tr("EXCLUSIVO")}</span>
        <div className="text-[11px] font-black uppercase leading-tight">{slide.title}</div><div className="text-[8px]">{slide.text}</div>
      </div>
    </div>
  );
  return (
    <div className={`${base} text-white`} style={bg}>
      <div className="absolute left-2 top-2 text-[8px] font-bold tracking-widest">{at.toUpperCase()}</div>
      {n && <div className="absolute right-2 top-2 text-[8px] font-bold">{n}</div>}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
        <div className={`${model === "One Shot" ? "text-[12px]" : "text-[11px]"} font-black uppercase leading-tight`}>{slide.title}</div><div className="text-[9px]">{slide.text}</div>
      </div>
    </div>
  );
}

function TextTool({ company, task, kind, placeholder, help }: { company?: Company | undefined; task: "reels" | "pautas"; kind: string; placeholder: string; help: string }) {
  const { tr } = useI18n();
  const gen = useServerFn(nexoGenerate);
  const save = useSave();
  const [prompt, setPrompt] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!company) { toast.error(tr("Escolha a empresa")); return; }
    if (!prompt.trim()) { toast.error(tr("Conte o que você quer")); return; }
    setBusy(true);
    try { setOut((await gen({ data: { task, brand: brandText(company), prompt } })).text); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Panel>
      <p className="mb-3 text-sm text-muted-foreground">{tr(help)}</p>
      <div className="flex gap-2"><input className="field" placeholder={tr(placeholder)} value={prompt} onChange={(e) => setPrompt(e.target.value)} /><Button onClick={run} disabled={busy}>{busy ? tr("Criando...") : tr("Criar")}</Button></div>
      {out && <div className="mt-4 space-y-2"><CopyField label={tr("Resultado")} value={out} onChange={setOut} /><Button variant="outline" onClick={() => save(company, kind, prompt, out)}>{tr("Salvar")}</Button></div>}
    </Panel>
  );
}

function ChatTool({ company }: { company?: Company | undefined }) {
  const { tr } = useI18n();
  const gen = useServerFn(nexoGenerate);
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!text.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content: text.trim() }];
    setMsgs(next); setText(""); setBusy(true);
    try { const r = await gen({ data: { task: "chat", brand: brandText(company), prompt: "", messages: next } }); setMsgs([...next, { role: "assistant", content: r.text }]); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Panel className="flex h-[560px] flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto">
        {msgs.length === 0 && <p className="text-sm text-muted-foreground">{tr("Peça legendas, scripts de venda, ideias de reels, respostas para clientes ou estratégia de Instagram")}{company ? ` da ${company.name}` : ""}.</p>}
        {msgs.map((m, i) => <div key={i} className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "ml-12 bg-primary text-primary-foreground" : "mr-12 bg-muted"}`}>{m.content}</div>)}
        {busy && <div className="mr-12 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{tr("Pensando...")}</div>}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input autoFocus className="field" placeholder={tr("Fale com a Nexo")} value={text} onChange={(e) => setText(e.target.value)} /><Button type="submit" disabled={busy}>{tr("Enviar")}</Button>
      </form>
    </Panel>
  );
}

function Marca({ company }: { company?: Company | undefined }) {
  const { tr } = useI18n();
  const m = useTableMutations("companies");
  if (!company) return <Panel><p className="text-sm text-muted-foreground">{tr("Escolha a empresa para definir a marca.")}</p></Panel>;
  const f = (k: "brand_instagram" | "brand_voice" | "brand_colors", label: string, area = false) => (
    <Field label={label}>{area
      ? <textarea key={company.id + k} className="field min-h-24" defaultValue={company[k] ?? ""} onBlur={(e) => e.target.value !== (company[k] ?? "") && m.update.mutate({ id: company.id, [k]: e.target.value })} />
      : <input key={company.id + k} className="field" defaultValue={company[k] ?? ""} onBlur={(e) => e.target.value !== (company[k] ?? "") && m.update.mutate({ id: company.id, [k]: e.target.value })} />}</Field>
  );
  return (
    <Panel title={`Marca ${company.name}`}>
      <p className="mb-3 text-sm text-muted-foreground">{tr("A IA usa isso em todo conteúdo desta empresa. Salva sozinho ao sair do campo.")}</p>
      <div className="space-y-3">{f("brand_instagram", "@ do Instagram")}{f("brand_colors", "Cores da marca")}{f("brand_voice", "Tom de voz, público e produtos", true)}</div>
    </Panel>
  );
}

function Salvos() {
  const { tr } = useI18n();
  const { data: items = [] } = useRows("nexo_contents");
  const m = useTableMutations("nexo_contents");
  if (!items.length) return <Panel><p className="text-sm text-muted-foreground">{tr("Nada salvo ainda.")}</p></Panel>;
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const p = it.body.startsWith("{") ? parsePost(it.body) : null;
        const text = p ? `${p.slides.map((s, i) => `${i + 1}. ${s.title}\n${s.text}`).join("\n\n")}\n\n${p.caption}\n\n${p.hashtags}` : it.body;
        return (
          <Panel key={it.id} title={`${it.kind}, ${it.company ?? ""}, ${fmtDate(it.created_at)}`} action={
            <div className="flex gap-1">
              <Button size="icon" variant="outline" aria-label={tr("Copiar")} onClick={() => { navigator.clipboard.writeText(text); toast.success(tr("Copiado")); }}><Copy className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" aria-label={tr("Excluir")} onClick={() => confirm(tr("Excluir?")) && m.remove.mutate(it.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>}>
            <div className="font-medium">{it.title}</div>
            <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-sm text-muted-foreground">{text}</p>
          </Panel>
        );
      })}
    </div>
  );
}
