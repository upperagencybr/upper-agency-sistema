import { describe, expect, it, vi, afterEach } from "vitest";
import { addMonths } from "@/lib/format";
import { buildNotices } from "@/lib/notices";
import { toCsv } from "@/lib/export";

afterEach(() => vi.useRealTimers());

describe("parcelas", () => {
  it("lança uma parcela por mês, mantendo o fim do mês", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-11-08", 2)).toBe("2027-01-08");
  });
});

describe("csv em pt-BR", () => {
  const csv = toCsv([
    { Descrição: "Consultoria; extra", Valor: 1500.5, "Data da baixa": "05/11/2026", Situação: "pago" },
    { Descrição: "Mensalidade", Valor: 900, "Data da baixa": null, Situação: "pendente" },
  ]);
  it("usa BOM, separador ;, decimal com vírgula e aspas quando o texto tem ;", () => {
    const [head, l1, l2] = csv.replace(/^\uFEFF/, "").split("\r\n");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(head).toBe("Descrição;Valor;Data da baixa;Situação");
    expect(l1).toBe('"Consultoria; extra";1500,50;05/11/2026;pago');
    expect(l2).toBe("Mensalidade;900,00;;pendente");
  });
});

describe("caixa de entrada", () => {
  const tx = (id: number, due: string, status = "pendente") => ({
    id, due_date: due, date: due, status, type: "receita", amount: 10, currency: "USD", description: "x", client_name: null,
  }) as never;
  it("avisa 7 dias antes, 3 dias antes, no dia e enquanto vencido, e ignora o que já foi pago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 12, 12));
    const n = buildNotices({ transactions: [tx(1, "2026-11-19"), tx(2, "2026-11-15"), tx(3, "2026-11-12"), tx(4, "2026-11-01"), tx(5, "2026-11-25"), tx(6, "2026-11-01", "pago")] });
    expect(n.map((x) => x.key).sort()).toEqual([
      "fin-1-2026-11-19-7", "fin-2-2026-11-15-3", "fin-3-2026-11-12-0", "fin-4-2026-11-01-late",
    ]);
  });
});

import { canSeeTab, bestRole } from "@/lib/team";
describe("acesso da equipe", () => {
  const func = { kind: "funcionario", role: "viewer", tabs: ["crm"], user_id: "u" };
  const socio = { kind: "socio", role: "admin", tabs: [], user_id: "u" };
  it("dono vê todas as abas", () => expect(canSeeTab("financeiro", true, [func])).toBe(true));
  it("funcionário só vê as abas liberadas", () => {
    expect(canSeeTab("crm", false, [func])).toBe(true);
    expect(canSeeTab("financeiro", false, [func])).toBe(false);
  });
  it("sócio vê todas as abas", () => expect(canSeeTab("financeiro", false, [socio])).toBe(true));
  it("vale o maior nível entre empresas", () => expect(bestRole([func, socio])).toBe("admin"));
});

import { accessBlocked } from "@/lib/billing";
describe("bloqueio da assinatura", () => {
  const now = Date.parse("2026-11-12T12:00:00Z");
  const h = 3600_000;
  const sub = (status: string, extra: Partial<{ current_period_end: string; past_due_since: string }> = {}) => ({ status, current_period_end: null, past_due_since: null, ...extra });
  it("quem não é assinante nunca é bloqueado", () => expect(accessBlocked(null, now)).toBe(false));
  it("teste e ativo liberados", () => { expect(accessBlocked(sub("trialing"), now)).toBe(false); expect(accessBlocked(sub("active"), now)).toBe(false); });
  it("pagamento falhou: libera por 24h, bloqueia depois", () => {
    expect(accessBlocked(sub("past_due", { past_due_since: new Date(now - 23 * h).toISOString() }), now)).toBe(false);
    expect(accessBlocked(sub("past_due", { past_due_since: new Date(now - 24 * h).toISOString() }), now)).toBe(true);
  });
  it("cancelado usa até o fim do período pago", () => {
    expect(accessBlocked(sub("canceled", { current_period_end: new Date(now + h).toISOString() }), now)).toBe(false);
    expect(accessBlocked(sub("canceled", { current_period_end: new Date(now - h).toISOString() }), now)).toBe(true);
  });
  it("acesso gratuito nunca vence e personalizado vence na data", () => {
    expect(accessBlocked(sub("manual"), now)).toBe(false);
    expect(accessBlocked(sub("manual", { current_period_end: new Date(now + h).toISOString() }), now)).toBe(false);
    expect(accessBlocked(sub("manual", { current_period_end: new Date(now - h).toISOString() }), now)).toBe(true);
  });
  it("pausado pelo dono fica bloqueado", () => expect(accessBlocked({ ...sub("active"), paused: true }, now)).toBe(true));
  it("inadimplente final bloqueia", () => expect(accessBlocked(sub("unpaid"), now)).toBe(true));
});

import { canCancelTrial, TRIAL_DAYS, PLANS as P2 } from "@/lib/billing";
describe("teste de 3 dias", () => {
  const n = Date.parse("2026-11-13T12:00:00Z");
  it("teste dura 3 dias", () => expect(TRIAL_DAYS).toBe(3));
  it("cancela com mais de 2h antes do fim", () => expect(canCancelTrial(new Date(n + 2 * 3600e3 + 60e3).toISOString(), n)).toBe(true));
  it("bloqueia cancelamento com menos de 2h", () => expect(canCancelTrial(new Date(n + 2 * 3600e3 - 60e3).toISOString(), n)).toBe(false));
  it("precos", () => { expect(P2.sistema_mensal.price).toBe("R$ 29,99/mês"); expect(P2.sistema_anual.price).toBe("R$ 239,88/ano"); });
});

import { PLANS as P3, TIERS } from "@/lib/billing";
describe("planos", () => {
  it("starter 19,99 mensal e 9,99/mês no anual", () => { expect(P3.starter_mensal.perMonth).toBe(19.99); expect(P3.starter_anual.perMonth).toBe(9.99); });
  it("business 29,99 mensal e 19,99/mês no anual", () => { expect(P3.sistema_mensal.perMonth).toBe(29.99); expect(P3.sistema_anual.perMonth).toBe(19.99); });
  it("enterprise 49,99 mensal e 39,99/mês no anual", () => { expect(P3.enterprise_mensal.perMonth).toBe(49.99); expect(P3.enterprise_anual.perMonth).toBe(39.99); });
  it("limites starter", () => expect([TIERS.starter.companies, TIERS.starter.socios, TIERS.starter.funcionarios]).toEqual([1, 0, 1]));
  it("limites business", () => expect([TIERS.business.companies, TIERS.business.socios, TIERS.business.funcionarios]).toEqual([2, 1, 3]));
  it("limites enterprise", () => expect([TIERS.enterprise.companies, TIERS.enterprise.socios, TIERS.enterprise.funcionarios]).toEqual([10, 10, 100]));
});
