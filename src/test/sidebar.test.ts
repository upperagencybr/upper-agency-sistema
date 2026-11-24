import { describe, expect, it } from "vitest";
import { toggleHiddenSection, visibleSidebarItems } from "@/lib/sidebar";

describe("Abas escondidas por conta", () => {
  it.each(["/dashboard", "/financeiro", "/empresas", "/feedbacks", "/conteudo", "/adquira"])("mantém a aba padrão %s visível e impede ocultá-la", (path) => {
    expect(visibleSidebarItems([{ to: path }], [path])).toEqual([{ to: path }]);
    expect(toggleHiddenSection([], path)).toEqual([]);
    expect(toggleHiddenSection([path, "/crm"], path)).toEqual(["/crm"]);
  });
  const items = [{ to: "/clientes" }, { to: "/mentorados" }, { to: "/financeiro" }];
  it("esconde Mentorados sem remover outras abas ou alterar a lista original", () => {
    expect(visibleSidebarItems(items, ["/mentorados"])).toEqual([{ to: "/clientes" }, { to: "/financeiro" }]);
    expect(items).toHaveLength(3);
  });
  it("restaura a mesma aba ao clicar novamente", () => {
    const hidden = toggleHiddenSection([], "/mentorados");
    expect(hidden).toEqual(["/mentorados"]);
    expect(toggleHiddenSection(hidden, "/mentorados")).toEqual([]);
  });
  it("a preferência de uma conta não afeta outra", () => {
    expect(visibleSidebarItems(items, ["/mentorados"])).toHaveLength(2);
    expect(visibleSidebarItems(items, [])).toEqual(items);
  });
  it("voltar ao padrão mostra todas as abas permitidas sem inserir abas não autorizadas", () => {
    expect(visibleSidebarItems(items, [])).toEqual(items);
    expect(visibleSidebarItems(items, []).some(item => item.to === "/assinantes")).toBe(false);
  });
});