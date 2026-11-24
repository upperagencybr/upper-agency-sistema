import { useI18n } from "@/lib/i18n-context";
import { DateInput } from "@/components/app/DateInput";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { useRows, useTableMutations, type Row } from "@/lib/data";
import { PROJECT_STAGES } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { DragScroll, Field, Modal, PageHeader } from "@/components/app/ui";
import { ClientSelect } from "@/components/app/ClientSelect";
import { CompanySelect } from "@/components/app/CompanySelect";
import { CreatedBy, PersonSelect, TagBadges, TagFilter, TagPicker, hasTag } from "@/components/app/team";

export const Route = createFileRoute("/_app/projetos")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Projetos | NEXO HUB" },
      { name: "description", content: "Projetos por etapa, com cliente e prazo." },
      { property: "og:title", content: "Projetos | NEXO HUB" },
      { property: "og:description", content: "Projetos por etapa." },
    ],
  }),
  component: Projetos,
});

type P = Row<"projects">;

function Projetos() {
  const { tr } = useI18n();
  const { data: projects = [] } = useRows("projects");
  const { data: clients = [] } = useRows("clients");
  const { data: companies = [] } = useRows("companies");
  const m = useTableMutations("projects");
  const [edit, setEdit] = useState<Partial<P> | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [fTag, setFTag] = useState("");
  const clientName = (id: number | null) => clients.find((c) => c.id === id)?.name;

  const save = async () => {
    if (!edit?.name) return;
    const { id, user_id: _u, created_at: _c, ...rest } = edit as P;
    if (id) await m.update.mutateAsync({ id, ...rest });
    else await m.insert.mutateAsync(rest);
    setEdit(null);
  };

  return (
    <div>
      <PageHeader title={tr("Projetos")} sub={tr("{0} projeto{1}", [projects.length, projects.length === 1 ? "" : "s"])}
        actions={<Button onClick={() => setEdit({ stage: "a fazer" })}><Plus className="h-4 w-4" />{tr("Novo projeto")}</Button>} />
      <div className="mb-4 max-w-xs"><TagFilter value={fTag} onChange={setFTag} /></div>
      <DragScroll>
        {PROJECT_STAGES.map((s) => {
          const items = projects.filter((p) => p.stage === s.id && hasTag(p.tag_ids, fTag));
          return (
            <div key={s.id}
              onDragOver={(e) => { e.preventDefault(); setOver(s.id); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); const id = Number(e.dataTransfer.getData("text/plain")); if (id) m.update.mutate({ id, stage: s.id }); }}
              className={`panel w-80 shrink-0 p-3 ${over === s.id ? "border-primary" : ""}`}>
              <div className="mb-3 flex justify-between"><span className="kpi-label">{tr(s.label)}</span><span className="text-xs text-muted-foreground">{items.length}</span></div>
              <div className="min-h-24 space-y-2">
                {items.map((p) => (
                  <div key={p.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", String(p.id))} onClick={() => setEdit(p)}
                    className="cursor-grab rounded-md border border-border bg-background p-3 text-sm hover:border-primary/60">
                    <div className="flex items-center justify-between gap-2 font-medium">{p.name}<CreatedBy createdBy={p.created_by} owner={p.user_id} /></div>
                    <TagBadges ids={p.tag_ids} />
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">{clientName(p.client_id) && <span>{clientName(p.client_id)}</span>}{p.company && <span>{p.company}</span>}</div>
                    {p.due_date && <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="h-3 w-3" />{tr("Prazo")} {fmtDate(p.due_date)}</div>}
                    <select aria-label={tr("Mover")} className="field mt-2 h-7 text-xs md:hidden" value={p.stage} onClick={(e) => e.stopPropagation()} onChange={(e) => m.update.mutate({ id: p.id, stage: e.target.value })}>
                      {PROJECT_STAGES.map((x) => <option key={x.id} value={x.id}>{tr(x.label)}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </DragScroll>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? tr("Editar projeto") : tr("Novo projeto")}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("Nome")} className="col-span-2"><input className="field" value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <ClientSelect value={edit.client_id} company={edit.company} onChange={(client_id) => setEdit({ ...edit, client_id })} />
            <CompanySelect value={edit.company} onChange={(company) => setEdit({ ...edit, company })} />
            <Field label={tr("Etapa")}><select className="field" value={edit.stage ?? "a fazer"} onChange={(e) => setEdit({ ...edit, stage: e.target.value })}>{PROJECT_STAGES.map((s) => <option key={s.id} value={s.id}>{tr(s.label)}</option>)}</select></Field>
            <Field label={tr("Prazo")}><DateInput value={edit.due_date ?? ""} onChange={(e) => setEdit({ ...edit, due_date: e.target.value || null })} /></Field>
            <PersonSelect label={tr("Criado por")} value={edit.created_by} owner={edit.user_id} onChange={(created_by) => setEdit({ ...edit, created_by })} />
            <TagPicker value={edit.tag_ids} onChange={(tag_ids) => setEdit({ ...edit, tag_ids })} />
            <div className="col-span-2 flex justify-between pt-2">
              {edit.id ? <Button variant="ghost" onClick={() => { if (confirm(tr("Excluir projeto?"))) { m.remove.mutate(edit.id!); setEdit(null); } }}><Trash2 className="h-4 w-4" />{tr("Excluir")}</Button> : <span />}
              <Button onClick={save}>{tr("Salvar")}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
