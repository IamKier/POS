import { round2 } from "./format.js";

/**
 * One pass over a set of sales produces every number the Sales screen
 * and the printed day summary need.
 */
export function summarize(sales, productById, categoryById) {
  const completed = sales.filter((s) => s.status === "completed");
  const voided = sales.filter((s) => s.status === "voided");
  const returns = completed.filter((s) => s.type === "return");

  const byMethod = {};
  const byCategory = {};
  const byItem = {};

  let gross = 0;
  let discounts = 0;
  let statutory = 0;
  let statutoryCount = 0;
  let vatExemptSales = 0;
  let tax = 0;
  let total = 0;
  let items = 0;

  for (const sale of completed) {
    gross += sale.subtotal;
    discounts += sale.discount;
    tax += sale.tax;
    total += sale.total;
    items += sale.itemCount;

    /* Senior and PWD sales are reported apart from ordinary ones,
       because the exemption has to be declared separately. */
    if (sale.customer) {
      statutory += sale.statutoryDiscount ?? sale.discount;
      statutoryCount += 1;
      vatExemptSales += sale.total;
    }

    /**
     * A split payment has to land in the drawer report as its parts,
     * not as one lump under "split". Counting 200 cash and 140 GCash as
     * 340 of anything makes the cash count at close impossible to
     * reconcile.
     */
    const tenders = sale.payment.tenders ?? [
      /* A sale from before split payments records what was handed over
         in `tendered`, so the change subtraction below stays correct
         for it too. */
      {
        method: sale.payment.method,
        amount: sale.payment.tendered ?? sale.total,
      },
    ];
    for (const tender of tenders) {
      const key = tender.method;
      byMethod[key] = round2((byMethod[key] ?? 0) + (Number(tender.amount) || 0));
    }
    /* Change comes back out of the drawer, so cash taken is net of it. */
    if (sale.payment.change > 0 && byMethod.cash !== undefined) {
      byMethod.cash = round2(byMethod.cash - sale.payment.change);
    }

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
    /* A refund is not a sale, so it does not inflate the count. */
    transactions: completed.length - returns.length,
    returns: returns.length,
    refunded: round2(returns.reduce((sum, s) => sum + Math.abs(s.total), 0)),
    voided: voided.length,
    voidedValue: round2(voided.reduce((sum, s) => sum + s.total, 0)),
    gross: round2(gross),
    discounts: round2(discounts),
    statutoryDiscount: round2(statutory),
    statutorySales: statutoryCount,
    vatExemptSales: round2(vatExemptSales),
    tax: round2(tax),
    total: round2(total),
    items,
    average:
      completed.length - returns.length > 0
        ? round2(total / (completed.length - returns.length))
        : 0,
    byMethod,
    byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
    topItems: Object.values(byItem)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8),
  };
}
