import { useI18n } from "@/lib/i18n-context";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquare, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Empty, Field, Modal, PageHeader } from "@/components/app/ui";
import { useFeedbackActions, useFeedbackMessages, useFeedbackThreads } from "@/lib/data";
import { useIsAdmin } from "@/lib/subscription";
import { FEEDBACK_CATEGORIES, feedbackSchema, feedbackStatus, feedbackUnread, type FeedbackStatus } from "@/lib/feedback";

export const Route = createFileRoute("/_app/feedbacks")({
  validateSearch: (search: Record<string, unknown>): { conversa?: string } => typeof search["conversa"] === "string" ? { conversa: search["conversa"] } : {},
  head: () => ({ meta: [
    { title: "Feedbacks e atendimento | NEXO HUB" }, { name: "description", content: "Sugestões, dúvidas e melhorias com atendimento privado da Upper Agency BR." },
    { property: "og:title", content: "Feedbacks e atendimento | NEXO HUB" }, { property: "og:description", content: "Converse com a Upper Agency BR sobre seu NEXO HUB." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Feedbacks,
});
const STATUS = { "nao-lido": "Não lido", lido: "Lido", respondido: "Respondido" };
function Feedbacks() {
  const { tr, locale } = useI18n();
  const { conversa } = Route.useSearch();
  const { data: admin = false } = useIsAdmin();
  const threads = useFeedbackThreads();
  const actions = useFeedbackActions();
  const [selected, setSelected] = useState<string | null>(conversa ?? null);
  const [filter, setFilter] = useState<FeedbackStatus | "todos">("todos");
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof FEEDBACK_CATEGORIES)[number]>("Feedback");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const messages = useFeedbackMessages(selected);
  const thread = threads.data?.find(t => t.id === selected);
  useEffect(() => { if (conversa) setSelected(conversa); }, [conversa]);
  useEffect(() => {
    if (thread && feedbackUnread(thread, admin) && !actions.read.isPending && !actions.read.isError) actions.read.mutate(thread.id);
  }, [thread?.id, thread?.updated_at, thread?.admin_read_at, thread?.user_read_at, admin]);
  const submit = async () => {
    const result = feedbackSchema.safeParse({ category, body });
    if (!result.success) { toast.error(result.error.issues[0]?.message ?? tr("Confira sua mensagem")); return; }
    const id = await actions.create.mutateAsync(result.data).catch(() => null);
    if (!id) return;
    setSelected(id); setBody(""); setOpen(false); toast.success(tr("Mensagem enviada à Upper Agency BR"));
  };
  const sendReply = async () => {
    if (!thread || !reply.trim()) return;
    await actions.reply.mutateAsync({ threadId: thread.id, body: reply }).then(() => { setReply(""); toast.success(tr("Resposta enviada")); }).catch(() => undefined);
  };
  const list = (threads.data ?? []).filter(t => filter === "todos" || feedbackStatus(t) === filter);
  return <div>
    <PageHeader title={tr("Feedbacks")} sub={admin ? tr("Atendimento Upper Agency BR") : tr("Suas conversas com a Upper Agency BR")} actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{tr("Nova mensagem")}</Button>} />
    <div className="mb-5 flex flex-wrap gap-2">{(["todos", "nao-lido", "lido", "respondido"] as const).map(f => <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f === "todos" ? tr("Todos") : tr(STATUS[f])}<span className="text-xs">{(threads.data ?? []).filter(t => f === "todos" || feedbackStatus(t) === f).length}</span></Button>)}</div>
    {threads.isError ? <Empty>{tr("Não foi possível carregar as conversas.")}<Button variant="link" onClick={() => void threads.refetch()}>{tr("Tentar novamente")}</Button></Empty> : threads.isLoading ? <Empty>{tr("Carregando conversas...")}</Empty> : <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-2">{list.length === 0 ? <Empty>{tr("Nenhuma conversa neste filtro.")}</Empty> : list.map(t => <Button key={t.id} variant="outline" onClick={() => { setSelected(t.id); setReply(""); actions.read.reset(); }} className={`h-auto w-full items-start justify-start whitespace-normal p-3 text-left ${selected === t.id ? "border-primary" : ""}`}>
        <MessageSquare className={`mt-1 h-4 w-4 shrink-0 ${feedbackUnread(t, admin) ? "text-primary" : "text-muted-foreground"}`} />
        <span className="min-w-0 flex-1"><span className="flex flex-wrap justify-between gap-1 text-sm"><span>{tr(t.category)}</span><span className="text-xs text-muted-foreground">{tr(STATUS[feedbackStatus(t)])}</span></span>{admin && <span className="mt-1 block break-all text-xs text-muted-foreground">{t.author_email}</span>}<span className="mt-2 line-clamp-2 block text-xs text-muted-foreground">{t.preview}</span><span className="mt-2 block text-xs text-muted-foreground">{new Date(t.updated_at).toLocaleString(locale)}</span></span>
      </Button>)}</div>
      <div className="min-w-0">{!thread ? <Empty>{tr("Selecione uma conversa.")}</Empty> : <>
        <div className="mb-4 border-b border-border pb-3"><h2 className="font-semibold">{tr(thread.category)}</h2><p className="break-all text-xs text-muted-foreground">{admin ? thread.author_email : "Upper Agency BR"}</p></div>
        <div className="max-h-[55vh] space-y-4 overflow-y-auto pb-4">{messages.isError ? <p className="text-destructive">{tr("Não foi possível carregar as mensagens.")}</p> : messages.isLoading ? <p className="text-muted-foreground">{tr("Carregando...")}</p> : messages.data?.map(m => <div key={m.id} className={`border-l-2 p-3 ${m.sender === "upper" ? "border-primary bg-muted" : "border-border"}`}><div className="mb-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{m.sender === "upper" ? "Upper Agency BR" : admin ? thread.author_email : tr("Você")}</span><span>{new Date(m.created_at).toLocaleString(locale)}</span></div><p className="whitespace-pre-wrap break-words text-sm">{m.body}</p></div>)}</div>
        <form className="mt-4 space-y-3 border-t border-border pt-4" onSubmit={e => { e.preventDefault(); void sendReply(); }}><Field label={tr("Sua resposta")}><Textarea value={reply} onChange={e => setReply(e.target.value)} maxLength={5000} rows={4} required placeholder={tr("Escreva sua resposta")} /></Field><Button type="submit" disabled={!reply.trim() || actions.reply.isPending}><Send className="h-4 w-4" />{actions.reply.isPending ? tr("Enviando...") : tr("Enviar resposta")}</Button></form>
      </>}</div>
    </div>}
    <Modal open={open} onClose={() => setOpen(false)} title={tr("Nova mensagem para a Upper Agency BR")}><form className="space-y-4" onSubmit={e => { e.preventDefault(); void submit(); }}><Field label={tr("Categoria")}><Select value={category} onValueChange={value => { const match = FEEDBACK_CATEGORIES.find(c => c === value); if (match) setCategory(match); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FEEDBACK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{tr(c)}</SelectItem>)}</SelectContent></Select></Field><Field label={tr("Mensagem")}><Textarea value={body} onChange={e => setBody(e.target.value)} maxLength={5000} rows={6} required placeholder={tr("Conte sua dúvida, sugestão ou o que não funcionou como esperava")} /></Field><Button type="submit" disabled={!body.trim() || actions.create.isPending}><Send className="h-4 w-4" />{actions.create.isPending ? tr("Enviando...") : tr("Enviar mensagem")}</Button></form></Modal>
  </div>;
}