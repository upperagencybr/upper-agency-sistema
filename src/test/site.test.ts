import { describe, expect, it } from "vitest";
import { foreignOriginFor, hostFromRequest, isSalesPath, siteMode, SALES_ORIGIN, SYSTEM_ORIGIN } from "@/lib/site";

describe("endereço de vendas x endereço do sistema", () => {
  it("nexohub reúne vendas e sistema, mantendo os endereços antigos", () => {
    expect(siteMode("hub.upperagencycompany.co")).toBe("sales");
    expect(siteMode("nexohub.upperagencycompany.co")).toBe("both");
    expect(siteMode("sistema.upperagencycompany.co")).toBe("system");
    expect(siteMode("localhost:8080")).toBe("both");
  });

  it("no hub, páginas do app vão para o endereço do sistema", () => {
    expect(foreignOriginFor("hub.upperagencycompany.co", "/dashboard")).toBe(SYSTEM_ORIGIN);
    expect(foreignOriginFor("hub.upperagencycompany.co", "/login")).toBe(SYSTEM_ORIGIN);
    expect(foreignOriginFor("hub.upperagencycompany.co", "/clientes/")).toBe(SYSTEM_ORIGIN);
  });

  it("páginas de venda ficam no hub", () => {
    expect(foreignOriginFor("hub.upperagencycompany.co", "/")).toBe("");
    expect(foreignOriginFor("hub.upperagencycompany.co", "/assinar")).toBe("");
    expect(foreignOriginFor("hub.upperagencycompany.co", "/assinar/obrigado")).toBe("");
    expect(isSalesPath("/assinar/")).toBe(true);
  });

  it("no endereço do sistema nada é mandado para outro lugar", () => {
    expect(foreignOriginFor("nexohub.upperagencycompany.co", "/")).toBe("");
    expect(foreignOriginFor("nexohub.upperagencycompany.co", "/dashboard")).toBe("");
  });

  it("a página de vendas é a raiz do nexohub", () => {
    expect(siteMode("nexohub.upperagencycompany.co")).toBe("both");
    expect(isSalesPath("/")).toBe(true);
    expect(foreignOriginFor("nexohub.upperagencycompany.co", "/")).toBe("");
  });

  it("o sistema abre no mesmo domínio em /sistema", () => {
    expect(isSalesPath("/sistema")).toBe(false);
    expect(foreignOriginFor("nexohub.upperagencycompany.co", "/sistema")).toBe("");
  });

  it("o login abre no mesmo domínio em /login", () => {
    expect(isSalesPath("/login")).toBe(false);
    expect(foreignOriginFor("nexohub.upperagencycompany.co", "/login")).toBe("");
  });

  it("lê o endereço real da requisição", () => {
    expect(hostFromRequest({ url: "https://hub.upperagencycompany.co/assinar" })).toBe("hub.upperagencycompany.co");
    expect(hostFromRequest({ url: "http://127.0.0.1:8080/", headers: new Headers({ "x-forwarded-host": "nexohub.upperagencycompany.co" }) })).toBe("nexohub.upperagencycompany.co");
  });

  it("vendas e sistema usam nexohub", () => {
    expect(SALES_ORIGIN).toBe("https://nexohub.upperagencycompany.co");
    expect(SYSTEM_ORIGIN).toBe("https://nexohub.upperagencycompany.co");
  });
});
