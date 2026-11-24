import { CLIENT_STAGES, LEAD_STAGES } from "@/lib/constants";

export const STATUS_COLORS = [
  { id: "neutral", label: "Cinza", className: "text-muted-foreground" },
  { id: "yellow", label: "Amarelo", className: "text-primary" },
  { id: "green", label: "Verde", className: "text-success" },
  { id: "red", label: "Vermelho", className: "text-destructive" },
  { id: "orange", label: "Laranja", className: "text-warning" },
  { id: "blue", label: "Azul", className: "text-chart-2" },
  { id: "violet", label: "Violeta", className: "text-chart-5" },
] as const;
export const STATUS_TYPES = [
  { id: "dotted", label: "A iniciar" }, { id: "empty", label: "Vazio" },
  { id: "progress", label: "Em progresso" }, { id: "complete", label: "Concluído" },
  { id: "cancelled", label: "Cancelado" },
] as const;
export type StatusArea = "crm" | "clients";
export type StatusAppearance = { color: typeof STATUS_COLORS[number]["id"] | `#${string}`; type: typeof STATUS_TYPES[number]["id"]; progress: number };
export const isCustomStatusColor = (value: unknown): value is `#${string}` => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
export type StatusPreferences = Partial<Record<StatusArea, Record<string, StatusAppearance>>>;
export const stagesFor = (area: StatusArea) => area === "crm" ? LEAD_STAGES : CLIENT_STAGES;
const defaults: Record<StatusArea, Record<string, StatusAppearance>> = {
  crm: {
    lead: { color: "neutral", type: "dotted", progress: 0 },
    negociacao: { color: "yellow", type: "progress", progress: 50 },
    followup: { color: "blue", type: "progress", progress: 25 },
    fechado: { color: "green", type: "complete", progress: 100 },
    sem_interesse: { color: "red", type: "cancelled", progress: 0 },
  },
  clients: {
    ativo: { color: "green", type: "progress", progress: 50 },
    pausado: { color: "yellow", type: "empty", progress: 0 },
    encerrado: { color: "neutral", type: "cancelled", progress: 0 },
  },
};
export function statusAppearance(raw: unknown, area: StatusArea, status: string): StatusAppearance {
  const fallback = defaults[area][status] ?? { color: "neutral", type: "empty", progress: 0 };
  if (!raw || typeof raw !== "object") return fallback;
  const entry = (raw as StatusPreferences)[area]?.[status];
  if (!entry || typeof entry !== "object") return fallback;
  return {
    color: STATUS_COLORS.some((c) => c.id === entry.color) || isCustomStatusColor(entry.color) ? entry.color : fallback.color,
    type: STATUS_TYPES.some((t) => t.id === entry.type) ? entry.type : fallback.type,
    progress: Number.isFinite(entry.progress) ? Math.max(0, Math.min(100, entry.progress)) : fallback.progress,
  };
}