import { useI18n } from "@/lib/i18n-context";
import { Check, X } from "lucide-react";
import { useStatusStages } from "@/lib/useStatusStages";
import { useProfile } from "@/lib/data";
import { STATUS_COLORS, isCustomStatusColor, stagesFor, statusAppearance, type StatusAppearance, type StatusArea } from "@/lib/status-appearance";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function StatusGlyph({ appearance }: { appearance: StatusAppearance }) {
  const { type, progress, color } = appearance;
  const colorClass = STATUS_COLORS.find((c) => c.id === color)?.className ?? "text-muted-foreground";
  const angle = progress * 3.6 * Math.PI / 180;
  const x = 12 + 8 * Math.sin(angle), y = 12 - 8 * Math.cos(angle);
  return <span aria-hidden="true" style={isCustomStatusColor(color) ? { color } : undefined} className={`relative inline-flex h-4 w-4 shrink-0 items-center justify-center ${colorClass}`}>
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray={type === "dotted" ? "2 3" : undefined} fill={type === "complete" || type === "cancelled" ? "currentColor" : "none"} />
      {type === "progress" && progress >= 100 ? <circle cx="12" cy="12" r="7" fill="currentColor" /> : type === "progress" && progress > 0 ? <path d={`M12 12 L12 4 A8 8 0 ${progress > 50 ? 1 : 0} 1 ${x} ${y} Z`} fill="currentColor" /> : null}
    </svg>
    {type === "complete" && <Check className="absolute h-3 w-3 text-background" strokeWidth={3} />}
    {type === "cancelled" && <X className="absolute h-3 w-3 text-background" strokeWidth={3} />}
  </span>;
}

export function StatusIndicator({ area, status, onChange }: { area: StatusArea; status: string; onChange?: (status: string) => void }) {
  const { tr } = useI18n();
  const { data: profile } = useProfile();
  const stages = useStatusStages(area, [status]);
  const label = stages.find((s) => s.id === status)?.label ?? status;
  const content = <><StatusGlyph appearance={statusAppearance(profile?.status_appearance, area, status)} /><span>{label}</span></>;
  if (!onChange) return <span className="inline-flex items-center gap-2 text-xs">{content}</span>;
  return <span onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 gap-2 px-2 text-xs" aria-label={tr("Alterar situação: {0}", [label])}>{content}</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {stages.map((s) => <DropdownMenuItem key={s.id} onClick={(e) => { e.stopPropagation(); onChange(s.id); }} className="gap-2">
          <StatusGlyph appearance={statusAppearance(profile?.status_appearance, area, s.id)} />{s.label}{s.id === status && <Check className="ml-auto h-3 w-3" />}
        </DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  </span>;
}