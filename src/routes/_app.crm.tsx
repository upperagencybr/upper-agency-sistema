import { useI18n } from "@/lib/i18n-context";
import { DateInput } from "@/components/app/DateInput";
import { StatusIndicator } from "@/components/app/StatusIndicator";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, CalendarClock, Trash2 } from "lucide-react";
import { useRows, useTableMutations, type Row } from "@/lib/data";
import { CURRENCIES, fmtDate, money } from "@/lib/format";
import { useStatusStages } from "@/lib/useStatusStages";
import { Button } from "@/components/ui/button";
import { DragScroll, Field, Modal, PageHeader } from "@/components/app/ui";
import { CompanySelect } from "@/components/app/CompanySelect";
import { OptionSelect, optionLabel } from "@/components/app/OptionSelect";
import { CreatedBy, PersonSelect, TagBadges, TagFilter, TagPicker, hasTag } from "@/components/app/team";

export const Route = createFileRoute("/_app/crm")({
  head: () => ({
    meta: [
      { title: "CRM | NEXO HUB" },
      { name: "description", content: "Funil de leads em quadro, com origem e data de retorno." },
      { property: "og:title", content: "CRM | NEXO HUB" },
      { property: "og:description", content: "Funil de leads em quadro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Crm,
});


type Lead = Row<"crm_leads">;

function Crm() {
  const { tr } = useI18n();
  const { data: leads = [] } = useRows("crm_leads");
  const STAGES = useStatusStages("crm", leads.map((l) => l.stage));
  const { data: companies = [] } = useRows("companies");
  const m = useTableMutations("crm_leads");
  const [edit, setEdit] = useState<Partial<Lead> | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [fTag, setFTag] = useState("");

  const save = async () => {
    if (!edit?.name) return;
    const { id, user_id: _u, created_at: _c, ...rest } = edit as Lead;
    if (id) await m.update.mutateAsync({ id, ...rest });
    else await m.insert.mutateAsync(rest);
    setEdit(null);
  };

  return (
    <div>
      <PageHeader title="CRM" sub={`${leads.length} lead${leads.length === 1 ? "" : "s"}`}
        actions={<Button onClick={() => setEdit({ stage: "lead", currency: "BRL" })}><Plus className="h-4 w-4" />{tr("Novo lead")}</Button>} />
      <div className="mb-4 max-w-xs"><TagFilter value={fTag} onChange={setFTag} /></div>
      <DragScroll>
        {STAGES.map((s) => {
          const items = leads.filter((l) => l.stage === s.id && hasTag(l.tag_ids, fTag));
          return (
            <div key={s.id}
              onDragOver={(e) => { e.preventDefault(); setOver(s.id); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault(); setOver(null);
                const id = Number(e.dataTransfer.getData("text/plain"));
                if (id) m.update.mutate({ id, stage: s.id });
              }}
              className={`panel w-72 shrink-0 p-3 transition-colors ${over === s.id ? "border-primary" : ""}`}>
              <div className="mb-3 flex items-center justify-between">
                <StatusIndicator area="crm" status={s.id} />
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="min-h-24 space-y-2">
                {items.map((l) => (
                  <div key={l.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", String(l.id))}
                    onClick={() => setEdit(l)}
                    className="cursor-grab rounded-md border border-border bg-background p-3 text-sm hover:border-primary/60">
                    <div className="flex items-center justify-between gap-2 font-medium">{l.name}<CreatedBy createdBy={l.created_by} owner={l.user_id} /></div>
                    <TagBadges ids={l.tag_ids} />
                    <div className="mt-2"><StatusIndicator area="crm" status={l.stage} onChange={(stage) => m.update.mutate({ id: l.id, stage })} /></div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {l.origin && <span>{optionLabel(l.origin)}</span>}
                      {l.company && <span>{l.company}</span>}
                      {l.est_value ? <span className="text-primary">{money(l.est_value, l.currency)}</span> : null}
                    </div>
                    {l.follow_up_date && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="h-3 w-3" />{tr("Retorno")} {fmtDate(l.follow_up_date)}</div>
                    )}
                    <select aria-label={tr("Mover etapa")} className="field mt-2 h-7 text-xs md:hidden" value={l.stage}
                      onClick={(e) => e.stopPropagation()} onChange={(e) => m.update.mutate({ id: l.id, stage: e.target.value })}>
                      {STAGES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </DragScroll>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? tr("Editar lead") : tr("Novo lead")}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("Nome")} className="col-span-2"><input className="field" value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label={tr("Etapa")}><select className="field" value={edit.stage ?? "lead"} onChange={(e) => setEdit({ ...edit, stage: e.target.value })}>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
            <OptionSelect label={tr("Origem")} list="lead_origins" value={edit.origin} onChange={(origin) => setEdit({ ...edit, origin })} />
            <Field label={tr("Data de retorno")}><DateInput value={edit.follow_up_date ?? ""} onChange={(e) => setEdit({ ...edit, follow_up_date: e.target.value || null })} /></Field>
            <CompanySelect value={edit.company} onChange={(company) => setEdit({ ...edit, company })} />
            <Field label={tr("Valor estimado")}><input type="number" step="0.01" className="field" value={edit.est_value ?? ""} onChange={(e) => setEdit({ ...edit, est_value: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label={tr("Moeda")}><select className="field" value={edit.currency ?? "BRL"} onChange={(e) => setEdit({ ...edit, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label={tr("E-mail")}><input className="field" value={edit.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
            <Field label={tr("Telefone")}><input className="field" value={edit.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label={tr("Notas")} className="col-span-2"><textarea rows={3} className="field" value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
            <PersonSelect label={tr("Criado por")} value={edit.created_by} owner={edit.user_id} onChange={(created_by) => setEdit({ ...edit, created_by })} />
            <TagPicker value={edit.tag_ids} onChange={(tag_ids) => setEdit({ ...edit, tag_ids })} />
            <div className="col-span-2 flex justify-between pt-2">
              {edit.id ? <Button variant="ghost" onClick={() => { if (confirm(tr("Excluir este lead?"))) { m.remove.mutate(edit.id!); setEdit(null); } }}><Trash2 className="h-4 w-4" />{tr("Excluir")}</Button> : <span />}
              <Button onClick={save}>{tr("Salvar")}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
