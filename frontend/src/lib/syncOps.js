import { round2 } from "./format.js";

/**
 * Turns a changed product into the write it should become. Kept free of
 * any Firestore import so the rule below can be tested without a
 * network, a project, or a browser.
 *
 * Stock is the one field two registers write at the same time, and the
 * one field that must never be written as an absolute number. Both
 * tills hold 4 on hand, each sells one, each computes 3 and writes it,
 * and the shop has sold two units while the count fell by one. Sending
 * the delta instead of the answer lets the server apply both and land
 * on 2. Everything else about a product has a single writer in practice
 * (someone editing the catalog), so those stay a plain write.
 */
export function productOperation(before, after) {
  const stockChanged =
    Boolean(before) && after.trackStock && before.stock !== after.stock;

  if (!stockChanged) {
    return { type: "set", path: "products", id: after.id, data: after };
  }

  /**
   * A sale touches nothing but the count, so it writes nothing but the
   * count. Two things fall out of that. Security rules can let a
   * cashier deduct stock without letting them touch a price, and a
   * register holding a stale copy of the product cannot quietly revert
   * an edit a manager made a second ago.
   */
  const onlyStock = Object.keys({ ...before, ...after }).every(
    (key) => key === "stock" || same(before[key], after[key]),
  );

  return {
    type: "set",
    path: "products",
    id: after.id,
    merge: true,
    data: onlyStock ? {} : after,
    stockDelta: round2(after.stock - before.stock),
  };
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
