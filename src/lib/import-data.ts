import type { Insert, Row } from "./data";
import { CURRENCIES } from "./format";

export type ImportKind = "clients" | "transactions";
export type ImportSheet = { name: string; headers: string[]; rows: Record<string, unknown>[] };
export type ColumnMap = Record<string, string>;
export const IMPORT_FIELDS = {
  clients: ["name", "email", "phone", "address", "country", "notes", "drive_url"],
  transactions: ["description", "amount", "type", "currency", "date", "due_date", "status", "paid_at", "client_name", "category"],
} as const;
export const IMPORT_LABELS: Record<string, string> = { name: "Nome", email: "E-mail", phone: "Telefone", address: "Endereço", country: "País", notes: "Notas", drive_url: "Link da pasta do Drive", description: "Descrição", amount: "Valor", type: "Tipo", currency: "Moeda", date: "Data", due_date: "Vencimento", status: "Situação", paid_at: "Data da baixa", client_name: "Cliente", category: "Categoria" };
const normalize = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const aliases: Record<string, string[]> = {
  name: ["nome", "name", "cliente", "client", "customer", "nomecliente", "razaosocial"], email: ["email", "correio", "mail"], phone: ["telefone", "phone", "celular", "whatsapp", "telefono"], address: ["endereco", "address", "direccion"], country: ["pais", "country"], notes: ["notas", "notes", "observacoes"], drive_url: ["drive", "driveurl", "linkdapastadodrive"], description: ["descricao", "description", "descripcion", "historico", "lancamento", "memo"], amount: ["valor", "amount", "importe", "valortotal", "total"], type: ["tipo", "type", "natureza"], currency: ["moeda", "currency", "moneda"], date: ["data", "date", "fecha", "datadolancamento"], due_date: ["vencimento", "duedate", "datadevencimento", "due"], status: ["situacao", "status", "estado"], paid_at: ["datadabaixa", "paidat", "datapagamento", "paymentdate"], client_name: ["cliente", "client", "customer", "nomecliente", "clientname"], category: ["categoria", "category", "categorias"]
};
export function detectColumns(sheet: ImportSheet, kind: ImportKind): ColumnMap {
  return Object.fromEntries(IMPORT_FIELDS[kind].map(field => [field, sheet.headers.find(h => aliases[field]?.includes(normalize(h))) ?? ""]));
}
export function parseImportAmount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let s = String(value ?? "").trim().replace(/[^0-9.,()\-]/g, "");
  if (!s || !/\d/.test(s)) return null;
  if (s.startsWith("(") && s.endsWith(")")) s = "-" + s.slice(1, -1);
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
export function parseImportDate(value: unknown): string | null {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "number") {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  const local = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(s);
  const y = Number(iso?.[1] ?? local?.[3]), m = Number(iso?.[2] ?? local?.[2]), d = Number(iso?.[3] ?? local?.[1]);
  if (!y || !m || !d) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}
export type ImportOptions = { kind: ImportKind; map: ColumnMap; company: string | null; currency: string; type: "receita" | "despesa" };
export type PreparedRow = { line: number; data: Insert<"clients"> | Insert<"transactions"> | null; error: string | null; duplicate: boolean };
export function importFingerprint(kind: ImportKind, row: Partial<Row<"clients">> | Partial<Row<"transactions">>) {
  if (kind === "clients") {
    const c = row as Partial<Row<"clients">>;
    return JSON.stringify([normalize(c.company), c.email?.trim().toLowerCase() || normalize(c.name), c.email ? "" : normalize(c.phone)]);
  }
  const t = row as Partial<Row<"transactions">>;
  return JSON.stringify([normalize(t.company), normalize(t.description), Number(t.amount), t.currency, t.type, (t.due_date || t.date || "").slice(0, 10), t.status, normalize(t.client_name)]);
}
export function prepareImport(sheet: ImportSheet, options: ImportOptions, existing: (Row<"clients"> | Row<"transactions">)[] = []): PreparedRow[] {
  const seen = new Set(existing.map(row => importFingerprint(options.kind, row)));
  return sheet.rows.map((row, i) => {
    const get = (field: string) => row[options.map[field] ?? ""];
    const text = (field: string) => String(get(field) ?? "").trim();
    let data: PreparedRow["data"] = null, error: string | null = null;
    if (options.kind === "clients") {
      const name = text("name");
      if (!name) error = "Informe o nome";
      else if (text("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text("email"))) error = "Informe um e-mail válido";
      else if (text("drive_url") && !/^https?:\/\//i.test(text("drive_url"))) error = "Link inválido";
      else data = { name, email: text("email") || null, phone: text("phone") || null, address: text("address") || null, country: text("country") || null, notes: text("notes") || null, drive_url: text("drive_url") || null, company: options.company, status: "ativo" };
    } else {
      const amount = parseImportAmount(get("amount"));
      const rawType = normalize(text("type"));
      const type = !rawType ? (amount !== null && amount < 0 ? "despesa" : options.type) : ["receita", "income", "revenue", "entrada", "credito", "ingreso"].includes(rawType) ? "receita" : ["despesa", "expense", "saida", "debito", "gasto"].includes(rawType) ? "despesa" : null;
      const rawStatus = normalize(text("status"));
      const status = !rawStatus ? "pendente" : ["pago", "paid", "pagado", "recebido", "paga", "concluido", "liquidado"].includes(rawStatus) ? "pago" : ["pendente", "pending", "pendiente", "vencido", "overdue", "aberto", "apagar", "areceber"].includes(rawStatus) ? "pendente" : null;
      const currency = (text("currency") || options.currency).toUpperCase();
      const date = parseImportDate(get("date")), due = parseImportDate(get("due_date")), paid = parseImportDate(get("paid_at"));
      if (!text("description") || amount === null) error = "Informe descrição e valor";
      else if (!type || !status) error = "Tipo ou situação não reconhecidos";
      else if (!(CURRENCIES as readonly string[]).includes(currency)) error = "Moeda não reconhecida";
      else if (["date", "due_date", "paid_at"].some(f => text(f) && !parseImportDate(get(f)))) error = "Data inválida";
      else if (!date && !due) error = "Informe a data ou o vencimento";
      else if (status === "pago" && !paid) error = "Informe a data da baixa";
      else data = { description: text("description"), amount: Math.abs(amount), type, status, currency, date: date || due, due_date: due || date, paid_at: paid, client_name: text("client_name") || null, category: text("category") || null, company: options.company };
    }
    const key = data ? importFingerprint(options.kind, data) : "";
    const duplicate = !!data && seen.has(key);
    if (data) seen.add(key);
    return { line: i + 2, data, error, duplicate };
  });
}

export async function readImportFile(file: File): Promise<ImportSheet[]> {
  if (file.size > 20 * 1024 * 1024) throw new Error("O arquivo excede 20 MB");
  const XLSX = await import("xlsx");
  const input = new Uint8Array(await file.arrayBuffer());
  const entries: { name: string; bytes: Uint8Array }[] = [];
  if (/\.zip$/i.test(file.name)) {
    const { unzip } = await import("fflate");
    let total = 0, count = 0;
    const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => unzip(input, { filter: f => {
      if (!/\.(xlsx?|csv)$/i.test(f.name) || /(^|\/)\.|__MACOSX/.test(f.name)) return false;
      total += f.originalSize; count++;
      if (total > 50 * 1024 * 1024 || count > 50) return false;
      return true;
    } }, (error, result) => error ? reject(new Error("Não foi possível abrir o ZIP")) : total > 50 * 1024 * 1024 || count > 50 ? reject(new Error("O ZIP excede o limite de leitura")) : resolve(result)));
    for (const [name, bytes] of Object.entries(files)) entries.push({ name, bytes });
  } else if (/\.(xlsx?|csv)$/i.test(file.name)) entries.push({ name: file.name, bytes: input });
  else throw new Error("Envie Excel, CSV ou ZIP com planilhas");
  const sheets: ImportSheet[] = [];
  for (const entry of entries) {
    const book = XLSX.read(entry.bytes, { type: "array", cellDates: false, sheetRows: 10002 });
    for (const name of book.SheetNames) {
      const worksheet = book.Sheets[name];
      if (!worksheet) continue;
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "", blankrows: false });
      if (matrix.length > 10001) throw new Error("A planilha excede 10.000 linhas");
      const start = matrix.findIndex(r => r.filter(v => String(v).trim()).length >= 2);
      if (start < 0) continue;
      const header = matrix[start] ?? [];
      const headers = header.map((v, i) => `${String(v || `Coluna ${i + 1}`).trim()}${header.slice(0, i).some(h => String(h) === String(v)) ? ` (${i + 1})` : ""}`);
      const rows = matrix.slice(start + 1).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))).filter(row => Object.values(row).some(v => String(v).trim()));
      if (rows.length) sheets.push({ name: `${entry.name} · ${name}`, headers, rows });
    }
  }
  if (!sheets.length) throw new Error("Nenhuma planilha encontrada no arquivo");
  return sheets;
}