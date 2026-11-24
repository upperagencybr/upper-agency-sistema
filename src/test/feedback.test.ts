import { describe, expect, it } from "vitest";
import { FEEDBACK_CATEGORIES, feedbackSchema, feedbackStatus, feedbackUnread, showFeedbackBubble } from "@/lib/feedback";

const thread = { user_id: "aluno", last_sender: "user", admin_read_at: null, user_read_at: null };
describe("Feedbacks", () => {
  it("oferece as quatro categorias pedidas e relato de falha", () => {
    expect(FEEDBACK_CATEGORIES).toEqual(["Feedback", "Dúvidas", "Sugestões", "Melhorias", "Algo não funcionou"]);
  });
  it("mensagem nova é não lida para a Upper", () => {
    expect(feedbackStatus(thread)).toBe("nao-lido");
    expect(feedbackUnread(thread, true)).toBe(true);
    expect(feedbackUnread(thread, false)).toBe(false);
  });
  it("ler muda o filtro para lido", () => {
    expect(feedbackStatus({ ...thread, admin_read_at: "2026-11-13T15:32:00Z" })).toBe("lido");
  });
  it("resposta avisa apenas o aluno e aparece no filtro respondido", () => {
    const replied = { ...thread, last_sender: "upper", admin_read_at: "2026-11-13T15:32:00Z" };
    expect(feedbackStatus(replied)).toBe("respondido");
    expect(feedbackUnread(replied, false)).toBe(true);
    expect(feedbackUnread(replied, true)).toBe(false);
    expect(feedbackUnread({ ...replied, user_read_at: "2026-11-13T15:34:00Z" }, false)).toBe(false);
  });
  it("balão só aparece com lateral recolhida fora dos feedbacks", () => {
    expect(showFeedbackBubble(false, "/sistema")).toBe(false);
    expect(showFeedbackBubble(true, "/sistema")).toBe(true);
    expect(showFeedbackBubble(true, "/feedbacks")).toBe(false);
    expect(showFeedbackBubble(true, "/sistema", true)).toBe(false);
    expect(showFeedbackBubble(true, "/sistema", false)).toBe(true);
  });
  it("rejeita mensagens vazias e categoria inválida", () => {
    expect(feedbackSchema.safeParse({ category: "Dúvidas", body: " " }).success).toBe(false);
    expect(feedbackSchema.safeParse({ category: "Outra", body: "Mensagem" }).success).toBe(false);
    expect(feedbackSchema.parse({ category: "Melhorias", body: " Meu pedido " }).body).toBe("Meu pedido");
  });
});