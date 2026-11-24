import { useI18n } from "@/lib/i18n-context";
import { useAccess } from "@/lib/team";
import { StatusIndicator } from "@/components/app/StatusIndicator";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Paperclip, Trash2, FileText, Download, LayoutGrid, ChevronDown, FolderOpen } from "lucide-react";
import { CompanySelect } from "@/components/app/CompanySelect";
import { CreatedBy, PersonFilter, PersonSelect, TagBadges, TagFilter, TagPicker, byPerson, hasTag } from "@/components/app/team";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl, uploadFile, useRows, useTableMutations, type Row } from "@/lib/data";
import { useStatusStages } from "@/lib/useStatusStages";
import { fmtDate, money } from "@/lib/format";
import { clientToSheet, exportCsv } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { DragScroll, Field, Modal, PageHeader } from "@/components/app/ui";

export const Route = createFileRoute("/_app/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes | NEXO HUB" },
      { name: "description", content: "Fichas de clientes em Ativos, Pausados e Encerrados." },
      { property: "og:title", content: "Clientes | NEXO HUB" },
      { property: "og:description", content: "Fichas de clientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Clientes,
});

type Client = Row<"clients">;

function Clientes() {
  const { tr } = useI18n();
  const { canExport } = useAccess();
  const { data: clients = [] } = useRows("clients");
  const CLIENT_STAGES = useStatusStages("clients", clients.map((c) => c.status));
  const { data: companies = [] } = useRows("companies");
  const { data: txs = [] } = useRows("transactions");
  const { data: files = [] } = useRows("client_attachments");
  const m = useTableMutations("clients");
  const fm = useTableMutations("client_attachments");
  const [edit, setEdit] = useState<Partial<Client> | null>(null);
  const [q, setQ] = useState("");
  const [over, setOver] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "lista" | "planilha">("planilha");
  const [fCountry, setFCountry] = useState("");
  const [fCompany, setFCompany] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fTag, setFTag] = useState("");
  const [fBy, setFBy] = useState("");

  const list = clients.filter((c) => (!q || c.name.toLowerCase().includes(q.toLowerCase()))
    && (!fCountry || c.country === fCountry) && (!fCompany || c.company === fCompany) && (!fStatus || (c.status || "ativo") === fStatus) && hasTag(c.tag_ids, fTag) && byPerson(c, fBy));
  const countries = [...new Set(clients.map((c) => c.country).filter(Boolean))] as string[];

  const save = async () => {
    if (!edit?.name) { toast.error(tr("Informe o nome")); return; }
    const { id, user_id: _u, created_at: _c, status: _s, ...rest } = edit as Client;
    if (id) await m.update.mutateAsync({ id, ...rest });
    else await m.insert.mutateAsync({ ...rest, status: "ativo" });
    setEdit(null);
  };

  const attach = async (file: File) => {
    if (!edit?.id) return;
    if (!/\.(pdf|png)$/i.test(file.name)) { toast.error(tr("Envie um arquivo PDF ou PNG")); return; }
    try {
      const path = await uploadFile(file, `clientes/${edit.id}`);
      await fm.insert.mutateAsync({ client_id: edit.id, file_name: file.name, path });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const purchases = edit?.id ? txs.filter((t) => t.client_id === edit.id) : [];
  const myFiles = edit?.id ? files.filter((f) => f.client_id === edit.id) : [];

  return (
    <div>
      <PageHeader title={tr("Clientes")} sub={tr("{0} cadastrados", [clients.length])}
        actions={<>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline"><LayoutGrid className="h-4 w-4" />{tr("Visualizações")}<ChevronDown className="h-3 w-3" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["planilha", "kanban", "lista"] as const).map((v) => <DropdownMenuItem key={v} onClick={() => setView(v)} className={view === v ? "text-primary" : ""}>{v === "kanban" ? "Kanban" : v === "lista" ? tr("Lista") : tr("Planilha")}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setEdit({ country: "Brasil" })}><Plus className="h-4 w-4" />{tr("Novo cliente")}</Button>
        </>} />
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))]">
        <input className="field col-span-2 md:col-span-1" placeholder={tr("Buscar por nome")} value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label={tr("País")} className="field" value={fCountry} onChange={(e) => setFCountry(e.target.value)}><option value="">{tr("País")}</option>{countries.map((c) => <option key={c}>{c}</option>)}</select>
        <select aria-label={tr("Empresa")} className="field" value={fCompany} onChange={(e) => setFCompany(e.target.value)}><option value="">{tr("Empresa")}</option>{companies.map((c) => <option key={c.id}>{c.name}</option>)}</select>
        <select aria-label={tr("Situação")} className="field" value={fStatus} onChange={(e) => setFStatus(e.target.value)}><option value="">{tr("Situação")}</option>{CLIENT_STAGES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        <TagFilter value={fTag} onChange={setFTag} />
        <PersonFilter value={fBy} onChange={setFBy} />
      </div>
      {view === "lista" && (
        <div className="panel divide-y divide-border">
          {list.map((c) => (
            <button key={c.id} onClick={() => setEdit(c)} className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left text-sm hover:bg-muted/40">
              <span className="font-medium">{c.name}</span>
              <span className="flex flex-wrap gap-4 text-xs text-muted-foreground"><span>{c.company}</span><span>{c.country}</span><span>{c.email}</span><span>{c.phone}</span><StatusIndicator area="clients" status={c.status || "ativo"} /></span>
            </button>
          ))}
        </div>
      )}
      {view === "planilha" && (
        <div className="mb-3 flex justify-end">
          {canExport && <Button variant="outline" onClick={() => exportCsv(list.map(clientToSheet), "clientes.csv")}><Download className="h-4 w-4" />{tr("Exportar CSV")}</Button>}
        </div>
      )}
      {view === "planilha" && (
        <div className="panel w-full overflow-x-auto p-0">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              {["Nome", "Situação", "Empresa", "País", "Cliente desde"].map((h, i, a) => <th key={h} className={`border-b border-border bg-muted/60 px-4 py-3 font-semibold ${i < a.length - 1 ? "border-r" : ""}`}>{tr(h)}</th>)}
            </tr></thead>
            <tbody>
              {list.map((c, i) => (
                <tr key={c.id} onClick={() => setEdit(c)} className="group cursor-pointer">
                  <td className={`border-b border-r border-border px-4 py-3 font-semibold text-primary group-hover:bg-muted/60 ${i % 2 ? "bg-muted/25" : ""}`}><span className="flex flex-wrap items-center gap-2"><CreatedBy createdBy={c.created_by} owner={c.user_id} />{c.name}<TagBadges ids={c.tag_ids} /></span></td>
                  <td className="border-b border-r border-border px-4 py-3"><StatusIndicator area="clients" status={c.status || "ativo"} onChange={(status) => m.update.mutate({ id: c.id, status })} /></td>
                  <td className={`border-b border-r border-border px-4 py-3 text-muted-foreground group-hover:bg-muted/60 ${i % 2 ? "bg-muted/25" : ""}`}>{c.company || "-"}</td>
                  <td className={`border-b border-r border-border px-4 py-3 text-muted-foreground group-hover:bg-muted/60 ${i % 2 ? "bg-muted/25" : ""}`}>{c.country || "-"}</td>
                  <td className={`border-b border-border px-4 py-3 text-muted-foreground group-hover:bg-muted/60 ${i % 2 ? "bg-muted/25" : ""}`}>{fmtDate(c.created_at)}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={5} className="p-4 text-muted-foreground">{tr("Nenhum cliente encontrado")}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {view === "kanban" && <DragScroll>
        {CLIENT_STAGES.map((s) => {
          const items = list.filter((c) => (c.status || "ativo") === s.id);
          return (
            <div key={s.id}
              onDragOver={(e) => { e.preventDefault(); setOver(s.id); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault(); setOver(null);
                const id = Number(e.dataTransfer.getData("text/plain"));
                if (id) m.update.mutate({ id, status: s.id });
              }}
              className={`panel w-80 shrink-0 p-3 ${over === s.id ? "border-primary" : ""}`}>
              <div className="mb-3 flex justify-between"><StatusIndicator area="clients" status={s.id} /><span className="text-xs text-muted-foreground">{items.length}</span></div>
              <div className="min-h-24 space-y-2">
                {items.map((c) => (
                  <div key={c.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", String(c.id))}
                    onClick={() => setEdit(c)}
                    className="cursor-grab rounded-md border border-border bg-background p-3 text-sm hover:border-primary/60">
                    <div className="flex items-center justify-between gap-2 font-medium">{c.name}<CreatedBy createdBy={c.created_by} owner={c.user_id} /></div>
                    <TagBadges ids={c.tag_ids} />
                    <div className="mt-2"><StatusIndicator area="clients" status={c.status || "ativo"} onChange={(status) => m.update.mutate({ id: c.id, status })} /></div>
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">{c.company && <span>{c.company}</span>}{c.country && <span>{c.country}</span>}</div>
                    <select aria-label={tr("Mover")} className="field mt-2 h-7 text-xs md:hidden" value={c.status}
                      onClick={(e) => e.stopPropagation()} onChange={(e) => m.update.mutate({ id: c.id, status: e.target.value })}>
                      {CLIENT_STAGES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </DragScroll>}

      <Modal wide open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? tr("Ficha do cliente") : tr("Novo cliente")}>
        {edit && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr("Nome")} className="col-span-2"><input className="field" value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label={tr("E-mail")}><input className="field" value={edit.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
              <Field label={tr("Telefone")}><input className="field" value={edit.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
              <Field label={tr("Endereço")} className="col-span-2"><input className="field" value={edit.address ?? ""} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></Field>
              <CompanySelect value={edit.company} onChange={(company) => setEdit({ ...edit, company })} />
              <Field label={tr("País")}><input className="field" value={edit.country ?? ""} onChange={(e) => setEdit({ ...edit, country: e.target.value })} /></Field>
              <Field label={tr("Link da pasta do Drive")} className="col-span-2">
                <div className="flex gap-2">
                  <input className="field" placeholder="https://drive.google.com/drive/folders/..." value={edit.drive_url ?? ""} onChange={(e) => setEdit({ ...edit, drive_url: e.target.value || null })} />
                  {edit.drive_url && /^https?:\/\//.test(edit.drive_url) && <Button type="button" variant="outline" onClick={() => window.open(edit.drive_url!, "_blank", "noopener")}><FolderOpen className="h-4 w-4" />{tr("Abrir no Drive")}</Button>}
                </div>
              </Field>
              <TagPicker value={edit.tag_ids} onChange={(tag_ids) => setEdit({ ...edit, tag_ids })} />
              <PersonSelect label={tr("Cadastrado por")} value={edit.created_by} owner={edit.user_id} onChange={(created_by) => setEdit({ ...edit, created_by })} />
            </div>

            {edit.id && (
              <>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="kpi-label">{tr("Anexos")}</span>
                    <label className="flex cursor-pointer items-center gap-1 text-xs text-primary">
                      <Paperclip className="h-3 w-3" />{tr("Anexar PDF ou PNG")} <input type="file" accept=".pdf,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) attach(f); e.target.value = ""; }} />
                    </label>
                  </div>
                  {myFiles.length === 0 ? <p className="text-xs text-muted-foreground">{tr("Nenhum anexo")}</p> : (
                    <ul className="space-y-1">
                      {myFiles.map((f) => (
                        <li key={f.id} className="flex items-center justify-between rounded border border-border px-2 py-1.5 text-sm">
                          <button className="flex items-center gap-2 hover:text-primary" onClick={async () => { const u = await signedUrl(f.path); if (u) window.open(u, "_blank"); }}>
                            <FileText className="h-4 w-4" />{f.file_name}
                          </button>
                          <button aria-label={tr("Remover anexo")} className="text-muted-foreground hover:text-destructive" onClick={async () => {
                            if (!confirm(tr("Remover anexo?"))) return;
                            await supabase.storage.from("files").remove([f.path]);
                            fm.remove.mutate(f.id);
                          }}><Trash2 className="h-4 w-4" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <span className="kpi-label">{tr("Compras (lançadas no Financeiro)")}</span>
                  {purchases.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">{tr("Nenhuma compra vinculada")}</p> : (
                    <ul className="mt-2 space-y-1 text-sm">
                      {purchases.map((p) => (
                        <li key={p.id} className="flex justify-between gap-3 border-b border-border py-1">
                          <span className="truncate">{p.description}</span>
                          <span className="shrink-0 text-muted-foreground">{fmtDate(p.due_date || p.date)} · {money(p.amount, p.currency)} · {tr(p.status === "pago" ? "Pago" : "Pendente")}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
            <div className="flex justify-between">
              {edit.id ? <Button variant="ghost" onClick={() => { if (confirm(tr("Excluir este cliente?"))) { m.remove.mutate(edit.id!); setEdit(null); } }}><Trash2 className="h-4 w-4" />{tr("Excluir")}</Button> : <span />}
              <Button onClick={save}>{tr("Salvar")}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
