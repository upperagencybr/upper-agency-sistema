import { useI18n } from "@/lib/i18n-context";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useRows, useTableMutations } from "@/lib/data";
import { Field } from "@/components/app/ui";

/** Company picker with inline "+ Nova empresa" registration; new company stays selected. */
export function CompanySelect({ value, onChange, placeholder = "Selecione", label = "Empresa" }: { value: string | null | undefined; onChange: (name: string | null) => void; placeholder?: string; label?: string }) {
  const { tr } = useI18n();
  const { data: companies = [] } = useRows("companies");
  const m = useTableMutations("companies");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const create = async () => {
    const n = name.trim();
    if (!n) return;
    try { await m.insert.mutateAsync({ name: n, country: "Brasil" }); onChange(n); setName(""); setAdding(false); toast.success(tr("Empresa cadastrada")); } catch { /* toast */ }
  };
  return (
    <Field label={label}>
      <select className="field" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{tr(placeholder)}</option>
        {companies.map((c) => <option key={c.id}>{c.name}</option>)}
      </select>
      {adding ? (
        <span className="mt-1 flex gap-1">
          <input autoFocus className="field h-7 text-xs" placeholder={tr("Nome da empresa")} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void create(); } }} />
          <button type="button" className="text-xs text-primary" onClick={create}>{tr("Salvar")}</button>
          <button type="button" className="text-xs text-muted-foreground" onClick={() => setAdding(false)}>{tr("Cancelar")}</button>
        </span>
      ) : (
        <button type="button" className="mt-1 flex items-center gap-1 text-xs text-primary" onClick={(e) => { e.preventDefault(); setAdding(true); }}><Plus className="h-3 w-3" />{tr("Nova empresa")}</button>
      )}
    </Field>
  );
}
