import { reducer, initialState } from "../src/store/reducer.js";
import { computeTotals } from "../src/lib/cart.js";
import { summarize } from "../src/lib/report.js";
import { productOperation } from "../src/lib/syncOps.js";
import { paymentSummary } from "../src/lib/payments.js";
import { shiftReport, varianceLabel } from "../src/lib/shift.js";
import { buildReturn, returnableLines } from "../src/lib/returns.js";

const fail = [];
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail.push(`${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  console.log(`${ok ? "ok  " : "FAIL"} ${label} = ${JSON.stringify(got)}`);
};

let s = initialState();
const tabId = "tab_walkin";
const cola = s.products.find((p) => p.id === "prd_cola"); // 45.00, stock 4
const latte = s.products.find((p) => p.id === "prd_latte"); // 145.00, not tracked

// 2 colas + 1 large latte with an extra shot (145 + 25 + 30 = 200)
s = reducer(s, { type: "cart/add", tabId, product: cola, qty: 2 });
s = reducer(s, {
  type: "cart/add",
  tabId,
  product: latte,
  qty: 1,
  modifiers: [
    { groupId: "grp_size", groupName: "Size", optionId: "opt_size_l", optionName: "Large", price: 25 },
    { groupId: "grp_addon", groupName: "Add-ons", optionId: "opt_shot", optionName: "Extra shot", price: 30 },
  ],
});
s = reducer(s, { type: "cart/add", tabId, product: cola, qty: 1 });

const cart = s.carts[tabId];
check("lines stay separate by modifier", cart.items.length, 2);
check("same product and modifiers merge", cart.items[0].qty, 3);
check("modifier price rolls into unit price", cart.items[1].unitPrice, 200);

// 3 x 45 + 200 = 335, less 10 percent = 301.50, VAT inclusive at 12 percent
s = reducer(s, { type: "cart/setDiscount", tabId, discount: { type: "percent", value: 10 } });
const totals = computeTotals(s.carts[tabId].items, s.carts[tabId].discount, s.settings);
check("subtotal", totals.subtotal, 335);
check("discount", totals.discount, 33.5);
check("total", totals.total, 301.5);
check("VAT backed out of an inclusive total", totals.tax, 32.3);
check("taxable base", totals.taxable, 269.2);
check("VAT plus base equals total", totals.taxable + totals.tax, totals.total);
check("item count", totals.itemCount, 4);

const at = new Date().toISOString();
s = reducer(s, {
  type: "sale/checkout",
  tabId,
  totals,
  at,
  payment: { method: "cash", tendered: 500, change: 198.5, reference: "" },
});
check("sale recorded", s.sales.length, 1);
check("sale number carries the terminal code", s.sales[0].number, `${s.terminal.code}-00001`);
check("cart cleared after checkout", s.carts[tabId].items.length, 0);
check("discount rule cleared", s.carts[tabId].discount, { type: "percent", value: 0 });
check("tracked stock deducted", s.products.find((p) => p.id === "prd_cola").stock, 1);
check("untracked product untouched", s.products.find((p) => p.id === "prd_latte").stock, 0);
check("one stock movement, for the tracked item only", s.stockMoves.length, 1);

const sum = summarize(
  s.sales,
  Object.fromEntries(s.products.map((p) => [p.id, p])),
  Object.fromEntries(s.categories.map((c) => [c.id, c])),
);
check("summary net sales", sum.total, 301.5);
check("summary transactions", sum.transactions, 1);
check("summary items", sum.items, 4);
check("summary by payment method", sum.byMethod, { cash: 301.5 });
check("summary by category", sum.byCategory, [["Drinks", 335]]);

s = reducer(s, { type: "sale/void", saleId: s.sales[0].id, reason: "wrong order", at });
check("sale marked voided", s.sales[0].status, "voided");
check("stock returned on void", s.products.find((p) => p.id === "prd_cola").stock, 4);
const sum2 = summarize(s.sales, {}, {});
check("voided sale leaves the totals", sum2.total, 0);
check("voided sale is counted separately", [sum2.voided, sum2.voidedValue], [1, 301.5]);

// Exclusive tax, for stores that add it at the till
const exclusive = computeTotals(
  [{ unitPrice: 100, qty: 1 }],
  { type: "amount", value: 0 },
  { taxRate: 0.12, taxInclusive: false },
);
check("exclusive tax adds on top", [exclusive.tax, exclusive.total], [12, 112]);

// A discount can never exceed the subtotal
const overshoot = computeTotals(
  [{ unitPrice: 50, qty: 1 }],
  { type: "amount", value: 999 },
  { taxRate: 0.12, taxInclusive: true },
);
check("discount clamps at the subtotal", [overshoot.discount, overshoot.total], [50, 0]);

// --- multi-device correctness -------------------------------------------

// Two registers, each with its own code, must never collide on a number.
let t1 = initialState();
let t2 = initialState();
t2 = reducer(t2, { type: 'terminal/setCode', code: 'T2' });
t1 = reducer(t1, { type: 'terminal/setCode', code: 'T1' });
const ring = (st) => {
  const cola = st.products.find((p) => p.id === 'prd_cola');
  st = reducer(st, { type: 'cart/add', tabId: 'tab_walkin', product: cola, qty: 1 });
  const tot = computeTotals(st.carts.tab_walkin.items, st.carts.tab_walkin.discount, st.settings);
  return reducer(st, {
    type: 'sale/checkout',
    tabId: 'tab_walkin',
    totals: tot,
    at: new Date().toISOString(),
    payment: { method: 'cash', tendered: 50, change: 5, reference: '' },
  });
};
t1 = ring(t1);
t2 = ring(t2);
check('register one numbers its own receipts', t1.sales[0].number, 'T1-00001');
check('register two does not reuse that number', t2.sales[0].number, 'T2-00001');
check('two registers, two distinct numbers', t1.sales[0].number !== t2.sales[0].number, true);

// A sale must send a stock delta, not an absolute count, or two tills
// selling the last units overwrite each other.
const beforeProduct = { id: 'prd_cola', name: 'Cola', trackStock: true, stock: 4 };
const afterProduct = { ...beforeProduct, stock: 3 };
const op = productOperation(beforeProduct, afterProduct);
check('stock change writes a merge, not a replace', op.merge, true);
check('a sale writes the count and nothing else', Object.keys(op.data).length, 0);
check('stock is sent as a delta, not an absolute count', op.stockDelta, -1);
const renameOp = productOperation(beforeProduct, { ...beforeProduct, name: 'Cola 330ml' });
check('a plain edit is still a whole write', renameOp.merge, undefined);

const editAndSell = productOperation(beforeProduct, { ...beforeProduct, name: 'Cola 330ml', stock: 3 });
check('an edit that also moves stock still sends the whole product', editAndSell.data.name, 'Cola 330ml');
check('and still sends stock as a delta', editAndSell.stockDelta, -1);

// --- senior citizen and PWD discount ------------------------------------
// The statutory discount is not 20 percent off the shelf price. The sale
// becomes VAT exempt first, then 20 percent comes off the exempt amount.
// A 112 peso VAT-inclusive sale must end at 80, not 89.60.
const phSettings = { taxRate: 0.12, taxInclusive: true, statutoryRate: 0.2 };
const senior = computeTotals(
  [{ unitPrice: 112, qty: 1 }],
  { type: 'percent', value: 0 },
  phSettings,
  { type: 'senior', name: 'Lola Ising', idNumber: 'OSCA-1234' },
);
check('VAT is stripped before the discount', senior.taxExempt, 100);
check('the discount is 20 percent of the exempt amount', senior.statutoryDiscount, 20);
check('the customer pays 80, not 89.60', senior.total, 80);
check('the sale is VAT exempt', [senior.vatExempt, senior.tax], [true, 0]);

// A promotional discount must not stack on top of the statutory one.
const stacked = computeTotals(
  [{ unitPrice: 112, qty: 1 }],
  { type: 'percent', value: 50 },
  phSettings,
  { type: 'pwd', name: 'Juan', idNumber: 'PWD-9' },
);
check('a promo discount does not stack with the statutory one', stacked.total, 80);

// Tax-exclusive shops take the 20 percent off the plain subtotal.
const exclusiveSenior = computeTotals(
  [{ unitPrice: 100, qty: 1 }],
  null,
  { taxRate: 0.12, taxInclusive: false, statutoryRate: 0.2 },
  { type: 'senior', name: 'Lola', idNumber: 'X' },
);
check('exclusive pricing: 20 percent off, no tax added', [exclusiveSenior.total, exclusiveSenior.tax], [80, 0]);

// An ordinary sale keeps its VAT and reports no statutory discount.
const ordinary = computeTotals([{ unitPrice: 112, qty: 1 }], null, phSettings, null);
check('an ordinary sale still carries VAT', [ordinary.tax, ordinary.vatExempt], [12, false]);
check('and no statutory discount', ordinary.statutoryDiscount, 0);

// --- split payments and the drawer --------------------------------------
// A customer pays 200 cash and 140 GCash on a 340 sale.
const split = paymentSummary(
  [
    { method: "cash", amount: 200 },
    { method: "gcash", amount: 140, reference: "4821" },
  ],
  340,
);
check("a split payment settles", split.settled, true);
check("nothing is left owing", split.remaining, 0);
check("no change on an exact split", split.change, 0);
check("two tenders report as split", split.method, "split");

// Overpaying in cash gives change; overpaying on a card does not.
const overCash = paymentSummary([{ method: "cash", amount: 500 }], 340);
check("cash overpayment becomes change", overCash.change, 160);
const overCard = paymentSummary([{ method: "card", amount: 500 }], 340);
check("a card overpayment is never change", overCard.change, 0);

// Part paid is not settled.
const partial = paymentSummary([{ method: "cash", amount: 100 }], 340);
check("a part payment does not settle", [partial.settled, partial.remaining], [false, 240]);

// The drawer report must see the parts, not the lump, or the cash count
// at close cannot be reconciled.
const splitSale = {
  id: "s1",
  number: "T1-00001",
  at: new Date().toISOString(),
  status: "completed",
  subtotal: 340,
  discount: 0,
  tax: 0,
  total: 340,
  itemCount: 2,
  items: [],
  payment: {
    method: "split",
    change: 0,
    tenders: [
      { method: "cash", amount: 200 },
      { method: "gcash", amount: 140 },
    ],
  },
};
const drawer = summarize([splitSale], {}, {});
check("the drawer sees the cash part", drawer.byMethod.cash, 200);
check("and the e-wallet part separately", drawer.byMethod.gcash, 140);
check("and nothing filed under split", drawer.byMethod.split, undefined);

// Change leaves the drawer, so cash taken is net of it.
const changeSale = {
  ...splitSale,
  id: "s2",
  payment: {
    method: "cash",
    change: 160,
    tenders: [{ method: "cash", amount: 500 }],
  },
};
const drawer2 = summarize([changeSale], {}, {});
check("cash in the drawer is net of change given", drawer2.byMethod.cash, 340);

// --- shifts and the drawer ----------------------------------------------
// Expected cash is the float plus cash taken, less change given. Card and
// e-wallet money never touched the drawer and must not be counted in it.
const shift = {
  id: "shift1",
  terminalCode: "T1",
  openingFloat: 1000,
  openedAt: new Date().toISOString(),
  status: "open",
};

const shiftSales = [
  {
    id: "a",
    shiftId: "shift1",
    status: "completed",
    at: new Date().toISOString(),
    subtotal: 340, discount: 0, tax: 0, total: 340, itemCount: 1, items: [],
    payment: { method: "cash", change: 160, tenders: [{ method: "cash", amount: 500 }] },
  },
  {
    id: "b",
    shiftId: "shift1",
    status: "completed",
    at: new Date().toISOString(),
    subtotal: 200, discount: 0, tax: 0, total: 200, itemCount: 1, items: [],
    payment: { method: "gcash", change: 0, tenders: [{ method: "gcash", amount: 200 }] },
  },
  {
    id: "c",
    shiftId: "other-shift",
    status: "completed",
    at: new Date().toISOString(),
    subtotal: 999, discount: 0, tax: 0, total: 999, itemCount: 1, items: [],
    payment: { method: "cash", change: 0, tenders: [{ method: "cash", amount: 999 }] },
  },
];

const report = shiftReport(shift, shiftSales, {}, {});
check("only this shift's sales count", report.saleCount, 2);
check("cash taken is net of change given", report.cashTaken, 340);
check("expected drawer is float plus cash", report.expectedCash, 1340);
check("e-wallet money is not in the drawer", report.nonCash, 200);
check("net sales still include both", report.total, 540);

// A short drawer is short, and an over drawer is over.
check("a shortfall is negative", varianceLabel(1300 - report.expectedCash), "Short");
check("an overage is positive", varianceLabel(1400 - report.expectedCash), "Over");
check("an exact count balances", varianceLabel(0), "Balanced");



// --- returns -------------------------------------------------------------
// A return is its own transaction. The original sale must be untouched,
// the money must come back at what was actually paid, and stock must
// return to the shelf.
const soldAt = new Date().toISOString();
const original = {
  id: "sale_x",
  number: "T1-00007",
  type: "sale",
  at: soldAt,
  status: "completed",
  subtotal: 400,
  discount: 40,
  tax: 38.57,
  total: 360,
  itemCount: 4,
  taxable: 321.43,
  taxExempt: 0,
  items: [
    { id: "l1", productId: "prd_cola", name: "Cola", unitPrice: 100, unitCost: 30, qty: 2, modifiers: [] },
    { id: "l2", productId: "prd_latte", name: "Latte", unitPrice: 100, unitCost: 40, qty: 2, modifiers: [] },
  ],
  payment: { method: "cash", tenders: [{ method: "cash", amount: 500 }], change: 140 },
};

const refund = buildReturn({
  sale: original,
  selections: { l1: 1 },
  number: "T1-00008",
  at: new Date().toISOString(),
  cashier: { uid: "u1", name: "Andrea" },
  refundMethod: "cash",
  reason: "Damaged",
});

check("a return points at the sale it came from", refund.originalSaleId, "sale_x");
check("the returned quantity is negative", refund.items[0].qty, -1);
check("the line remembers which line it reverses", refund.items[0].originalLineId, "l1");
check("subtotal comes back negative", refund.subtotal, -100);
// One cookie is a quarter of the 400 subtotal, so a quarter of the 360 paid.
check("the refund is what was paid, not the shelf price", refund.total, -90);
check("tax comes back proportionally", refund.tax, -9.64);
check("the item count drops", refund.itemCount, -1);
check("the refund tender is negative", refund.payment.tenders[0].amount, -90);

// A second return cannot take back more than remains.
const remaining = returnableLines(original, [original, refund]);
check("one of that line is left", remaining.find((r) => r.line.id === "l1").remaining, 1);
check("the untouched line is fully returnable", remaining.find((r) => r.line.id === "l2").remaining, 2);
check("the returned tally is tracked", remaining.find((r) => r.line.id === "l1").returned, 1);

// Reports: the return nets the day down without deleting the sale.
const dayWithReturn = summarize([original, refund], {}, {});
check("takings net down by the refund", dayWithReturn.total, 270);
check("a refund is not counted as a sale", dayWithReturn.transactions, 1);
check("but it is counted as a return", [dayWithReturn.returns, dayWithReturn.refunded], [1, 90]);
check("the drawer loses the cash refunded", dayWithReturn.byMethod.cash, 270);

// Stock goes back on the shelf.
let rs = initialState();
rs = reducer(rs, { type: "sale/return", sale: refund, at: refund.at, counter: 9 });
check("the return is recorded", rs.sales[0].number, "T1-00008");
check("a stock movement puts it back", rs.stockMoves[0].delta, 1);
check("and says why", rs.stockMoves[0].reason, "return");

// Receipt numbers heal after a device is wiped.
let wiped = initialState();
wiped = reducer(wiped, { type: "terminal/setCode", code: "T1" });
wiped = { ...wiped, saleCounter: 1, sales: [{ number: "T1-00042", status: "completed", items: [], payment: {} }] };
const colaAgain = wiped.products.find((p) => p.id === "prd_cola") ?? wiped.products[0];
wiped = reducer(wiped, { type: "cart/add", tabId: "tab_walkin", product: colaAgain, qty: 1 });
const wipedTotals = computeTotals(wiped.carts.tab_walkin.items, null, wiped.settings);
wiped = reducer(wiped, {
  type: "sale/checkout",
  tabId: "tab_walkin",
  totals: wipedTotals,
  at: new Date().toISOString(),
  payment: { method: "cash", tenders: [{ method: "cash", amount: 100 }], change: 0 },
});
check("a reset counter does not reissue an existing number", wiped.sales[0].number, "T1-00043");

console.log(fail.length ? `\n${fail.length} FAILED` : "\nall checks passed");
process.exit(fail.length ? 1 : 0);
