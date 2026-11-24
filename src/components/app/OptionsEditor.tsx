import { useI18n } from "@/lib/i18n-context";
import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useProfile, useUpdateProfile } from "@/lib/data";
import type { OptionKey } from "@/components/app/OptionSelect";
import { Panel } from "@/components/app/ui";

export function OptionsEditor({ title, list }: { title: string; list: OptionKey }) {
  const { tr } = useI18n();
  const { data: p } = useProfile();
  const up = useUpdateProfile();
  const opts = p?.[list] ?? [];
  const [neu, setNeu] = useState("");
  const [ed, setEd] = useState<{ i: number; v: string } | null>(null);
  const save = (next: string[]) => up.mutate({ [list]: next });
  return (
    <Panel title={title}>
      <ul className="mb-3 space-y-1">
        {opts.map((o, i) => (
          <li key={o + i} className="flex items-center gap-2 rounded border border-border px-2 py-1.5 text-sm">
            {ed?.i === i ? (
              <>
                <input autoFocus className="field h-7 flex-1 text-sm" value={ed.v} onChange={(e) => setEd({ i, v: e.target.value })} />
                <button aria-label={tr("Salvar")} onClick={() => { if (ed.v.trim()) save(opts.map((x, j) => (j === i ? ed.v.trim() : x))); setEd(null); }} className="text-primary"><Check className="h-4 w-4" /></button>
                <button aria-label={tr("Cancelar")} onClick={() => setEd(null)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
              </>
            ) : (
              <>
                <span className="flex-1">{o}</span>
                <button aria-label={tr("Editar {0}", [o])} onClick={() => setEd({ i, v: o })} className="text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                <button aria-label={tr("Remover {0}", [o])} onClick={() => { if (confirm(tr("Remover \"{0}\"? Itens já salvos mantêm o valor.", [o]))) save(opts.filter((_, j) => j !== i)); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input className="field flex-1" placeholder={tr("Nova opção")} value={neu} onChange={(e) => setNeu(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && neu.trim()) { save([...opts, neu.trim()]); setNeu(""); } }} />
        <button className="chip flex items-center gap-1" onClick={() => { if (neu.trim()) { save([...opts, neu.trim()]); setNeu(""); } }}><Plus className="h-3 w-3" />{tr("Adicionar")}</button>
      </div>
    </Panel>
  );
}
