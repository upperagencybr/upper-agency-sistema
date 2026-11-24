import { useI18n } from "@/lib/i18n-context";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile, useUpdateProfile } from "@/lib/data";
import { PALETTES, usePalette } from "@/lib/personalization";

export function PersonalizationSettings() {
  const { tr } = useI18n();
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const { palette, choose } = usePalette(profile?.id);
  return <div className="max-w-3xl space-y-8">
    <section><h2 className="mb-4 text-lg font-semibold">{tr("Tema")}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[{ id: "light", label: "Claro", Icon: Sun }, { id: "dark", label: "Escuro", Icon: Moon }, { id: "auto", label: "Automático", Icon: Monitor }].map(({ id, label, Icon }) =>
          <Button key={id} variant={(profile?.theme ?? "dark") === id ? "default" : "outline"} className="h-16 justify-start gap-3 px-5" disabled={update.isPending} aria-pressed={(profile?.theme ?? "dark") === id} onClick={() => update.mutate({ theme: id })}><Icon className="h-5 w-5" />{tr(label)}</Button>)}
      </div>
    </section>
    <section><h2 className="mb-4 text-lg font-semibold">{tr("Paleta de cores")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {PALETTES.map(p => <Button key={p.id} variant="outline" aria-pressed={palette === p.id} onClick={() => choose(p.id)} className={`h-auto min-h-28 flex-col items-stretch gap-4 whitespace-normal p-4 text-left ${palette === p.id ? "border-primary ring-1 ring-primary" : ""}`}>
          <span className="flex items-center justify-between gap-2"><span>{p.label}</span>{palette === p.id && <Check className="h-4 w-4 shrink-0 text-primary" />}</span>
          <span className="flex h-8 overflow-hidden rounded border border-border" aria-hidden="true">{p.colors.map(color => <span key={color} className={`palette-swatch swatch-${color} flex-1`} />)}</span>
        </Button>)}
      </div>
    </section>
    <section><h2 className="mb-4 text-lg font-semibold">{tr("Fonte")}</h2><div className="flex flex-wrap gap-2">
      {([ ["inter", "Inter"], ["plex", "IBM Plex Sans"], ["manrope", "Manrope"], ["grotesk", "Space Grotesk"] ] as const).map(([id, label]) => <Button key={id} size="sm" variant={(profile?.font ?? "inter") === id ? "default" : "outline"} disabled={update.isPending} onClick={() => update.mutate({ font: id })}>{tr(label)}</Button>)}
    </div></section>
  </div>;
}