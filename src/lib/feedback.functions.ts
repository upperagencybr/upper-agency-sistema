import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { feedbackSchema, feedbackReplySchema } from "@/lib/feedback";

export const createFeedback = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(feedbackSchema).handler(async ({ data, context }) => {
  const { data: id, error } = await context.supabase.rpc("create_feedback", { _category: data.category, _body: data.body });
  if (error) throw new Error("Não foi possível enviar sua mensagem. Tente novamente.");
  return id;
});
export const replyFeedback = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(feedbackReplySchema).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("reply_feedback", { _thread_id: data.threadId, _body: data.body });
  if (error) throw new Error("Não foi possível enviar a resposta. Tente novamente.");
  return { ok: true };
});
export const readFeedback = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ threadId: z.string().uuid() })).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("read_feedback", { _thread_id: data.threadId });
  if (error) throw new Error("Não foi possível marcar a conversa como lida.");
  return { ok: true };
});