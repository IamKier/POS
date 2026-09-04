import { round2 } from "./format.js";

/**
 * Tender types. Cash is settled at the drawer; the rest settle
 * elsewhere and the till records a reference so a disputed payment has
 * something to check against.
 *
 * qr marks the ones where the customer scans the store's own code. That
 * is a display concern, not a processing one: nothing here talks to
 * GCash or a bank. The cashier confirms the customer's screen, which is
 * how a shop without a payment gateway has always taken e-wallets.
 */
export const TENDERS = [
  { id: "cash", label: "Cash", drawer: true },
  { id: "card", label: "Card", reference: "Approval code" },
  { id: "gcash", label: "GCash", qr: true, reference: "Reference number" },
  { id: "maya", label: "Maya", qr: true, reference: "Reference number" },
  { id: "qrph", label: "QR Ph", qr: true, reference: "Reference number" },
  { id: "bank", label: "Bank transfer", reference: "Reference number" },
];

export const tenderById = Object.fromEntries(TENDERS.map((t) => [t.id, t]));

export function tenderLabel(id) {
  return tenderById[id]?.label ?? id;
}

/**
 * A payment is a list of tenders, because a customer paying 500 in cash
 * and the rest on GCash is ordinary, and a single method field cannot
 * describe it. One tender is just a list of length one.
 */
export function paymentSummary(tenders, total) {
  const paid = round2(tenders.reduce((sum, t) => sum + (Number(t.amount) || 0), 0));
  const remaining = round2(total - paid);

  /* Only cash can overpay, and the excess is change from the drawer.
     Nobody hands back change for an overpaid card tap. */
  const cash = round2(
    tenders
      .filter((t) => t.method === "cash")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
  );
  const change = remaining < 0 ? round2(Math.min(-remaining, cash)) : 0;

  return {
    paid,
    remaining: remaining > 0 ? remaining : 0,
    change,
    settled: remaining <= 0,
    /* The label a report groups by: the method when there is one,
       "split" when the customer used several. */
    method: tenders.length === 1 ? tenders[0].method : "split",
  };
}

/** Exact amount first, then the notes a cashier is most likely handed. */
export function quickAmounts(due) {
  const steps = [20, 50, 100, 200, 500, 1000];
  const out = [round2(due)];
  for (const step of steps) {
    const up = Math.ceil(due / step) * step;
    if (up > due && !out.includes(up)) out.push(up);
  }
  return out.slice(0, 5);
}
