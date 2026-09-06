import { round2, uid } from "./format.js";

/**
 * Returns, as their own transaction.
 *
 * The tempting shortcut is to void the original sale, and it is wrong:
 * a void says the sale never happened, so yesterday's takings change,
 * a shift that already balanced stops balancing, and the receipt the
 * customer is holding no longer describes anything. A return is a new
 * transaction that points back at the original.
 *
 * Returns are stored with negative quantities and negative money. That
 * is not a trick to save code, it is what makes every existing rollup
 * correct without knowing returns exist: takings net down, the item
 * count drops, the refunded tender comes out of the drawer, and the
 * category the item belonged to loses the revenue it was credited.
 */

/** How much of each line is still returnable, given earlier returns. */
export function returnableLines(sale, allSales) {
  const alreadyReturned = new Map();

  for (const other of allSales) {
    if (other.type !== "return" || other.originalSaleId !== sale.id) continue;
    for (const line of other.items) {
      /* Return quantities are negative, so this accumulates positively. */
      alreadyReturned.set(
        line.originalLineId ?? line.productId,
        (alreadyReturned.get(line.originalLineId ?? line.productId) ?? 0) -
          line.qty,
      );
    }
  }

  return sale.items.map((line) => {
    const returned = alreadyReturned.get(line.id) ?? 0;
    return {
      line,
      returned,
      remaining: Math.max(0, line.qty - returned),
    };
  });
}

export function canReturn(sale, allSales) {
  if (!sale || sale.status !== "completed" || sale.type === "return") return false;
  return returnableLines(sale, allSales).some((r) => r.remaining > 0);
}

/**
 * Builds the return transaction. selections maps a line id to the
 * quantity coming back.
 */
export function buildReturn({
  sale,
  selections,
  number,
  at,
  cashier,
  shiftId,
  refundMethod,
  reason,
  approvedBy,
}) {
  const items = sale.items
    .filter((line) => (selections[line.id] ?? 0) > 0)
    .map((line) => ({
      ...line,
      id: uid("line"),
      originalLineId: line.id,
      qty: -Math.abs(selections[line.id]),
    }));

  if (!items.length) return null;

  const subtotal = round2(
    items.reduce((sum, line) => sum + line.unitPrice * line.qty, 0),
  );

  /**
   * The refund is proportional to what came back, so a sale that had a
   * discount or a senior exemption refunds at the price the customer
   * actually paid rather than the shelf price. Refunding the shelf
   * price on a discounted sale hands back money that was never taken.
   */
  const share = sale.subtotal ? Math.abs(subtotal) / sale.subtotal : 0;
  const discount = round2(-(sale.discount ?? 0) * share);
  const tax = round2(-(sale.tax ?? 0) * share);
  const total = round2(-(sale.total ?? 0) * share);
  const itemCount = items.reduce((n, line) => n + line.qty, 0);

  return {
    id: uid("ret"),
    number,
    type: "return",
    originalSaleId: sale.id,
    originalNumber: sale.number,
    at,
    tabName: sale.tabName ?? "Walk-in",
    cashier: cashier ?? null,
    shiftId: shiftId ?? null,
    approvedBy: approvedBy ?? null,
    reason: reason ?? "",
    note: "",
    customer: sale.customer ?? null,
    items,
    discountRule: sale.discountRule ?? null,
    subtotal,
    discount,
    statutoryDiscount: sale.statutoryDiscount ? round2(-sale.statutoryDiscount * share) : 0,
    vatExempt: Boolean(sale.vatExempt),
    taxable: round2(-(sale.taxable ?? 0) * share),
    taxExempt: round2(-(sale.taxExempt ?? 0) * share),
    tax,
    total,
    itemCount,
    payment: {
      method: refundMethod,
      /* Negative, because this money leaves the drawer or the account. */
      tenders: [{ method: refundMethod, amount: total, reference: "" }],
      tendered: total,
      change: 0,
      reference: "",
    },
    status: "completed",
  };
}
