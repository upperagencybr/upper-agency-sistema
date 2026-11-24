import type { Row } from "./data";
import { fmtDate, todayStr } from "./format";

type ReportOptions = { title: string; rows: Record<string, unknown>[]; company?: Row<"companies"> | undefined; logoUrl?: string | null; period: string; systemName: string };

export async function buildReportPdf(options: ReportOptions) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ format: "a4" });
  const colors = getComputedStyle(document.documentElement);
  const ink = colors.getPropertyValue("--report-ink").trim();
  const muted = colors.getPropertyValue("--report-muted").trim();
  const line = colors.getPropertyValue("--report-line").trim();
  const accent = colors.getPropertyValue("--report-accent").trim();
  const brand = options.company?.name || options.systemName;
  let logo: string | undefined;
  if (options.logoUrl) {
    const response = await fetch(options.logoUrl);
    if (!response.ok) throw new Error("Não foi possível carregar a logo do relatório.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image(); img.src = url; await img.decode();
      const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const context = canvas.getContext("2d");
      if (context) { context.drawImage(img, 0, 0); logo = canvas.toDataURL("image/png"); }
    } finally { URL.revokeObjectURL(url); }
  }
  let y = 0;
  const header = () => {
    let x = 17;
    if (logo) { const props = doc.getImageProperties(logo); const ratio = Math.min(14 / props.width, 14 / props.height); doc.addImage(logo, "PNG", x, 17, props.width * ratio, props.height * ratio); x = 35; }
    doc.setTextColor(ink); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    const nameLines = doc.splitTextToSize(brand, 193 - x); doc.text(nameLines, x, 21);
    let base = 21 + (nameLines.length - 1) * 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(muted);
    if (options.company?.tax_id) { base += 5; doc.text(`CNPJ: ${options.company.tax_id}`, x, base); }
    if (options.company?.legal_name) { base += 4; const legal = doc.splitTextToSize(options.company.legal_name, 193 - x); doc.text(legal, x, base); base += (legal.length - 1) * 4; }
    y = Math.max(34, base + 4);
    doc.setDrawColor(accent); doc.setLineWidth(0.4); doc.line(17, y, 193, y); y += 7;
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(ink); doc.text(options.title, 17, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(muted);
    const context = doc.splitTextToSize(`${brand} · ${options.period} · ${options.rows.length} registro(s) no arquivo`, 176);
    doc.text(context, 17, y); y += context.length * 4;
    doc.text(`Gerado em ${fmtDate(todayStr())}`, 17, y); y += 5;
    doc.setDrawColor(line); doc.setLineWidth(0.2); doc.line(17, y, 193, y); y += 7;
  };
  const newPage = () => { doc.addPage(); header(); };
  header();
  for (const row of options.rows) {
    const entries = Object.entries(row).filter(([, value]) => value !== "" && value !== null && value !== undefined);
    const [heading, ...fields] = entries;
    if (!heading) continue;
    const nameLines = doc.splitTextToSize(String(heading[1]), 176);
    const lines = fields.map(([key, value]) => ({ key: `${key}: `, value: String(value) }));
    const height = nameLines.length * 5 + lines.reduce((sum, field) => sum + doc.splitTextToSize(field.value, 176 - doc.getTextWidth(field.key)).length * 4.5, 0) + 7;
    if (y + Math.min(height, 180) > 276) newPage();
    doc.setTextColor(ink); doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text(nameLines, 17, y); y += nameLines.length * 5;
    for (const field of lines) {
      doc.setFontSize(8); doc.setFont("helvetica", "bold");
      const keyWidth = doc.getTextWidth(field.key);
      doc.setFont("helvetica", "normal");
      const valueLines: string[] = doc.splitTextToSize(field.value, Math.max(60, 176 - keyWidth));
      for (let i = 0; i < valueLines.length; i++) {
        if (y > 276) newPage();
        doc.setTextColor(ink); doc.setFontSize(8);
        if (i === 0) { doc.setFont("helvetica", "bold"); doc.text(field.key, 17, y); }
        doc.setFont("helvetica", "normal"); doc.text(valueLines[i] ?? "", 17 + keyWidth, y); y += 4.5;
      }
    }
    y += 2; doc.setDrawColor(line); doc.line(17, y, 193, y); y += 6;
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(muted);
    doc.text(`${brand} · ${page}/${pages}`, 105, 287, { align: "center", maxWidth: 176 });
  }
  doc.setProperties({ title: options.title, author: brand });
  return doc.output("blob");
}