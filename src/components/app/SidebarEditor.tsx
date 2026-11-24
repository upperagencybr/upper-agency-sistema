import { useI18n } from "@/lib/i18n-context";
import { useEffect, useState } from "react";
import { GripVertical, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUpdateProfile } from "@/lib/data";
import { isRequiredSidebarItem, optionalHiddenSections, toggleHiddenSection } from "@/lib/sidebar";

type Item = { to: string; label: string };

/** Applies the user's saved order and names to the default nav list. */
export function applySidebarPrefs<T extends { to: string }>(items: T[], order: string[] | null | undefined): T[] {
  const ord = order ?? [];
  const rank = (to: string) => { const i = ord.indexOf(to); return i < 0 ? ord.length + items.findIndex((x) => x.to === to) : i; };
  return [...items].sort((a, b) => rank(a.to) - rank(b.to));
}

export function SidebarEditor({ open, onOpenChange, items, labels, hidden }: { open: boolean; onOpenChange: (v: boolean) => void; items: Item[]; labels: Record<string, string>; hidden: string[] }) {
  const { tr } = useI18n();
  const [list, setList] = useState<Item[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [hiddenPaths, setHiddenPaths] = useState<string[]>([]);
  const [drag, setDrag] = useState<number | null>(null);
  const upd = useUpdateProfile();
  useEffect(() => { if (open) { setList(items); setNames({ ...labels }); setHiddenPaths(optionalHiddenSections(hidden)); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (to: number) => {
    if (drag === null || drag === to) return;
    const l = [...list]; const [x] = l.splice(drag, 1); if (!x) return; l.splice(to, 0, x); setList(l); setDrag(to);
  };
  const save = async (order: string[], lbl: Record<string, string>, hiddenSections: string[]) => {
    const clean = Object.fromEntries(Object.entries(lbl).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]));
    await upd.mutateAsync({ sidebar_order: order, sidebar_labels: clean, sidebar_hidden: optionalHiddenSections(hiddenSections) });
    toast.success(tr("Barra lateral salva"));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{tr("Editar barra lateral")}</DialogTitle></DialogHeader>
        <div className="grid gap-1.5">
          {list.map((it, i) => (
            <div key={it.to} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => { e.preventDefault(); move(i); }} onDragEnd={() => setDrag(null)}
              className={`flex items-center gap-2 rounded-md border border-border p-1.5 ${drag === i ? "opacity-50" : ""} ${hiddenPaths.includes(it.to) ? "bg-muted/40" : ""}`}>
              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
              <input aria-label={tr("Nome da aba {0}", [it.label])} className="field min-w-0 flex-1" value={names[it.to] ?? ""} placeholder={it.label} onChange={(e) => setNames({ ...names, [it.to]: e.target.value })} />
              {hiddenPaths.includes(it.to) && <span className="text-[10px] text-muted-foreground">{tr("Oculta")}</span>}
              {isRequiredSidebarItem(it.to) ? <span className="h-8 w-8 shrink-0" /> : <Button type="button" size="icon" variant="ghost" className={`h-8 w-8 shrink-0 ${hiddenPaths.includes(it.to) ? "text-success hover:text-success" : "text-destructive hover:text-destructive"}`} aria-label={`${tr(hiddenPaths.includes(it.to) ? "Mostrar" : "Esconder")} ${it.label}`} title={`${tr(hiddenPaths.includes(it.to) ? "Mostrar" : "Esconder")} ${it.label}`} onClick={() => setHiddenPaths(toggleHiddenSection(hiddenPaths, it.to))}>
                {hiddenPaths.includes(it.to) ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              </Button>}
            </div>
          ))}
        </div>
        <div className="flex justify-between gap-2">
          <Button variant="ghost" disabled={upd.isPending} onClick={() => save([], {}, [])}>{tr("Voltar ao padrão")}</Button>
          <Button onClick={() => save(list.map((x) => x.to), names, hiddenPaths)} disabled={upd.isPending}>{tr("Salvar")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
