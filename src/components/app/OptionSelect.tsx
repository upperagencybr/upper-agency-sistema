import { useI18n } from "@/lib/i18n-context";
import { Link } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";
import { useProfile } from "@/lib/data";
import { Field } from "@/components/app/ui";

export type OptionKey = "lead_origins" | "tx_categories";
const LEGACY: Record<string, string> = { indicacao: "Indicação", instagram: "Instagram", site: "Site", whatsapp: "WhatsApp", evento: "Evento", outro: "Outro" };
export const optionLabel = (v: string) => LEGACY[v] ?? v;

/** Select over a user-editable option list from Configurações → Opções; keeps legacy values selectable. */
export function OptionSelect({ label, list, value, onChange }: { label: string; list: OptionKey; value: string | null | undefined; onChange: (v: string) => void }) {
  const { tr } = useI18n();
  const { data: p } = useProfile();
  const opts = p?.[list] ?? [];
  const current = value && !opts.includes(value) && !opts.includes(optionLabel(value)) ? [value] : [];
  return (
    <Field label={label}>
      <select className="field" value={value && opts.includes(optionLabel(value)) ? optionLabel(value) : value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">{tr("Selecione")}</option>
        {current.map((v) => <option key={v} value={v}>{LEGACY[v] ? tr(optionLabel(v)) : v}</option>)}
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Link to="/configuracoes" search={{ tab: "opcoes" } as never} className="mt-1 flex items-center gap-1 text-xs text-primary"><Settings2 className="h-3 w-3" />{tr("Editar opções")}</Link>
    </Field>
  );
}
