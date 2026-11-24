import { useI18n } from "@/lib/i18n-context";
import { useProfile, useUpdateProfile } from "@/lib/data";
import { useIsAdmin } from "@/lib/subscription";
import { NOTICE_DAY_OPTIONS, NOTICE_TYPES, prefFor, type NoticePrefs } from "@/lib/notices";
import { Panel } from "@/components/app/ui";



export function ReminderSettings() {
  const { tr } = useI18n();
  const dayLabel = (d: number) => d === 0 ? tr("No dia") : tr("{0} dia{1} antes", [d, d === 1 ? "" : "s"]);
  const { data: p } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const up = useUpdateProfile();
  const prefs = (p?.notice_prefs ?? {}) as NoticePrefs;
  const save = (kind: string, patch: Partial<{ on: boolean; days: number }>) =>
    up.mutate({ notice_prefs: { ...prefs, [kind]: { ...prefFor(prefs, kind), ...patch } } });
  const types = NOTICE_TYPES.filter((t) => t.kind !== "cont" || isAdmin);
  return (
    <div className="grid max-w-2xl gap-4">
      <Panel title={tr("Lembretes na caixa de entrada")}>
        <p className="mb-4 text-xs text-muted-foreground">{tr("Escolha quais avisos aparecem e com quantos dias de antecedência. Itens vencidos continuam aparecendo enquanto o lembrete estiver ligado.")}</p>
        <div className="grid gap-4">
          {types.map((t) => {
            const pr = prefFor(prefs, t.kind);
            return (
              <div key={t.kind} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={pr.on} onChange={(e) => save(t.kind, { on: e.target.checked })} className="accent-primary" />
                  {tr(t.label)}
                </label>
                <select disabled={!pr.on} value={pr.days} onChange={(e) => save(t.kind, { days: Number(e.target.value) })}
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50" aria-label={tr("Antecedência: {0}", [tr(t.label)])}>
                  {NOTICE_DAY_OPTIONS.map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
