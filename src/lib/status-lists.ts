import { CLIENT_STAGES, LEAD_STAGES } from "@/lib/constants";
import { translateText } from "./i18n";
import type { StatusArea } from "@/lib/status-appearance";

export type StatusStage = { id: string; label: string };
export type StatusLists = Partial<Record<StatusArea, StatusStage[]>>;
export function resolveStatusStages(raw: unknown, area: StatusArea, existing: string[] = [], lang = "pt"): StatusStage[] {
  const base = area === "crm" ? LEAD_STAGES : CLIENT_STAGES;
  const list = raw && typeof raw === "object" ? (raw as StatusLists)[area] : undefined;
  const valid = Array.isArray(list) ? list.filter((s) => s && typeof s.id === "string" && s.id && typeof s.label === "string" && s.label.trim()) : [];
  const result = base.map((s) => ({ ...s, label: valid.find((v) => v.id === s.id)?.label ?? translateText(s.label, lang) }));
  for (const s of valid) if (!result.some((r) => r.id === s.id)) result.push({ id: s.id, label: s.label.trim() });
  for (const id of existing) if (id && !result.some((r) => r.id === id)) result.push({ id, label: id });
  return result;
}