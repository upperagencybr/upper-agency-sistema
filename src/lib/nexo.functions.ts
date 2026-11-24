import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chatText } from "./ai.server";
import { canTestNexoContent } from "./content-access";

type Msg = { role: "user" | "assistant"; content: string };
type Input = { task: "post" | "reels" | "pautas" | "chat"; brand: string; prompt: string; model?: string; format?: string; messages?: Msg[] };

const BASE = `Você é a Nexo, a IA de conteúdo de Instagram da agência. Cria posts, carrosséis, reels, roteiros e pautas que vendem, sempre no tom da marca.
Todo conteúdo fecha com chamada para o cliente chamar, clicar ou comprar. Escreva em português do Brasil. Nunca use travessão, use vírgula. Não use markdown com asteriscos.`;

const TASKS: Record<Input["task"], string> = {
  post: `Crie o conteúdo pedido. Responda SOMENTE com JSON válido no formato {"title": string, "caption": string, "hashtags": string, "slides": [{"title": string, "text": string}]}.
Carrossel: de 5 a 8 slides com gancho, desenvolvimento e fechamento com chamada. Stories: de 3 a 5 telas. Post único: 1 slide. Reels: 1 slide de capa e o roteiro na legenda.
Títulos de slide curtos e fortes, em até 8 palavras. Textos de slide em até 25 palavras.`,
  reels: `Crie um roteiro de reels sem precisar aparecer, pronto para gravar a tela ou animar. Estruture em cenas numeradas, cada uma com: TEXTO NA TELA, NARRAÇÃO, IMAGEM SUGERIDA e DURAÇÃO em segundos. Termine com trilha sugerida, legenda e hashtags.`,
  pautas: `Monte um calendário de pautas do mês: 12 ideias distribuídas em 4 semanas, cada uma com dia sugerido, formato (carrossel, reels, stories ou post), tema, gancho e chamada. Use listas simples.`,
  chat: `Converse e ajude com qualquer coisa de conteúdo, marketing, roteiro, legenda, script de vendas e estratégia de Instagram.`,
};

export const nexoGenerate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Input) => {
    if (!d || !TASKS[d.task]) throw new Error("Pedido inválido");
    return {
      task: d.task, brand: String(d.brand ?? "").slice(0, 2000), prompt: String(d.prompt ?? "").slice(0, 4000),
      model: String(d.model ?? "").slice(0, 60), format: String(d.format ?? "").slice(0, 60),
      messages: (d.messages ?? []).slice(-12).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 4000) })) as Msg[],
    };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !canTestNexoContent(isAdmin ?? undefined)) throw new Error("NEXIA em breve.");
    const system = `${BASE}\n\n${TASKS[data.task]}\n\nMarca:\n${data.brand || "não informada"}`;
    const msgs: { role: "system" | "user" | "assistant"; content: string }[] = [{ role: "system", content: system }];
    if (data.task === "chat") msgs.push(...data.messages);
    else msgs.push({ role: "user", content: `Tema: ${data.prompt}${data.format ? `\nFormato: ${data.format}` : ""}${data.model ? `\nModelo visual: ${data.model}` : ""}` });
    const text = await chatText(msgs);
    return { text };
  });
