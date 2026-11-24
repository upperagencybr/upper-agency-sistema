export const CURRENCIES = [
  "BRL", "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "MXN",
  "ARS", "CLP", "COP", "PEN", "UYU", "PYG", "BOB", "INR", "ZAR", "NZD",
] as const;

export function money(v: number | null | undefined, currency: string | null | undefined) {
  const cur = currency || "USD";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur }).format(Number(v || 0));
  } catch {
    return `${cur} ${Number(v || 0).toFixed(2)}`;
  }
}

export function todayStr() {
  const d = new Date();
  return toDateStr(d);
}
export function toDateStr(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
export function parseDate(s: string) {
  const [y = 0, m = 1, d = 1] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function addMonths(s: string, n: number) {
  const d = parseDate(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toDateStr(d);
}
export function addDays(s: string, n: number) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}
export function daysUntil(s: string) {
  return Math.round((parseDate(s).getTime() - parseDate(todayStr()).getTime()) / 86400000);
}
export function fmtDate(s: string | null | undefined) {
  if (!s) return "";
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
export function monthKey(s: string) {
  return s.slice(0, 7);
}
export function monthLabel(key: string) {
  const [y = 0, m = 1] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}
