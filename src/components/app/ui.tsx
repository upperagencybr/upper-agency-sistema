import { useI18n } from "@/lib/i18n-context";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  const { tr } = useI18n();
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{tr(title)}</h1>
        {sub && <p className="mt-0.5 text-sm text-muted-foreground">{tr(sub)}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  const { tr } = useI18n();
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-xs text-muted-foreground">{tr(label)}</span>
      {children}
    </label>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const { tr } = useI18n();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}>
        <DialogHeader><DialogTitle>{tr(title)}</DialogTitle></DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="panel p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Panel({ title, children, action, className = "" }: { title?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  const { tr } = useI18n();
  return (
    <section className={`panel p-4 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h3 className="text-sm font-semibold">{tr(title)}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Horizontally scrolling area with hidden scrollbar that can be dragged with the mouse. */
export function DragScroll({ children }: { children: ReactNode }) {
  const { tr } = useI18n();
  return (
    <div
      className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0"
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse" || (e.target as HTMLElement).closest("[draggable=true],button,input,select,a")) return;
        const el = e.currentTarget;
        const startX = e.clientX;
        const start = el.scrollLeft;
        const move = (ev: PointerEvent) => { el.scrollLeft = start - (ev.clientX - startX); };
        const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }}
    >
      {children}
    </div>
  );
}
