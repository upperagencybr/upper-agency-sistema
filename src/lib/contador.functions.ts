import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chatText } from "./ai.server";

const SYSTEM = `Você é um contador brasileiro especialista em MEI e obrigações fiscais, dentro do sistema da empresa.
Pode ajudar com: abertura de CNPJ, gestão fiscal, notas fiscais, pró-labore, folha de pagamento, apuração de impostos, declarações e obrigações fiscais, conciliação bancária e leitura do painel contábil.
Use os números do sistema abaixo quando forem úteis. Se a pergunta fugir desse tema, diga educadamente que só pode ajudar com contabilidade.
Responda em português, de forma simples, curta e prática. Não use travessão, use vírgula.`;

type Msg = { role: "user" | "assistant"; content: string };

export const askContador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messages: Msg[]; context?: string }) => {
    if (!Array.isArray(d?.messages) || d.messages.length === 0) throw new Error("Mensagem vazia");
    return {
      context: String(d.context ?? "").slice(0, 3000),
      messages: d.messages.slice(-12).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 4000) })) as Msg[],
    };
  })
  .handler(async ({ data }) => {
    const reply = await chatText([{ role: "system", content: `${SYSTEM}\n\nNúmeros do sistema:\n${data.context}` }, ...data.messages]);
    return { reply };
  });
