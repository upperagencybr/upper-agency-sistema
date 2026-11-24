import { daysUntil, fmtDate, money } from "./format";
import type { Row } from "./data";
import { translateText } from "./i18n";

export type Notice = { key: string; title: string; detail: string; date: string; days: number; kind: string; to: string };

function stage(days: number) {
  if (days < 0) return "late";
  if (days === 0) return "0";
  if (days <= 3) return "3";
  if (days <= 7) return "7";
  return null;
}

export function whenLabel(days: number, lang = "pt") {
  if (days < 0) return translateText("Vencido há {0} dia{1}", lang, [-days, days === -1 ? "" : "s"]);
  if (days === 0) return translateText("Vence hoje", lang);
  return translateText("Faltam {0} dia{1}", lang, [days, days === 1 ? "" : "s"]);
}

export const NOTICE_TYPES = [
  { kind: "fin", label: "Financeiro (contas a pagar e a receber)" },
  { kind: "proj", label: "Prazos de projetos" },
  { kind: "ment", label: "Contato com mentorados" },
  { kind: "crm", label: "Retorno de contato (CRM)" },
  { kind: "cont", label: "Contabilidade" },
] as const;
export const NOTICE_DAY_OPTIONS = [0, 1, 3, 7, 15, 30] as const;
export type NoticePref = { on: boolean; days: number };
export type NoticePrefs = Record<string, NoticePref>;
export const DEFAULT_PREF: NoticePref = { on: true, days: 7 };
export function prefFor(prefs: unknown, kind: string): NoticePref {
  const p = (prefs && typeof prefs === "object" ? (prefs as Record<string, Partial<NoticePref>>)[kind] : undefined) ?? {};
  return { on: p.on ?? DEFAULT_PREF.on, days: typeof p.days === "number" ? p.days : DEFAULT_PREF.days };
}

export function buildNotices(src: {
  transactions?: Row<"transactions">[] | undefined;
  accounting?: Row<"accounting_tasks">[] | undefined;
  projects?: Row<"projects">[] | undefined;
  mentoring?: Row<"mentoring_sessions">[] | undefined;
  leads?: Row<"crm_leads">[] | undefined;
  prefs?: unknown;
  hide?: string[];
  lang?: string;
}): Notice[] {
  const out: Notice[] = [];
  const push = (kind: string, id: number, date: string | null, title: string, detail: string, to: string) => {
    if (!date) return;
    if (src.hide?.includes(kind)) return;
    const pref = prefFor(src.prefs, kind);
    if (!pref.on) return;
    const days = daysUntil(date);
    if (days > pref.days) return;
    const st = days > 7 ? "far" : stage(days);
    if (!st) return;
    out.push({ key: `${kind}-${id}-${date}-${st}`, title, detail, date, days, kind, to });
  };
  for (const t of src.transactions ?? []) {
    if (t.status === "pago") continue;
    const rec = t.type === "receita";
    push("fin", t.id, t.due_date || t.date, translateText(rec ? "A receber: {0}" : "A pagar: {0}", src.lang, [t.description ?? ""]),
      `${money(t.amount, t.currency)}${t.client_name ? `, ${t.client_name}` : ""}`, "/financeiro");
  }
  for (const a of src.accounting ?? []) if (!a.done) push("cont", a.id, a.due_date, translateText("Contabilidade: {0}", src.lang, [a.title]), a.due_day ?? "", "/contabilidade");
  for (const p of src.projects ?? []) if (p.stage !== "concluido") push("proj", p.id, p.due_date, translateText("Prazo do projeto: {0}", src.lang, [p.name]), p.company ?? "", "/projetos");
  for (const m of src.mentoring ?? []) push("ment", m.id, m.contact_date, translateText("Verificar mentorado: {0}", src.lang, [m.mentee_name ?? ""]), m.next_step ?? "", "/mentorados");
  for (const l of src.leads ?? []) {
    if (l.stage === "fechado" || l.stage === "sem_interesse") continue;
    push("crm", l.id, l.follow_up_date, translateText("Retorno de contato: {0}", src.lang, [l.name]), l.company ?? "", "/crm");
  }
  return out.sort((a, b) => a.days - b.days);
}

export { fmtDate };
