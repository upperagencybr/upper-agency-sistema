import { UI_TRANSLATIONS } from "./i18n-catalog";
export type Lang = "pt" | "en" | "es";
export const normalizeLang = (lang?: string): Lang => lang === "en" || lang === "es" ? lang : "pt";
export function translateText(text: string, lang?: string, values: readonly unknown[] = []) {
  const language = normalizeLang(lang);
  const translated = language === "pt" ? text : UI_TRANSLATIONS[text]?.[language === "en" ? 0 : 1] ?? text;
  return translated.replace(/\{(\d+)\}/g, (match, index: string) => Number(index) < values.length ? String(values[Number(index)] ?? "") : match);
}
const dict = {
  dashboard: { pt: "Dashboard", en: "Dashboard", es: "Panel" },
  crm: { pt: "CRM", en: "CRM", es: "CRM" },
  clientes: { pt: "Clientes", en: "Clients", es: "Clientes" },
  projetos: { pt: "Projetos", en: "Projects", es: "Proyectos" },
  mentorados: { pt: "Mentorados", en: "Mentees", es: "Mentorizados" },
  financeiro: { pt: "Financeiro", en: "Finance", es: "Finanzas" },
  empresas: { pt: "Empresas", en: "Companies", es: "Empresas" },
  assinantes: { pt: "Assinantes", en: "Subscribers", es: "Suscriptores" },
  contabilidade: { pt: "Contabilidade", en: "Accounting", es: "Contabilidad" },
  feedbacks: { pt: "Feedbacks", en: "Feedback", es: "Comentarios" },
  conteudo: { pt: "NEXIA", en: "NEXIA", es: "NEXIA" },
  personalizado: { pt: "Adquira seu sistema", en: "Get your own system", es: "Adquiere tu sistema" },
  inbox: { pt: "Caixa de Entrada", en: "Inbox", es: "Bandeja de entrada" },
  configuracoes: { pt: "Configurações", en: "Settings", es: "Configuración" },
  sair: { pt: "Sair", en: "Sign out", es: "Cerrar sesión" },
} as const;
export type Key = keyof typeof dict;
export function t(key: Key, lang: string | undefined) {
  const l = normalizeLang(lang);
  return dict[key][l] ?? dict[key].pt;
}
