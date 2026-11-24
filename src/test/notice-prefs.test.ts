import { describe, expect, it } from "vitest";
import { buildNotices } from "@/lib/notices";

const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const proj = (id: number, due: string) => ({ id, name: `P${id}`, stage: "andamento", due_date: due, company: null }) as never;

describe("lembretes", () => {
  it("padrão mostra até 7 dias antes", () => {
    expect(buildNotices({ projects: [proj(1, inDays(5)), proj(2, inDays(10))] }).map(n => n.title)).toEqual(["Prazo do projeto: P1"]);
  });
  it("respeita antecedência escolhida", () => {
    expect(buildNotices({ projects: [proj(1, inDays(5))], prefs: { proj: { on: true, days: 3 } } })).toHaveLength(0);
    expect(buildNotices({ projects: [proj(2, inDays(10))], prefs: { proj: { on: true, days: 15 } } })).toHaveLength(1);
  });
  it("desligado não mostra", () => {
    expect(buildNotices({ projects: [proj(1, inDays(0))], prefs: { proj: { on: false, days: 7 } } })).toHaveLength(0);
  });
  it("contabilidade escondida para clientes", () => {
    const acc = [{ id: 1, title: "DAS", done: false, due_date: inDays(1), due_day: "" }] as never;
    expect(buildNotices({ accounting: acc, hide: ["cont"] })).toHaveLength(0);
  });
});
