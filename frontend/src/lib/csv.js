/**
 * CSV export, so the numbers can leave the system.
 *
 * Until this existed, the only copy of fourteen days of trading was a
 * Firestore project nobody had a backup of, and an accountant asking
 * for the month had no answer. A spreadsheet is the lowest common
 * denominator and every bookkeeper already has one open.
 */

/** Quotes only what needs it, which keeps the file readable. */
function cell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(columns, rows) {
  const lines = [columns.map((c) => cell(c.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => cell(c.value(row))).join(","));
  }
  return lines.join("\r\n");
}

/**
 * A BOM, because the intended reader is Excel on a Windows machine in a
 * back office, and without one it renders peso signs and Filipino names
 * as mojibake.
 */
export function downloadCsv(filename, csv) {
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  /* Revoking immediately can cancel the download in some browsers. */
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const money = (n) => (Number(n) || 0).toFixed(2);

export const SALE_COLUMNS = [
  { header: "Receipt", value: (s) => s.number },
  { header: "Type", value: (s) => (s.type === "return" ? "Return" : "Sale") },
  { header: "Date", value: (s) => new Date(s.at).toLocaleDateString("en-PH") },
  { header: "Time", value: (s) => new Date(s.at).toLocaleTimeString("en-PH") },
  { header: "Status", value: (s) => s.status },
  { header: "Cashier", value: (s) => s.cashier?.name ?? "" },
  { header: "Terminal", value: (s) => s.number.split("-")[0] },
  { header: "Items", value: (s) => s.itemCount },
  { header: "Subtotal", value: (s) => money(s.subtotal) },
  { header: "Discount", value: (s) => money(s.discount) },
  { header: "VAT", value: (s) => money(s.tax) },
  { header: "VAT exempt", value: (s) => (s.vatExempt ? "yes" : "") },
  { header: "Total", value: (s) => money(s.total) },
  {
    header: "Payment",
    value: (s) =>
      (s.payment?.tenders ?? [{ method: s.payment?.method }])
        .map((t) => t.method)
        .join(" + "),
  },
  { header: "Reference", value: (s) => s.payment?.reference ?? "" },
  { header: "Customer", value: (s) => s.customer?.name ?? "" },
  { header: "Customer ID", value: (s) => s.customer?.idNumber ?? "" },
  { header: "Original receipt", value: (s) => s.originalNumber ?? "" },
  { header: "Void reason", value: (s) => s.voidReason ?? "" },
];

/** One row per line, for anyone reconciling what actually moved. */
export const LINE_COLUMNS = [
  { header: "Receipt", value: (r) => r.sale.number },
  { header: "Date", value: (r) => new Date(r.sale.at).toLocaleDateString("en-PH") },
  { header: "Status", value: (r) => r.sale.status },
  { header: "Product", value: (r) => r.line.name },
  {
    header: "Options",
    value: (r) => r.line.modifiers?.map((m) => m.optionName).join(" / ") ?? "",
  },
  { header: "Qty", value: (r) => r.line.qty },
  { header: "Unit price", value: (r) => money(r.line.unitPrice) },
  { header: "Unit cost", value: (r) => money(r.line.unitCost) },
  { header: "Line total", value: (r) => money(r.line.unitPrice * r.line.qty) },
];

export function saleLines(sales) {
  return sales.flatMap((sale) => sale.items.map((line) => ({ sale, line })));
}
