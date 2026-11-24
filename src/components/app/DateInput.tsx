import { useI18n } from "@/lib/i18n-context";
import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";

const toBr = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
const mask = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join("/");
};

/** Date field always shown as dd/mm/aaaa (pt-BR), whatever the browser language. Value stays yyyy-mm-dd. */
export function DateInput({ value, onChange, className = "field", min }: {
  value: string; onChange: (e: { target: { value: string } }) => void; className?: string; min?: string | undefined;
}) {
  const { tr, locale } = useI18n();
  const [text, setText] = useState(toBr(value));
  const pick = useRef<HTMLInputElement>(null);
  useEffect(() => { setText(toBr(value)); }, [value]);
  const type = (v: string) => {
    const m = mask(v); setText(m);
    if (m === "") onChange({ target: { value: "" } });
    const r = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(m);
    if (r) {
      const iso = `${r[3]}-${r[2]}-${r[1]}`;
      if (!Number.isNaN(Date.parse(iso))) onChange({ target: { value: iso } });
    }
  };
  return (
    <div className="relative">
      <input className={`${className} pr-9`} inputMode="numeric" placeholder={tr("dd/mm/aaaa")} value={text} onChange={(e) => type(e.target.value)} />
      <button type="button" aria-label={tr("Abrir calendário")} onClick={() => pick.current?.showPicker?.()}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        <CalendarDays className="h-4 w-4" />
      </button>
      <input ref={pick} type="date" tabIndex={-1} aria-hidden lang={locale} min={min} value={value}
        onChange={(e) => onChange({ target: { value: e.target.value } })} className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0" />
    </div>
  );
}
