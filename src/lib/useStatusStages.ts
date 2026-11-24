import { useI18n } from "./i18n-context";
import { useProfile } from "@/lib/data";
import { resolveStatusStages } from "@/lib/status-lists";
import type { StatusArea } from "@/lib/status-appearance";

export function useStatusStages(area: StatusArea, existing: string[] = []) {
  const { data: profile } = useProfile();
  const { lang } = useI18n();
  return resolveStatusStages(profile?.status_lists, area, existing, lang);
}