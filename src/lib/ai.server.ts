type Msg = { role: "system" | "user" | "assistant"; content: string };
/** Calls the Lovable AI Gateway and returns plain text without markdown bold or em dashes. */
export async function chatText(messages: Msg[]) {
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) throw new Error("Assistente indisponível");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/gpt-6.1-terra", messages }),
  });
  if (res.status === 429) throw new Error("Muitos pedidos seguidos, tente de novo em instantes.");
  if (res.status === 402) throw new Error("Créditos de IA esgotados no workspace.");
  if (res.status === 403) throw new Error("A IA está bloqueada para este workspace.");
  if (!res.ok) throw new Error("A IA não respondeu agora, tente de novo.");
  const j = await res.json();
  return String(j.choices?.[0]?.message?.content ?? "").replace(/\*\*/g, "").replace(/ — /g, ", ").replace(/—/g, ",");
}
