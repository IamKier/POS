# Tindahan POS

A general purpose point of sale front end: retail checkout and table or tab service in the
same app. React 19, Vite, Tailwind 4, no backend yet.

## Running it

```
cd frontend
npm install
npm run build     # production bundle in frontend/dist
npm run lint
npm run check     # asserts the totals, stock and reporting math
```

`npm run check` runs [frontend/scripts/check-math.mjs](frontend/scripts/check-math.mjs)
against the reducer and the math helpers with no browser involved: line merging, VAT in and
out of the price, discount clamping, stock deducted on a sale and returned on a void, and the
report rollups.

## What is in v1

**Sell.** Category chips, search that doubles as a barcode field (a scanner types the code
and presses Enter, which drops the item straight into the cart), product grid, cart with
quantity controls, order level discount by percent or amount, order note. Products with
option groups open a chooser first, so a large latte with an extra shot prices itself.
In tables mode several carts stay open at once under table or tab names.

**Payment.** Cash, card or e-wallet. Cash gets quick tender buttons (exact, then the next
note up) and live change due. Card and e-wallet take a reference number.

**Receipts.** An 80mm thermal layout that prints from the browser. The print stylesheet
hides everything except the receipt, so Ctrl+P produces the roll and nothing else.

**Products.** Full CRUD with categories, price, cost, margin, SKU, barcode, an availability
switch, and an editor for option groups (required groups behave like a size picker, optional
groups like add-ons).

**Inventory.** Stock on hand per product, low stock and out of stock flags against a
configurable threshold, stock value at cost and at retail, manual adjustments (receive,
remove, set a counted quantity) with a reason and note, and a movement log. Sales deduct
stock automatically and voids put it back.

**Sales.** Today, last 7 days or all time. Net sales, transaction count, items sold, average
sale, a payment method split and top items. Any receipt reopens for reprint or void. The
Summary button prints a cash-up sheet: gross, discounts, tax, net, payments by method, sales
by category, top items, and voided totals.

**Settings.** Store details and receipt footer, currency, tax label and rate, tax inclusive
or exclusive pricing, service mode, tab names, low stock threshold, and a reset back to the
demo catalog.

## Where the data lives

There is no server. State sits in one reducer ([frontend/src/store/reducer.js](frontend/src/store/reducer.js))
and is mirrored to localStorage by [frontend/src/store/PosProvider.jsx](frontend/src/store/PosProvider.jsx),
so a refresh does not lose an open cart or the day's sales. Clearing site data clears the
till, and nothing syncs between devices.

Swapping in Supabase or IndexedDB later means rewriting the provider, not the screens: every
page reads through `usePos()` and writes by dispatching an action, and no component touches
storage directly.

## Layout

```
frontend/src
  data/seed.js          starter catalog and default settings
  store/reducer.js      every state transition, pure
  store/PosProvider.jsx state, persistence, derived values
  store/context.js      the usePos hook
  lib/cart.js           line building and the totals math
  lib/report.js         sales rollups
  lib/format.js         money, dates, ids
  components/           grid, cart, modals, receipt, shared UI
  pages/                Sell, Products, Inventory, Sales, Settings
```

## Tax math

`taxInclusive` on (the Philippine default) means the shelf price already contains the tax, so
the receipt backs it out: `tax = net - net / (1 + rate)`. Off means the tax is added on top of
the discounted subtotal. Both paths live in `computeTotals` in
[frontend/src/lib/cart.js](frontend/src/lib/cart.js).

Receipts are marked "not an official receipt". BIR accreditation, serial numbers and a
tamper evident audit trail are not part of this build.

## Not built yet

Users and shift login, cash drawer float and cash counts, returns against a receipt (voids
only for now), suppliers and purchase orders, customer accounts, multi-store, and hardware
integration beyond browser printing.
