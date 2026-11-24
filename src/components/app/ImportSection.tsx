import { useMemo, useState } from "react";
import { FileSpreadsheet, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "./ui";
import { useProfile, useRows, useTableMutations, type Insert } from "@/lib/data";
import { useI18n } from "@/lib/i18n-context";
import { IMPORT_FIELDS, IMPORT_LABELS, detectColumns, importFingerprint, prepareImport, readImportFile, type ImportKind, type ImportSheet, type ColumnMap } from "@/lib/import-data";
import { CURRENCIES } from "@/lib/format";

export function ImportSection() {
  const { tr } = useI18n();
  const { data: me } = useProfile();
  const { data: companies = [] } = useRows("companies");
  const { data: memberships = [] } = useRows("company_members");
  const { data: clients = [] } = useRows("clients");
  const { data: transactions = [] } = useRows("transactions");
  const cm = useTableMutations("clients"), tm = useTableMutations("transactions");
  const [kind, setKind] = useState<ImportKind>("clients");
  const [sheets, setSheets] = useState<ImportSheet[]>([]);
  const [index, setIndex] = useState(0);
  const [map, setMap] = useState<ColumnMap>({});
  const [company, setCompany] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [type, setType] = useState<"receita" | "despesa">("receita");
  const [busy, setBusy] = useState(false), [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [committed, setCommitted] = useState<Set<string>>(new Set());
  const allowed = companies.filter(c => c.user_id === me?.id || memberships.some(m => m.company_id === c.id && m.user_id === me?.id && (m.role === "editor" || m.role === "admin") && (m.kind === "socio" || m.tabs.includes(kind === "clients" ? "clientes" : "financeiro"))));
  const sheet = sheets[index];
  const prepared = useMemo(() => sheet ? prepareImport(sheet, { kind, map, company: company || null, currency, type }, kind === "clients" ? clients : transactions) : [], [sheet, kind, map, company, currency, type, clients, transactions]);
  const isCommitted = (r: typeof prepared[number]) => !!r.data && committed.has(`${kind}:${importFingerprint(kind, r.data)}`);
  const valid = prepared.filter(r => r.data && !r.error && !r.duplicate && !isCommitted(r));
  const invalid = prepared.filter(r => r.error);
  const duplicates = prepared.filter(r => r.duplicate || isCommitted(r)).length;
  const canSave = !!me && allowed.some(c => c.name === company);
  const required = kind === "clients" ? !!map["name"] : !!map["description"] && !!map["amount"] && (!!map["date"] || !!map["due_date"]);
  const load = async (file: File) => {
    setBusy(true); setError(""); setSaved(0); setConfirmed(false); setSheets([]);
    try {
      const next = await readImportFile(file);
      setSheets(next); setIndex(0);
      if (next[0]) setMap(detectColumns(next[0], kind));
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo"); }
    finally { setBusy(false); }
  };
  const changeKind = (next: ImportKind) => {
    setKind(next); setSaved(0); setConfirmed(false);
    if (sheet) setMap(detectColumns(sheet, next));
  };
  const save = async () => {
    if (!canSave || !required || !confirmed || !valid.length || saving) return;
    setSaving(true); setError("");
    let count = 0;
    try {
      for (let i = 0; i < valid.length; i += 100) {
        const batch = valid.slice(i, i + 100);
        if (kind === "clients") await cm.insert.mutateAsync(batch.map(r => ({ ...r.data, created_by: me.id })) as Insert<"clients">[]);
        else await tm.insert.mutateAsync(batch.map(r => {
          const data = r.data as Insert<"transactions">;
          const matches = clients.filter(c => c.company === company && c.name.trim().toLowerCase() === data.client_name?.trim().toLowerCase());
          return { ...data, client_id: matches.length === 1 ? matches[0]?.id ?? null : null, created_by: me.id };
        }));
        count += batch.length; setSaved(count);
        setCommitted(previous => new Set([...previous, ...batch.flatMap(r => r.data ? [`${kind}:${importFingerprint(kind, r.data)}`] : [])]));
      }
      setConfirmed(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível importar os registros"); }
    finally { setSaving(false); }
  };
  return <section className="max-w-5xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{tr("Importar dados")}</h2><div className="flex gap-2"><Button size="sm" disabled={saving} variant={kind === "clients" ? "default" : "outline"} onClick={() => changeKind("clients")}>{tr("Clientes")}</Button><Button size="sm" disabled={saving} variant={kind === "transactions" ? "default" : "outline"} onClick={() => changeKind("transactions")}>{tr("Financeiro")}</Button></div></div>
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label={tr("Empresa")}><select className="field" disabled={saving} value={company} onChange={e => { setCompany(e.target.value); setConfirmed(false); }}><option value="">{tr("Selecione")}</option>{allowed.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></Field>
      {kind === "transactions" && <><Field label={tr("Moeda padrão")}><select className="field" disabled={saving} value={currency} onChange={e => { setCurrency(e.target.value); setConfirmed(false); }}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></Field><Field label={tr("Tipo padrão")}><select className="field" disabled={saving} value={type} onChange={e => { setType(e.target.value as "receita" | "despesa"); setConfirmed(false); }}><option value="receita">{tr("Receita")}</option><option value="despesa">{tr("Despesa")}</option></select></Field></>}
    </div>
    <div className="flex flex-wrap items-center gap-4 border-y border-border py-6"><FileSpreadsheet className="h-8 w-8 text-primary" /><span className="text-sm text-muted-foreground">Excel (.xlsx, .xls), CSV, ZIP · 20 MB</span><Button asChild variant="outline" disabled={busy || saving}><label className="cursor-pointer">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{tr("Selecionar arquivo")}<input type="file" className="hidden" accept=".xlsx,.xls,.csv,.zip" disabled={busy || saving} onChange={e => { const file = e.target.files?.[0]; if (file) void load(file); e.target.value = ""; }} /></label></Button></div>
    {error && <p role="alert" className="break-words text-sm text-destructive">{tr(error)}{saved > 0 && <> {tr("{0} registros já salvos", [saved])}</>}</p>}
    {!allowed.length && <p className="text-sm text-muted-foreground">{tr("Nenhuma empresa disponível para importar")}</p>}
    {sheet && <>
      <Field label={tr("Planilha")}><select className="field" disabled={saving} value={index} onChange={e => { const n = Number(e.target.value); setIndex(n); setSaved(0); setConfirmed(false); const next = sheets[n]; if (next) setMap(detectColumns(next, kind)); }}>{sheets.map((s, i) => <option key={i} value={i}>{s.name} ({s.rows.length})</option>)}</select></Field>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{IMPORT_FIELDS[kind].map(field => <Field key={field} label={tr(IMPORT_LABELS[field] ?? field)}><select className="field" disabled={saving} value={map[field] ?? ""} onChange={e => { setMap({ ...map, [field]: e.target.value }); setConfirmed(false); }}><option value="">{tr("Não importar coluna")}</option>{sheet.headers.map(h => <option key={h} value={h}>{h}</option>)}</select></Field>)}</div>
      <div className="flex flex-wrap gap-5 border-y border-border py-3 text-sm"><span>{tr("{0} prontos para importar", [valid.length])}</span><span className="text-warning">{tr("{0} linhas com erro", [invalid.length])}</span><span className="text-muted-foreground">{tr("{0} duplicados ignorados", [duplicates])}</span></div>
      <div className="max-h-80 overflow-auto border border-border"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-3">{tr("Linha")}</th><th className="p-3">{tr(kind === "clients" ? "Nome" : "Descrição")}</th><th className="p-3">{tr(kind === "clients" ? "E-mail" : "Valor")}</th><th className="p-3">{tr("Situação")}</th></tr></thead><tbody>{prepared.slice(0, 100).map(r => <tr key={r.line} className="border-t border-border"><td className="p-3">{r.line}</td><td className="max-w-xs break-words p-3">{String(sheet.rows[r.line - 2]?.[map[kind === "clients" ? "name" : "description"] ?? ""] ?? "")}</td><td className="p-3">{String(sheet.rows[r.line - 2]?.[map[kind === "clients" ? "email" : "amount"] ?? ""] ?? "")}</td><td className={`p-3 ${r.error ? "text-destructive" : r.duplicate ? "text-muted-foreground" : "text-success"}`}>{tr(r.error ?? (r.duplicate ? "Duplicado" : "Pronto"))}</td></tr>)}</tbody></table></div>
      {saved > 0 && <p role="status" className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" />{tr("{0} registros salvos", [saved])}</p>}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-primary" disabled={saving} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{tr("Conferi os dados e a empresa de destino")}</label>
      <Button disabled={busy || saving || !canSave || !required || !confirmed || !valid.length} onClick={() => void save()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{tr(saving ? "Importando..." : "Importar registros")}</Button>
    </>}
  </section>;
}