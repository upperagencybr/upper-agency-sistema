import { useI18n } from "@/lib/i18n-context";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useRows, useSignedUrl, useTableMutations } from "@/lib/data";
import { personName, useTeam, type Person } from "@/lib/team";
import { Field } from "@/components/app/ui";

export const TAG_COLORS: Record<string, string> = {
  yellow: "bg-primary/15 text-primary border-primary/40",
  green: "bg-success/15 text-success border-success/40",
  red: "bg-destructive/15 text-destructive border-destructive/40",
  orange: "bg-warning/15 text-warning border-warning/40",
  gray: "bg-muted text-muted-foreground border-border",
};
export const tagStyle = (c: string) => (c.startsWith("#") ? { color: c, borderColor: c, backgroundColor: `${c}26` } : undefined);
export const tagClass = (c: string) => (c.startsWith("#") ? "" : TAG_COLORS[c] ?? TAG_COLORS["gray"]);
export const SWATCHES = ["#facc15", "#22c55e", "#ef4444", "#f97316", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#9ca3af"];
export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const { tr } = useI18n();
  return (
    <span className="inline-flex items-center gap-1">
      {SWATCHES.map((c) => <button type="button" key={c} aria-label={tr("Cor {0}", [c])} onClick={() => onChange(c)} style={{ backgroundColor: c }} className={`h-5 w-5 rounded-full border-2 ${value === c ? "border-foreground" : "border-transparent"}`} />)}
      <label title={tr("Todas as cores")} className="relative inline-flex h-5 w-5 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border" style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}>
        <input type="color" aria-label={tr("Escolher qualquer cor")} className="absolute inset-0 cursor-pointer opacity-0" value={value.startsWith("#") ? value : "#facc15"} onChange={(e) => onChange(e.target.value)} />
      </label>
    </span>
  );
}
export const TAG_COLOR_LABEL: Record<string, string> = { yellow: "Amarelo", green: "Verde", red: "Vermelho", orange: "Laranja", gray: "Cinza" };

export function TagBadges({ ids }: { ids: number[] | null | undefined }) {
  const { data: tags = [] } = useRows("tags");
  const list = tags.filter((t) => ids?.includes(t.id));
  if (!list.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {list.map((t) => <span key={t.id} style={tagStyle(t.color)} className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${tagClass(t.color)}`}>{t.name}</span>)}
    </span>
  );
}

export function TagPicker({ value, onChange, className = "col-span-2" }: { value: number[] | null | undefined; onChange: (ids: number[]) => void; className?: string }) {
  const { tr } = useI18n();
  const { data: tags = [] } = useRows("tags");
  const m = useTableMutations("tags");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#facc15");
  const ids = value ?? [];
  const toggle = (id: number) => onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  const create = async () => {
    if (!name.trim()) return;
    try {
      await m.insert.mutateAsync({ name: name.trim(), color });
      setName(""); setAdding(false);
      toast.success(tr("Etiqueta criada, clique nela para marcar"));
    } catch { /* toast já exibido */ }
  };
  return (
    <Field label={tr("Etiquetas")} className={className}>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <button type="button" key={t.id} onClick={() => toggle(t.id)}
            style={ids.includes(t.id) ? tagStyle(t.color) : undefined}
            className={`rounded border px-2 py-0.5 text-xs ${ids.includes(t.id) ? tagClass(t.color) : "border-border text-muted-foreground opacity-60 hover:opacity-100"}`}>
            {t.name}
          </button>
        ))}
        {!adding ? (
          <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-primary"><Plus className="h-3 w-3" />{tr("Nova etiqueta")}</button>
        ) : (
          <span className="flex flex-wrap items-center gap-1">
            <input autoFocus className="field h-7 w-32 text-xs" placeholder={tr("Nome")} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void create(); } }} />
<ColorPicker value={color} onChange={setColor} />
            <button type="button" onClick={create} className="text-xs text-primary">{tr("Criar")}</button>
            <button type="button" aria-label={tr("Cancelar")} onClick={() => setAdding(false)} className="text-muted-foreground"><X className="h-3 w-3" /></button>
          </span>
        )}
      </div>
    </Field>
  );
}

export function TagFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { tr } = useI18n();
  const { data: tags = [] } = useRows("tags");
  return (
    <select aria-label={tr("Etiqueta")} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{tr("Etiqueta")}</option>
      {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
  );
}
export const hasTag = (ids: number[] | null | undefined, f: string) => !f || (ids ?? []).includes(Number(f));

export function Avatar({ person, size = "h-6 w-6" }: { person?: Person | null; size?: string }) {
  const { data: url } = useSignedUrl(person?.avatar_url);
  const initials = personName(person).split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  if (url) return <img src={url} alt={personName(person)} title={personName(person)} className={`${size} shrink-0 rounded-full object-cover`} />;
  return <span title={personName(person)} className={`${size} inline-flex shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary`}>{initials}</span>;
}

/** Shows who created a row; old rows without created_by fall back to the owner. */
export function CreatedBy({ createdBy, owner, withName }: { createdBy: string | null | undefined; owner?: string | null | undefined; withName?: boolean }) {
  const { data: team = [] } = useTeam();
  const p = team.find((x) => x.id === (createdBy || owner));
  if (!p) return null;
  return <span className="inline-flex items-center gap-1.5"><Avatar person={p} size="h-5 w-5" />{withName && <span className="text-xs text-muted-foreground">{personName(p)}</span>}</span>;
}

export function PersonSelect({ label = "Lançado por", value, owner, onChange }: { label?: string; value: string | null | undefined; owner?: string | null | undefined; onChange: (id: string) => void }) {
  const { tr } = useI18n();
  const { data: team = [] } = useTeam();
  return (
    <Field label={label}>
      <select className="field" value={value || owner || ""} onChange={(e) => onChange(e.target.value)}>
        {!value && !owner && <option value="">{tr("Você")}</option>}
        {team.map((p) => <option key={p.id} value={p.id}>{personName(p)}</option>)}
      </select>
    </Field>
  );
}

export function PersonFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { tr } = useI18n();
  const { data: team = [] } = useTeam();
  return (
    <select aria-label={tr("Lançado por")} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{tr("Lançado por")}</option>
      {team.map((p) => <option key={p.id} value={p.id}>{personName(p)}</option>)}
    </select>
  );
}
export const byPerson = (row: { created_by?: string | null; user_id?: string | null }, f: string) => !f || (row.created_by || row.user_id) === f;
