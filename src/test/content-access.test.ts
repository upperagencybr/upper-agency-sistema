import { describe, expect, it } from "vitest";
import { canTestNexoContent } from "@/lib/content-access";

describe("Conteúdo Nexo em desenvolvimento", () => {
  it.each(["starter", "business", "enterprise"])("não libera %s sem ser a Upper", () => {
    expect(canTestNexoContent(false)).toBe(false);
  });
  it("somente a Upper pode testar", () => { expect(canTestNexoContent(true)).toBe(true); });
  it("não libera enquanto a permissão está carregando", () => { expect(canTestNexoContent(undefined)).toBe(false); });
});