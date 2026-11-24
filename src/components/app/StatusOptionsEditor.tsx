import { useI18n } from "@/lib/i18n-context";
import { useState } from "react";
import { Pencil, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useProfile, useUpdateProfile } from "@/lib/data";
import { resolveStatusStages, type StatusLists, type StatusStage } from "@/lib/status-lists";
import type { StatusArea } from "@/lib/status-appearance";
import { Panel } from "@/components/app/ui";
import { Button } from "@/components/ui/button";

export function StatusOptionsEditor({ area, title }: { area: StatusArea; title: string }) {
  const { tr, lang } = useI18n();
  const { data: profile } = useProfile();
  const up = useUpdateProfile();
  const stages = resolveStatusStages(profile?.status_lists, area);
  const [name, setName] = useState("");
  const [edit, setEdit] = useState<{ id: string; label: string } | null>(null);
  const save = async (next: StatusStage[]) => {
    const lists = (profile?.status_lists as StatusLists | undefined) ?? {};
    await up.mutateAsync({ status_lists: JSON.parse(JSON.stringify({ ...lists, [area]: next })) });
    toast.success(tr("Opções salvas"));
  };
  const add = async () => {
    const label = name.trim();
    if (!label) return;
    if (stages.some((s) => s.label.toLocaleLowerCase() === label.toLocaleLowerCase())) { toast.error(tr("Esta opção já existe")); return; }
    await save([...stages, { id: `custom_${crypto.randomUUID()}`, label }]);
    setName("");
  };
  return <Panel title={title}>
    <ul className="mb-3 space-y-2">{stages.map((s) => <li key={s.id} className="flex items-center gap-2 border-b border-border py-2 text-sm">
      {edit?.id === s.id ? <>
        <input aria-label={tr("Nome de {0}", [s.label])} className="field min-w-0 flex-1" value={edit.label} onChange={(e) => setEdit({ id: s.id, label: e.target.value })} />
        <Button variant="ghost" size="icon" aria-label={tr("Salvar {0}", [s.label])} disabled={up.isPending || !edit.label.trim()} onClick={async () => { await save(stages.map((v) => v.id === s.id ? { ...v, label: edit.label.trim() } : v)); setEdit(null); }}><Check className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" aria-label={tr("Cancelar edição")} onClick={() => setEdit(null)}><X className="h-4 w-4" /></Button>
      </> : <><span className="flex-1">{resolveStatusStages(profile?.status_lists, area, [], lang).find(x => x.id === s.id)?.label ?? s.label}</span><Button variant="ghost" size="icon" aria-label={tr("Editar {0}", [s.label])} onClick={() => setEdit(s)}><Pencil className="h-4 w-4" /></Button></>}
    </li>)}</ul>
    <div className="flex gap-2"><input className="field min-w-0 flex-1" aria-label={tr("Nova opção de {0}", [title])} placeholder={tr("Nova opção")} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !up.isPending) void add(); }} /><Button disabled={up.isPending || !name.trim()} onClick={() => void add()}><Plus className="h-4 w-4" />{tr("Adicionar")}</Button></div>
  </Panel>;
}