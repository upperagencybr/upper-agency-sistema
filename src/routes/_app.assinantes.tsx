import { useI18n } from "@/lib/i18n-context";
import { SubscribersDash } from "@/components/app/SubscribersDash";
import { PeriodNav, defaultPeriod, periodRange, type Period } from "@/components/app/PeriodNav";
import { DateInput } from "@/components/app/DateInput";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/ui";
import { fmtDate } from "@/lib/format";
import { MANUAL_PLANS, PLANS, situation, type SubSituation } from "@/lib/billing";
import { useAllSubscriptions, useIsAdmin } from "@/lib/subscription";
import { getStripeEnvironment } from "@/lib/stripe";
import { SALES_ORIGIN } from "@/lib/site";
import { changeSubscriberEmail, adminSubscriptionAction, createManualSubscriber, endManualAccess, resendAccess } from "@/lib/payments.functions";

export const Route = createFileRoute("/_app/assinantes")({
  head: () => ({
    meta: [
      { title: "Assinantes | Nexo Hub" },
      { name: "description", content: "Quem assinou o sistema, teste, pagamento e acesso." },
      { property: "og:title", content: "Assinantes | Nexo Hub" },
      { property: "og:description", content: "Assinantes do sistema." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assinantes,
});

const SIT: Record<SubSituation, { label: string; cls: string }> = {
  teste: { label: "Em teste", cls: "text-primary" },
  ativo: { label: "Ativo, em dia", cls: "text-success" },
  atrasado: { label: "Atrasado (nova tentativa em 24h)", cls: "text-primary" },
  cancelando: { label: "Cancelado, acesso até o fim do período", cls: "text-muted-foreground" },
  cancelado: { label: "Cancelado, sem acesso", cls: "text-destructive" },
  pausado: { label: "Pausado por você, sem acesso", cls: "text-muted-foreground" },
  cortesia: { label: "Cortesia, liberado", cls: "text-success" },
  bloqueado: { label: "Atrasado, sistema indisponível", cls: "text-destructive" },
};

function Assinantes() {
  const { tr } = useI18n();
  const { data: isAdmin, isLoading } = useIsAdmin();
  const { data: subs = [] } = useAllSubscriptions(!!isAdmin);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [nf, setNf] = useState({ name: "", email: "", country: "", kind: "gratuito", until: "" });
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState<Period>(() => defaultPeriod("30"));

  if (isLoading) return null;
  if (!isAdmin) return <p className="text-sm text-muted-foreground">{tr("Esta aba é só da conta dona do sistema.")}</p>;

  const resend = async (id: string) => {
    try { await resendAccess({ data: { subscriptionId: id, origin: window.location.origin } }); toast.success(tr("Link para criar nova senha enviado")); }
    catch (e) { toast.error((e as Error).message); }
  };
  const saveEmail = async (id: string) => {
    try { await changeSubscriberEmail({ data: { subscriptionId: id, email } }); toast.success(tr("E-mail trocado")); setEditing(null); qc.invalidateQueries({ queryKey: ["all-subscriptions"] }); }
    catch (e) { toast.error((e as Error).message); }
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["all-subscriptions"] });
  const createNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nf.kind === "personalizado" && !nf.until) { toast.error(tr("Escolha até quando o acesso vale")); return; }
    setSaving(true);
    try {
      await createManualSubscriber({ data: { name: nf.name, email: nf.email, country: nf.country, until: nf.kind === "personalizado" ? nf.until : null, environment: getStripeEnvironment() } });
      toast.success(tr("Acesso criado. A pessoa recebe um e-mail para criar a senha."));
      setNf({ name: "", email: "", country: "", kind: "gratuito", until: "" }); setShowNew(false); refresh();
    } catch (err) { toast.error((err as Error).message); }
    setSaving(false);
  };
  const act = async (id: string, action: "cancel" | "pause" | "reactivate", period?: "mensal" | "anual") => {
    const ask = action === "cancel" ? "Cancelar o plano desta pessoa agora? O acesso termina na hora." : action === "pause" ? "Pausar? A pessoa fica sem acesso e não é cobrada até você reativar." : null;
    if (ask && !confirm(ask)) return;
    const r = await adminSubscriptionAction({ data: { subscriptionId: id, action, ...(period && { period }) } });
    if ("error" in r) { toast.error(r.error); return; }
    toast.success(action === "cancel" ? tr("Plano cancelado") : action === "pause" ? tr("Plano pausado") : tr("Reativado ({0})", [period])); refresh();
  };
  const endAccess = async (id: string) => {
    if (!confirm(tr("Encerrar o acesso desta pessoa agora?"))) return;
    try { await endManualAccess({ data: { subscriptionId: id } }); toast.success(tr("Acesso encerrado")); refresh(); }
    catch (err) { toast.error((err as Error).message); }
  };

  return (
    <div>
      <PageHeader
        title={tr("Assinantes")}
        actions={
          <>
            <PeriodNav value={period} onChange={setPeriod} modes={["30", "60", "90", "custom"]} />
            <Button onClick={() => setShowNew((v) => !v)}>{tr("+ Novo assinante")}</Button>
          </>
        }
        sub={tr("{0} assinante(s). Link para vender: {1}/assinar", [subs.length, SALES_ORIGIN])}
      />
      <SubscribersDash subs={subs as never} period={periodRange(period)} />
      {showNew && (
        <form onSubmit={createNew} className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1 text-sm">{tr("Nome")}<input className="field" required value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} /></label>
          <label className="grid gap-1 text-sm">{tr("E-mail (login)")}<input className="field" type="email" required value={nf.email} onChange={(e) => setNf({ ...nf, email: e.target.value })} /></label>
          <label className="grid gap-1 text-sm">{tr("País")}<input className="field" value={nf.country} onChange={(e) => setNf({ ...nf, country: e.target.value })} /></label>
          <label className="grid gap-1 text-sm">{tr("Tipo de acesso")} <select className="field" value={nf.kind} onChange={(e) => setNf({ ...nf, kind: e.target.value })}>
              <option value="gratuito">{tr("Gratuito, sem data para acabar")}</option>
              <option value="personalizado">{tr("Personalizado, até uma data")}</option>
            </select>
          </label>
          {nf.kind === "personalizado" && <label className="grid gap-1 text-sm">{tr("Acesso até")}<DateInput value={nf.until} onChange={(e) => setNf({ ...nf, until: e.target.value })} /></label>}
          <div className="flex items-end gap-2"><Button type="submit" disabled={saving}>{saving ? tr("Criando...") : tr("Criar acesso")}</Button><Button type="button" variant="ghost" onClick={() => setShowNew(false)}>{tr("Cancelar")}</Button></div>
        </form>
      )}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>{["Nome", "E-mail (login)", "País", "Plano", "Comprou em", "Teste de 3 dias", "Pagamento", "Acesso"].map((h) => <th key={h} className="border-b border-r border-border px-3 py-2 last:border-r-0">{tr(h)}</th>)}</tr>
          </thead>
          <tbody>
            {subs.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">{tr("Nenhum assinante ainda.")}</td></tr>}
            {subs.map((s) => {
              const sit = SIT[situation(s)];
              const trialEnd = s.trial_end ? Date.parse(s.trial_end) : null;
              const plan = PLANS[s.price_id as keyof typeof PLANS]?.label ?? MANUAL_PLANS[s.price_id ?? ""] ?? s.price_id ?? "-";
              const manualEnd = s.status === "manual" ? (s.current_period_end ? tr("Até {0}", [fmtDate(s.current_period_end)]) : "Sem data para acabar") : null;
              return (
                <tr key={s.id} className="odd:bg-muted/10">
                  <td className="border-b border-r border-border px-3 py-2 font-medium text-primary">{s.name ?? "-"}</td>
                  <td className="border-b border-r border-border px-3 py-2">
                    {editing === s.id ? (
                      <div className="flex gap-1"><input className="field h-8" value={email} onChange={(e) => setEmail(e.target.value)} /><Button size="sm" onClick={() => saveEmail(s.id)}>{tr("Salvar")}</Button></div>
                    ) : s.email}
                  </td>
                  <td className="border-b border-r border-border px-3 py-2">{s.country ?? "-"}</td>
                  <td className="border-b border-r border-border px-3 py-2">{tr(plan)}</td>
                  <td className="border-b border-r border-border px-3 py-2">{fmtDate(s.created_at)}</td>
                  <td className="border-b border-r border-border px-3 py-2">{manualEnd ?? (trialEnd ? (trialEnd > Date.now() ? tr("Em teste até {0}", [fmtDate(s.trial_end!)]) : tr("Terminou em {0}", [fmtDate(s.trial_end!)])) : "-")}</td>
                  <td className={`border-b border-r border-border px-3 py-2 ${sit.cls}`}>{tr(sit.label)}</td>
                  <td className="border-b border-border px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => resend(s.id)}>{tr("Enviar nova senha")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(s.id); setEmail(s.email); }}>{tr("Trocar e-mail")}</Button>
                      {s.status === "manual" && sit.label !== SIT.cancelado.label && !s.paused && <Button size="sm" variant="ghost" onClick={() => endAccess(s.id)}>{tr("Encerrar acesso")}</Button>}
                      {s.status !== "manual" && !["cancelado", "pausado"].includes(situation(s)) && <Button size="sm" variant="ghost" onClick={() => act(s.id, "cancel")}>{tr("Cancelar plano")}</Button>}
                      {!["cancelado", "pausado"].includes(situation(s)) && <Button size="sm" variant="ghost" onClick={() => act(s.id, "pause")}>{tr("Pausar")}</Button>}
                      {["cancelado", "pausado"].includes(situation(s)) && (
                        <select className="field h-8 w-auto text-xs" value="" onChange={(e) => e.target.value && act(s.id, "reactivate", e.target.value as "mensal" | "anual")}>
                          <option value="">{tr("Reativar...")}</option>
                          <option value="mensal">{tr("Reativar mensal")}</option>
                          <option value="anual">{tr("Reativar anual")}</option>
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{tr("Por segurança, as senhas não ficam visíveis para ninguém. Cada assinante cria a própria senha pelo link do e-mail e pode trocá-la quando quiser; o e-mail de login só você troca.")}</p>
    </div>
  );
}
