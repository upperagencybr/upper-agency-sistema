import { z } from "zod";

export const FEEDBACK_CATEGORIES = ["Feedback", "Dúvidas", "Sugestões", "Melhorias", "Algo não funcionou"] as const;
export const feedbackSchema = z.object({ category: z.enum(FEEDBACK_CATEGORIES), body: z.string().trim().min(1, "Escreva sua mensagem").max(5000, "Use até 5.000 caracteres") });
export const feedbackReplySchema = z.object({ threadId: z.string().uuid(), body: feedbackSchema.shape.body });
export type FeedbackStatus = "nao-lido" | "lido" | "respondido";
export type FeedbackState = { user_id: string; last_sender: string; admin_read_at: string | null; user_read_at: string | null };
export function feedbackStatus(thread: FeedbackState): FeedbackStatus {
  if (thread.last_sender === "upper") return "respondido";
  return thread.admin_read_at ? "lido" : "nao-lido";
}
export function feedbackUnread(thread: FeedbackState, admin: boolean) {
  return admin ? thread.last_sender === "user" && !thread.admin_read_at : thread.last_sender === "upper" && !thread.user_read_at;
}
export function showFeedbackBubble(collapsed: boolean, path: string, dismissed = false) {
  return collapsed && path !== "/feedbacks";
}