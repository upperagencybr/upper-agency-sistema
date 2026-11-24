import { useI18n } from "@/lib/i18n-context";
import { useId, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateClient, useRows } from "@/lib/data";
import { Field } from "./ui";

type Props = { value: number | null | undefined; onChange: (id: number | null) => void; label?: string; placeholder?: string; className?: string; company?: string | null | undefined };

export function ClientSelect({ value, onChange, label = "Cliente", placeholder = "Selecione", className = "", company }: Props) {
  const { tr } = useI18n();
  const id = useId();
  const { data: clients = [] } = useRows("clients");
  const { data: companies = [] } = useRows("companies");
  const create = useCreateClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", address: "", country: "Brasil", company: company ?? "" });
  const [error, setError] = useState("");
  const save = async () => {
    if (!draft.name.trim()) { setError(tr("Informe o nome do cliente.")); return; }
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) { setError(tr("Informe um e-mail válido.")); return; }
    setError("");
    try {
      const client = await create.mutateAsync({ ...draft, name: draft.name.trim(), company: draft.company || null });
      onChange(client.id);
      setOpen(false);
      setDraft({ name: "", email: "", phone: "", address: "", country: "Brasil", company: company ?? "" });
    } catch { setError(tr("Não foi possível cadastrar o cliente. Tente novamente.")); }
  };
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs text-muted-foreground">{tr(label)}</label>
      <select id={id} className="field" value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">{tr(placeholder)}</option>
        {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
      </select>
      <Button type="button" variant="ghost" size="sm" className="mt-1 h-7 px-0 text-xs text-primary" aria-expanded={open} aria-controls={`${id}-cadastro`} onClick={() => { setOpen(!open); setError(""); if (!open) setDraft((old) => ({ ...old, company: company ?? old.company })); }}><Plus className="h-3 w-3" />{tr("Novo cliente")}</Button>
      {open && <div id={`${id}-cadastro`} className="mt-2 space-y-3 border-l-2 border-primary pl-3" role="group" aria-label={tr("Cadastro rápido de cliente")}>
        <Field label={tr("Nome do cliente")}><input autoFocus className="field" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <Field label={tr("E-mail do cliente")}><input type="email" className="field" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
        <Field label={tr("Telefone do cliente")}><input type="tel" className="field" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
        <Field label={tr("Endereço do cliente")}><input className="field" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
        <Field label={tr("Empresa do cliente")}><select className="field" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })}><option value="">{tr("Selecione")}</option>{companies.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field>
        <Field label={tr("País do cliente")}><input className="field" value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} /></Field>
        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={create.isPending} onClick={() => void save()}>{create.isPending && <Loader2 className="h-3 w-3 animate-spin" />}{tr("Cadastrar cliente")}</Button>
          <Button type="button" size="sm" variant="ghost" disabled={create.isPending} onClick={() => { setOpen(false); setError(""); }}>{tr("Cancelar")}</Button>
        </div>
      </div>}
    </div>
  );
}