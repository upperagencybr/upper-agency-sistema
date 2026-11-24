import { useI18n } from "@/lib/i18n-context";
import { DateInput } from "@/components/app/DateInput";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRows, useTableMutations, type Row } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Empty, Field, Modal, PageHeader } from "@/components/app/ui";
import { ClientSelect } from "@/components/app/ClientSelect";

export const Route = createFileRoute("/_app/mentorados")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Mentorados | NEXO HUB" },
      { name: "description", content: "Sessões de mentoria com tema, resumo e próximo passo." },
      { property: "og:title", content: "Mentorados | NEXO HUB" },
      { property: "og:description", content: "Sessões de mentoria." },
    ],
  }),
  component: Mentorados,
});

type S = Row<"mentoring_sessions">;

function Mentorados() {
  const { tr } = useI18n();
  const { data: sessions = [] } = useRows("mentoring_sessions");
  const { data: clients = [] } = useRows("clients");
  const m = useTableMutations("mentoring_sessions");
  const [edit, setEdit] = useState<Partial<S> | null>(null);

  const save = async () => {
    if (!edit?.client_id) return;
    const { id, user_id: _u, created_at: _c, ...rest } = edit as S;
    rest.mentee_name = clients.find((c) => c.id === rest.client_id)?.name ?? rest.mentee_name;
    if (id) await m.update.mutateAsync({ id, ...rest });
    else await m.insert.mutateAsync(rest);
    setEdit(null);
  };

  return (
    <div>
      <PageHeader title={tr("Mentorados")} sub={tr("{0} sessões", [sessions.length])} actions={<Button onClick={() => setEdit({})}><Plus className="h-4 w-4" />{tr("Nova sessão")}</Button>} />
      {sessions.length === 0 ? <Empty>{tr("Nenhuma sessão registrada ainda.")}</Empty> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s) => (
            <button key={s.id} onClick={() => setEdit(s)} className="panel p-4 text-left hover:border-primary/60">
              <div className="flex justify-between gap-2"><span className="font-semibold">{s.mentee_name}</span><span className="text-xs text-muted-foreground">{fmtDate(s.session_date)}</span></div>
              {s.theme && <div className="mt-1 text-sm text-primary">{s.theme}</div>}
              {s.summary && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.summary}</p>}
              {s.next_step && <p className="mt-2 text-xs"><span className="text-muted-foreground">{tr("Próximo passo:")} </span>{s.next_step}</p>}
              {s.contact_date && <p className="mt-1 text-xs text-muted-foreground">{tr("Verificar em")} {fmtDate(s.contact_date)}</p>}
            </button>
          ))}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? tr("Editar sessão") : tr("Nova sessão")}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <ClientSelect label={tr("Mentorado (cliente)")} className="col-span-2" value={edit.client_id} onChange={(client_id) => setEdit({ ...edit, client_id })} />
            <Field label={tr("Tema")} className="col-span-2"><input className="field" value={edit.theme ?? ""} onChange={(e) => setEdit({ ...edit, theme: e.target.value })} /></Field>
            <Field label={tr("Data que fechou")}><DateInput value={edit.closed_date ?? ""} onChange={(e) => setEdit({ ...edit, closed_date: e.target.value || null })} /></Field>
            <Field label={tr("Data da mentoria")}><DateInput value={edit.session_date ?? ""} onChange={(e) => setEdit({ ...edit, session_date: e.target.value || null })} /></Field>
            <Field label={tr("Resumo do que foi trabalhado")} className="col-span-2"><textarea rows={3} className="field" value={edit.summary ?? ""} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} /></Field>
            <Field label={tr("Próximo passo combinado")} className="col-span-2"><textarea rows={2} className="field" value={edit.next_step ?? ""} onChange={(e) => setEdit({ ...edit, next_step: e.target.value })} /></Field>
            <Field label={tr("Data para verificar se executou")}><DateInput value={edit.contact_date ?? ""} onChange={(e) => setEdit({ ...edit, contact_date: e.target.value || null })} /></Field>
            <div className="col-span-2 flex justify-between pt-2">
              {edit.id ? <Button variant="ghost" onClick={() => { if (confirm(tr("Excluir sessão?"))) { m.remove.mutate(edit.id!); setEdit(null); } }}><Trash2 className="h-4 w-4" />{tr("Excluir")}</Button> : <span />}
              <Button onClick={save}>{tr("Salvar")}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
