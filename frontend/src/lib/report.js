import { round2 } from "./format.js";

/**
 * One pass over a set of sales produces every number the Sales screen
 * and the printed day summary need.
 */
export function summarize(sales, productById, categoryById) {
  const completed = sales.filter((s) => s.status === "completed");
  const voided = sales.filter((s) => s.status === "voided");

  const byMethod = {};
  const byCategory = {};
  const byItem = {};

  let gross = 0;
  let discounts = 0;
  let tax = 0;
  let total = 0;
  let items = 0;

  for (const sale of completed) {
    gross += sale.subtotal;
    discounts += sale.discount;
    tax += sale.tax;
    total += sale.total;
    items += sale.itemCount;

    const method = sale.payment.method;
    byMethod[method] = round2((byMethod[method] ?? 0) + sale.total);

    for (const line of sale.items) {
      const lineValue = line.unitPrice * line.qty;
      const categoryId = productById[line.productId]?.categoryId;
      const categoryName = categoryById[categoryId]?.name ?? "Uncategorized";
      byCategory[categoryName] = round2(
        (byCategory[categoryName] ?? 0) + lineValue,
      );

      const entry = byItem[line.productId] ?? { name: line.name, qty: 0, value: 0 };
      entry.qty += line.qty;
      entry.value = round2(entry.value + lineValue);
      byItem[line.productId] = entry;
    }
  }

  return {
    transactions: completed.length,
    voided: voided.length,
    voidedValue: round2(voided.reduce((sum, s) => sum + s.total, 0)),
    gross: round2(gross),
    discounts: round2(discounts),
    tax: round2(tax),
    total: round2(total),
    items,
    average: completed.length ? round2(total / completed.length) : 0,
    byMethod,
    byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
    topItems: Object.values(byItem)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8),
  };
}
