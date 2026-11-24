import { useI18n } from "@/lib/i18n-context";
import { useState } from "react";
import { resolveStatusStages } from "@/lib/status-lists";
import { toast } from "sonner";
import { useProfile, useUpdateProfile } from "@/lib/data";
import { STATUS_COLORS, STATUS_TYPES, isCustomStatusColor, stagesFor, statusAppearance, type StatusArea, type StatusAppearance, type StatusPreferences } from "@/lib/status-appearance";
import { StatusGlyph } from "@/components/app/StatusIndicator";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/app/ui";

export function StatusSettings() {
  const { tr, lang } = useI18n();
  const { data: profile } = useProfile();
  const up = useUpdateProfile();
  const [draft, setDraft] = useState<StatusPreferences | null>(null);
  const prefs = draft ?? (profile?.status_appearance as StatusPreferences | undefined) ?? {};
  const change = (area: StatusArea, id: string, patch: Partial<StatusAppearance>) => setDraft({ ...prefs, [area]: { ...prefs[area], [id]: { ...statusAppearance(prefs, area, id), ...patch } } });
  return <div className="max-w-3xl space-y-8">
    {(["crm", "clients"] as const).map((area) => <section key={area}>
      <h2 className="mb-4 text-base font-semibold">{area === "crm" ? tr("Etapas do CRM") : tr("Situações dos clientes")}</h2>
      <div className="divide-y divide-border">
        {resolveStatusStages(profile?.status_lists, area, [], lang).map((stage) => {
          const appearance = statusAppearance(prefs, area, stage.id);
          return <div key={stage.id} className="grid gap-3 py-4 sm:grid-cols-[140px_1fr_1fr]">
            <span className="flex items-center gap-2 text-sm font-medium"><StatusGlyph appearance={appearance} />{stage.label}</span>
            <Field label={tr("Tipo de {0}", [stage.label])}><select className="field" aria-label={tr("Tipo de {0}", [stage.label])} value={appearance.type} onChange={(e) => change(area, stage.id, { type: e.target.value as StatusAppearance["type"] })}>{STATUS_TYPES.map((t) => <option key={t.id} value={t.id}>{tr(t.label)}</option>)}</select></Field>
            <Field label={tr("Cor de {0}", [stage.label])}><div className="flex flex-wrap items-center gap-1">{STATUS_COLORS.map((c) => <Button key={c.id} variant="ghost" size="icon" title={tr(c.label)} aria-label={`${stage.label}: ${tr(c.label)}`} aria-pressed={appearance.color === c.id} className={`h-7 w-7 ${appearance.color === c.id ? "ring-2 ring-primary" : ""}`} onClick={() => change(area, stage.id, { color: c.id })}><StatusGlyph appearance={{ color: c.id, type: "complete", progress: 100 }} /></Button>)}
              <label title={tr("Escolher qualquer cor")} className={`status-color-globe relative inline-flex h-6 w-6 shrink-0 cursor-pointer overflow-hidden rounded-full border border-border ${isCustomStatusColor(appearance.color) ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
                <input type="color" aria-label={tr("Escolher qualquer cor de {0}", [stage.label])} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={isCustomStatusColor(appearance.color) ? appearance.color : "#facc15"} onChange={(e) => { if (isCustomStatusColor(e.target.value)) change(area, stage.id, { color: e.target.value }); }} />
              </label>
            </div></Field>
            <label className="flex flex-wrap items-center gap-3 text-xs sm:col-start-2 sm:col-span-2">{tr("Porcentagem")} <input aria-label={tr("Preenchimento de {0}", [stage.label])} className="min-w-0 flex-1 accent-primary" type="range" min="0" max="100" step="1" value={appearance.progress} onChange={(e) => change(area, stage.id, { progress: Number(e.target.value) })} /><span className="flex shrink-0 items-center gap-1"><input aria-label={tr("Porcentagem de {0}", [stage.label])} className="field h-7 w-16 text-right" type="number" min="0" max="100" value={appearance.progress} onChange={(e) => change(area, stage.id, { progress: Math.max(0, Math.min(100, Number(e.target.value))) })} />%</span></label>
          </div>;
        })}
      </div>
    </section>)}
    <Button disabled={!draft || up.isPending} onClick={() => up.mutate({ status_appearance: JSON.parse(JSON.stringify(prefs)) }, { onSuccess: () => { setDraft(null); toast.success(tr("Indicadores salvos")); } })}>{up.isPending ? tr("Salvando...") : tr("Salvar indicadores")}</Button>
  </div>;
}