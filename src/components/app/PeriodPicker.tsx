import { useI18n } from "@/lib/i18n-context";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { enUS, es, ptBR } from "date-fns/locale";

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

/** "NOV 2026" */
export function periodLabel(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Box showing month + year. Clicking opens a calendar to pick day, month and year. */
export function PeriodPicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const { tr, lang, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(value);
  useEffect(() => { setView(value); }, [value]);
  const now = new Date();
  const pick = (d: Date) => { onChange(d); setOpen(false); };
  const quick = (d: Date) => { onChange(d); setView(d); };
  const chip = "rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="field flex h-9 w-auto cursor-pointer items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          {value.toLocaleDateString(locale, { month: "short", year: "numeric" })}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          locale={lang === "en" ? enUS : lang === "es" ? es : ptBR}
          mode="single"
          selected={value}
          month={view}
          onMonthChange={setView}
          onSelect={(d) => d && pick(d)}
          captionLayout="dropdown"
          startMonth={new Date(2020, 0)}
          endMonth={new Date(now.getFullYear() + 5, 11)}
        />
        <div className="flex items-center justify-between gap-1 border-t border-border px-2 py-1.5">
          <button type="button" className={chip} onClick={() => quick(new Date(now.getFullYear(), now.getMonth(), 1))}>{tr("Este mês")}</button>
          <button type="button" className={chip} onClick={() => quick(new Date(now.getFullYear(), now.getMonth() - 1, 1))}>{tr("Mês passado")}</button>
          <button type="button" className={chip} onClick={() => quick(new Date(now.getFullYear(), 0, 1))}>{tr("Este ano")}</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
