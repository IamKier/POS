import { round2, uid } from "./format.js";

/**
 * Two lines merge only when they are the same product with the same
 * modifier choices, so a latte with an extra shot stays its own line.
 */
export function lineSignature(productId, modifiers = []) {
  const chosen = modifiers
    .map((m) => m.optionId)
    .sort()
    .join("|");
  return `${productId}::${chosen}`;
}

export function buildLine(product, modifiers = [], qty = 1) {
  const addOn = modifiers.reduce((sum, m) => sum + Number(m.price || 0), 0);
  return {
    id: uid("line"),
    signature: lineSignature(product.id, modifiers),
    productId: product.id,
    name: product.name,
    basePrice: Number(product.price) || 0,
    unitPrice: round2((Number(product.price) || 0) + addOn),
    qty,
    modifiers: modifiers.map((m) => ({
      groupId: m.groupId,
      groupName: m.groupName,
      optionId: m.optionId,
      optionName: m.optionName,
      price: Number(m.price) || 0,
    })),
  };
}

export function lineTotal(line) {
  return round2(line.unitPrice * line.qty);
}

export function discountAmount(subtotal, discount) {
  if (!discount || !discount.value) return 0;
  const value = Number(discount.value) || 0;
  const raw = discount.type === "percent" ? (subtotal * value) / 100 : value;
  return round2(Math.min(Math.max(raw, 0), subtotal));
}

/**
 * VAT-inclusive is the Philippine default: the shelf price already
 * contains the tax, so the tax is backed out of the total rather than
 * added on top. The exclusive branch is there for places that add it.
 */
export function computeTotals(items, discount, settings) {
  const subtotal = round2(items.reduce((sum, l) => sum + lineTotal(l), 0));
  const discountValue = discountAmount(subtotal, discount);
  const net = round2(subtotal - discountValue);
  const rate = Number(settings?.taxRate) || 0;

  if (settings?.taxInclusive) {
    const tax = round2(net - net / (1 + rate));
    return {
      subtotal,
      discount: discountValue,
      taxable: round2(net - tax),
      tax,
      total: net,
      itemCount: items.reduce((n, l) => n + l.qty, 0),
    };
  }

  const tax = round2(net * rate);
  return {
    subtotal,
    discount: discountValue,
    taxable: net,
    tax,
    total: round2(net + tax),
    itemCount: items.reduce((n, l) => n + l.qty, 0),
  };
}
