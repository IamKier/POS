import { reducer, initialState } from "../src/store/reducer.js";
import { computeTotals } from "../src/lib/cart.js";
import { summarize } from "../src/lib/report.js";

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
check("sale number", s.sales[0].number, "S-00001");
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

console.log(fail.length ? `\n${fail.length} FAILED` : "\nall checks passed");
process.exit(fail.length ? 1 : 0);
