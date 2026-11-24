import { useI18n } from "@/lib/i18n-context";
import { useIsAdmin } from "@/lib/subscription";
import { DateInput } from "@/components/app/DateInput";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { useProfile, useRows, useTableMutations, useUpdateProfile, type Row } from "@/lib/data";
import { daysUntil, fmtDate, money, todayStr } from "@/lib/format";
import { whenLabel } from "@/lib/notices";
import { askContador } from "@/lib/contador.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Modal, PageHeader, Panel } from "@/components/app/ui";
import { MonthNav, monthName } from "@/components/app/PeriodNav";

export const Route = createFileRoute("/_app/contabilidade")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Contabilidade | NEXO HUB" },
      { name: "description", content: "Visão do mês do MEI, checklist de obrigações e chat do contador." },
      { property: "og:title", content: "Contabilidade | NEXO HUB" },
      { property: "og:description", content: "Visão do mês do MEI e chat do contador." },
    ],
  }),
  component: Contabilidade,
});

type Task = Row<"accounting_tasks">;

function Contabilidade() {
  const { tr, lang } = useI18n();
  const { data: isAdmin, isLoading } = useIsAdmin();
  if (isLoading) return null;
  if (!isAdmin) return <div className="p-6 text-sm text-muted-foreground">{tr("Esta aba não está disponível na sua conta.")}</div>;
  return <ContabilidadeInner />;
}

function ContabilidadeInner() {
  const { tr, lang } = useI18n();
  const { data: tasks = [] } = useRows("accounting_tasks");
  const { data: txs = [] } = useRows("transactions");
  const { data: profile } = useProfile();
  const upProfile = useUpdateProfile();
  const m = useTableMutations("accounting_tasks");
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [edit, setEdit] = useState<Partial<Task> | null>(null);
  const [chat, setChat] = useState(false);
  const das = Number(profile?.das_value ?? 80.9);
  const limit = Number(profile?.mei_limit ?? 81000);

  const brl = txs.filter((t) => t.currency === "BRL");
  const day = (t: Row<"transactions">) => t.due_date || t.date || "";
  const sum = (a: Row<"transactions">[]) => a.reduce((s, t) => s + Number(t.amount), 0);
  const recMonth = brl.filter((t) => t.type === "receita" && day(t).startsWith(month));
  const fat = sum(recMonth);
  const got = sum(recMonth.filter((t) => t.status === "pago"));
  const despMonth = sum(brl.filter((t) => t.type === "despesa" && day(t).startsWith(month)));
  const year = month.slice(0, 4);
  const yearRec = sum(brl.filter((t) => t.type === "receita" && day(t).startsWith(year) && day(t).slice(0, 7) <= month));
  const monthsElapsed = Number(month.slice(5, 7));
  const avg = yearRec / monthsElapsed;
  const pct = limit ? (yearRec / limit) * 100 : 0;
  const done = tasks.filter((t) => t.done).length;
  const sorted = [...tasks].sort((a, b) => Number(a.done) - Number(b.done) || (a.due_date ?? "").localeCompare(b.due_date ?? ""));

  const tips = [
    fat - got > 0 ? tr("Você tem {0} a receber neste mês. O imposto do MEI não depende disso, mas o relatório mensal considera o faturamento bruto, recebido ou não.", [money(fat - got, "BRL")]) : "Tudo que foi lançado neste mês já foi recebido.",
    tr("O DAS vence no dia 20 de cada mês. Deixe reservado: {0}.", [money(das, "BRL")]),
    "Preencha o relatório mensal de receitas deste mês: ele é a base da sua declaração anual (DASN-SIMEI).",
    ...(pct > 80 ? [tr("Atenção: você já usou {0}% do teto anual do MEI.", [pct.toFixed(1)])] : []),
  ];
  const context = `Mês ${monthName(month)}: faturamento ${money(fat, "BRL")} (recebido ${money(got, "BRL")}), despesas ${money(despMonth, "BRL")}, DAS ${money(das, "BRL")}. Acumulado no ano ${money(yearRec, "BRL")} de teto ${money(limit, "BRL")} (${pct.toFixed(1)}%). Média mensal ${money(avg, "BRL")}, projeção anual ${money(avg * 12, "BRL")}. Obrigações: ${tasks.map((t) => `${t.title}${t.done ? " (feita)" : ""}`).join("; ")}.`;

  const save = async () => {
    if (!edit?.title) { toast.error(tr("Informe o título")); return; }
    const { id, user_id: _u, created_at: _c, ...rest } = edit as Task;
    if (id) await m.update.mutateAsync({ id, ...rest }); else await m.insert.mutateAsync(rest);
    setEdit(null);
  };

  return (
    <div>
      <PageHeader title={tr("Contabilidade")} sub={tr("Checklist de obrigações do MEI, {0} de {1} feitas. Edite, adicione ou exclua o que fizer sentido para a sua empresa.", [done, tasks.length])}
        actions={<Button onClick={() => setEdit({ due_date: todayStr() })}>{tr("+ Nova obrigação")}</Button>} />

      <Panel title={tr("Seu contador, visão do mês")} action={<MonthNav value={month} onChange={setMonth} />} className="mb-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card label={tr("Faturamento do mês (receitas lançadas)")} value={money(fat, "BRL")} tone="text-success" sub={tr("recebido {0}, a receber {1}", [money(got, "BRL"), money(fat - got, "BRL")])} />
          <Card label={tr("Despesas do mês")} value={money(despMonth, "BRL")} tone="text-destructive" />
          <Card label={tr("Imposto do mês (DAS do MEI)")} value={money(das, "BRL")} tone="text-warning" sub={fat ? tr("alíquota efetiva: {0}% do faturamento do mês", [((das / fat) * 100).toFixed(1)]) : undefined} />
          <Card label={tr("Faturamento acumulado no ano")} value={money(yearRec, "BRL")} sub={`${pct.toFixed(1)}% do teto`} />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded bg-muted"><div className={`h-full ${pct > 80 ? "bg-destructive" : "bg-success"}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
        <p className="mt-2 text-xs text-muted-foreground">{tr("Média mensal de faturamento no ano:")} <b className="text-foreground">{money(avg, "BRL")}</b>{tr(", projeção do ano (média x 12):")} <b className="text-foreground">{money(avg * 12, "BRL")}</b></p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label={tr("Valor do DAS mensal (R$)")}><input type="number" step="0.01" className="field" key={`d${das}`} defaultValue={das} onBlur={(e) => Number(e.target.value) !== das && upProfile.mutate({ das_value: Number(e.target.value) })} /></Field>
          <Field label={tr("Teto anual do MEI (R$)")}><input type="number" className="field" key={`l${limit}`} defaultValue={limit} onBlur={(e) => Number(e.target.value) !== limit && upProfile.mutate({ mei_limit: Number(e.target.value) })} /></Field>
        </div>
        <div className="mt-3 rounded-md bg-muted/50 p-3">
          <div className="kpi-label mb-2">{tr("Orientações do contador")}</div>
          <ul className="list-disc space-y-1 pl-5 text-sm marker:text-success">{tips.map((t) => <li key={t}>{tr(t)}</li>)}</ul>
        </div>
      </Panel>

      <Panel>
        <ul className="divide-y divide-border">
          {sorted.map((t) => {
            const d = t.due_date ? daysUntil(t.due_date) : null;
            return (
              <li key={t.id} className="flex items-start gap-3 py-3">
                <Checkbox className="mt-1 h-6 w-6" checked={t.done} onCheckedChange={(v) => m.update.mutate({ id: t.id, done: !!v })} aria-label={tr("Concluída")} />
                <div className="min-w-0 flex-1">
                  <div className={`font-medium ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.title}</div>
                  {t.description && <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>}
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {t.due_day && <span>{t.due_day}</span>}
                    {t.due_date && <span>{tr("Próximo vencimento:")} {fmtDate(t.due_date)}</span>}
                    {d !== null && !t.done && <span className={d < 0 ? "text-destructive" : d <= 7 ? "text-warning" : ""}>{whenLabel(d, lang)}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setEdit(t)}>{tr("Editar")}</Button>
                  <Button size="sm" variant="outline" onClick={() => confirm(tr("Excluir obrigação?")) && m.remove.mutate(t.id)}>{tr("Excluir")}</Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? tr("Editar obrigação") : tr("Nova obrigação")}>
        {edit && (
          <div className="space-y-3">
            <Field label={tr("Título")}><input className="field" value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label={tr("Descrição")}><textarea className="field min-h-20" value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr("Quando vence (ex.: Dia 20 de cada mês)")}><input className="field" value={edit.due_day ?? ""} onChange={(e) => setEdit({ ...edit, due_day: e.target.value })} /></Field>
              <Field label={tr("Próximo vencimento")}><DateInput value={edit.due_date ?? ""} onChange={(e) => setEdit({ ...edit, due_date: e.target.value || null })} /></Field>
            </div>
            <div className="flex justify-end"><Button onClick={save}>{tr("Salvar")}</Button></div>
          </div>
        )}
      </Modal>

      {!chat && <button onClick={() => setChat(true)} className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-lg"><MessageCircle className="h-5 w-5" />{tr("Chat do contador")}</button>}
      {chat && <ContadorChat context={context} onClose={() => setChat(false)} />}
    </div>
  );
}

function Card({ label, value, sub, tone = "" }: { label: string; value: string; sub?: string | undefined; tone?: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-3">
      <div className="kpi-label">{label}</div>
      <div className={`mt-1 text-xl font-bold ${tone}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

const SUGGESTIONS = ["Estou perto de passar do limite do MEI?", "O que acontece se eu passar do limite do MEI?", "Quando vence o DAS e o que acontece se atrasar?", "Preciso emitir nota fiscal para pessoa física?"];

function ContadorChat({ context, onClose }: { context: string; onClose: () => void }) {
  const { tr, lang } = useI18n();
  const ask = useServerFn(askContador);
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Olá! Eu sou o seu contador aqui dentro do sistema. Pode perguntar sobre DAS, limite do MEI, nota fiscal, declaração anual e outras obrigações, que eu explico de um jeito simples e já olho os seus números lançados aqui." },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  const send = async (q: string) => {
    if (!q.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content: q.trim() }];
    setMsgs(next); setText(""); setBusy(true);
    try {
      const r = await ask({ data: { messages: next.slice(1), context } });
      setMsgs([...next, { role: "assistant", content: r.reply }]);
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="panel fixed bottom-4 right-4 z-50 flex h-[640px] max-h-[85vh] w-[420px] max-w-[calc(100vw-2rem)] flex-col shadow-2xl">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div className="rounded-full bg-primary p-2 text-primary-foreground"><MessageCircle className="h-4 w-4" /></div>
        <div className="flex-1"><div className="font-semibold">{tr("Chat do contador")}</div><p className="text-xs text-muted-foreground">{tr("Pergunte sobre DAS, limite do MEI, notas fiscais, declarações e outras obrigações. As respostas usam os lançamentos que você já fez no sistema.")}</p></div>
        <button aria-label={tr("Fechar")} onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {msgs.map((m, i) => <div key={i} className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "ml-8 bg-primary text-primary-foreground" : "mr-6 bg-muted"}`}>{m.content}</div>)}
        {msgs.length === 1 && SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="block rounded-full border border-border px-3 py-1.5 text-left text-xs font-medium hover:border-primary">{tr(s)}</button>)}
        {busy && <div className="mr-6 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{tr("Pensando...")}</div>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2 border-t border-border p-3">
        <textarea autoFocus className="field min-h-12 flex-1 resize-none" placeholder={tr("Pergunte sobre DAS, limite, nota fiscal, declaração...")} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} />
        <Button type="submit" disabled={busy}>{tr("Enviar")}</Button>
      </form>
    </div>
  );
}
