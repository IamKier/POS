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
    /* Captured at the moment of sale. Reading it back off the product
       later would re-value old sales every time a supplier changed
       their price, quietly rewriting last month's profit. */
    unitCost: Number(product.cost) || 0,
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
export function computeTotals(items, discount, settings, customer = null) {
  const subtotal = round2(items.reduce((sum, l) => sum + lineTotal(l), 0));
  const discountValue = discountAmount(subtotal, discount);
  const net = round2(subtotal - discountValue);
  const rate = Number(settings?.taxRate) || 0;
  const itemCount = items.reduce((n, l) => n + l.qty, 0);

  /**
   * The senior citizen and PWD discount is not an ordinary 20 percent
   * off, and getting it wrong is a compliance problem rather than a
   * rounding one. Two things happen together: the sale becomes VAT
   * exempt, and the 20 percent comes off the VAT-exempt amount.
   *
   * On a 112 peso VAT-inclusive sale: strip the VAT to get 100, take 20
   * off that, and the customer pays 80. Taking 20 percent off 112 and
   * charging 89.60 overcharges them, and leaving the VAT in
   * misdeclares it.
   *
   * It does not stack with a promotional discount, which is why the
   * ordinary discount is ignored here rather than applied first.
   */
  if (customer?.type) {
    const exempt = settings?.taxInclusive
      ? round2(subtotal / (1 + rate))
      : subtotal;
    const statutory = round2(exempt * (Number(settings?.statutoryRate) || 0.2));
    return {
      subtotal,
      discount: statutory,
      statutoryDiscount: statutory,
      vatExempt: true,
      taxable: 0,
      taxExempt: exempt,
      tax: 0,
      total: round2(exempt - statutory),
      itemCount,
      customer,
    };
  }

  if (settings?.taxInclusive) {
    const tax = round2(net - net / (1 + rate));
    return {
      subtotal,
      discount: discountValue,
      statutoryDiscount: 0,
      vatExempt: false,
      taxable: round2(net - tax),
      taxExempt: 0,
      tax,
      total: net,
      itemCount,
    };
  }

  const tax = round2(net * rate);
  return {
    subtotal,
    discount: discountValue,
    statutoryDiscount: 0,
    vatExempt: false,
    taxable: net,
    taxExempt: 0,
    tax,
    total: round2(net + tax),
    itemCount,
  };
}
