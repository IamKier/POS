# Kapé Kalye POS

Point of sale for a single-branch shop: retail checkout and table service in one app, built
to keep selling when the internet does not.

**Private and proprietary.** This repository is not open source and carries no licence
granting use, copying, modification or distribution. It lives on GitHub for deployment and
convenience, not for reuse. If this is not yours, you do not have permission to run it.

Live: https://pos-woad-six.vercel.app

---

## Running it

```
cd frontend
npm install
npm run build      # production bundle in frontend/dist
npm run lint
npm run check      # 83 assertions over the money, stock and reporting logic
npm run icons      # regenerate the PWA icons
```

`npm run dev` exists but is not the workflow here: changes are committed, pushed, and
reviewed on the Vercel deploy.

`npm run check` runs [frontend/scripts/check-math.mjs](frontend/scripts/check-math.mjs)
against the reducer and the pure helpers, with no browser and no network. It has caught
real defects during development, including double-counted change in the drawer report and a
whole block of assertions accidentally written after `process.exit`. If you touch money,
stock, shifts or returns, add to it.

### Deployment

Vercel, Root Directory `frontend`, framework auto-detected as Vite. A push to `main`
deploys. The six `VITE_FIREBASE_*` variables must be set in the Vercel project, or the
deployed app silently runs local-only.

---

## The two panels

The register and the back office are separate shells, not two tabs of one screen.

**The register** ([shells/RegisterShell.jsx](frontend/src/shells/RegisterShell.jsx)) is a
single screen with no navigation on it: a thin bar naming the store, terminal, open shift
and cashier, and below it the product grid and the order. A cashier with a queue should not
be one mis-tap from the price list. It sits on white.

**The back office** ([shells/AdminShell.jsx](frontend/src/shells/AdminShell.jsx)) holds the
dashboard, catalog, inventory, sales, shifts, staff and settings, with a sidebar and a
button back to the register. It sits on the tinted canvas so the two are never confused.

A manager sees an Admin button. A cashier does not, and the Firestore rules reject their
writes even if they reached it.

### Interface rules

Everything on the register is sized for a finger: 48px step controls, product cards with
nothing revealed by hover, a 64px charge button. The quantity in the cart is a button that
opens a keypad, because twelve of something should not be twelve taps. A scan lights up the
card it landed on, since a scan gives no feedback of its own and a cashier who cannot tell
it worked scans again.

One theme, white, no switch. A shop floor is bright, a dark screen washes out under it, and
a register that changes appearance depending on the device or the hour is a support call
waiting to happen. Neutrals are warm, paper and stone rather than slate. A single navy
accent marks things that take an action; red and amber are reserved for state that costs
money to ignore.

---

## What it does

### Selling

Category chips, search that doubles as a barcode field, product cards with photographs,
option groups (sizes, milks, add-ons) that price themselves, order-level discounts, order
notes. In tables mode several orders stay open at once under table names.

### Scanning

Two paths, because a counter and a phone are different problems.

**Professional scanners.** A USB or Bluetooth barcode scanner is an HID keyboard: it types
the code and presses Enter. [hardwareScanner.js](frontend/src/lib/hardwareScanner.js)
listens globally rather than relying on the search box having focus, and tells a scan from
a person typing by speed, since a scanner emits characters roughly twenty times faster than
a fast typist. It stands down while a modal is open, so a scan cannot drop an item into a
cart mid-payment.

**Phone camera.** Chrome on Android has a native `BarcodeDetector`; Safari and Firefox
lazy-load ZXing on first use, as a plain JavaScript chunk the service worker precaches. A
WebAssembly decoder would be smaller but fetches its `.wasm` at runtime, which is the wrong
trade for a till that has to scan offline. Used for adding to the cart, capturing barcodes
in the product editor, and reading the QR off a customer's payment confirmation.

### Payments

Cash, card, GCash, Maya, QR Ph and bank transfer, and split payment across any combination.
Only cash can overpay, because only cash gives change. For the QR methods the store's own
code (uploaded in Settings) is shown full size for the customer to scan.

**There is no payment gateway.** Nothing confirms a payment automatically. That needs a
merchant account, a registered business and a server to receive the webhook. The cashier
confirms the customer's screen and records the reference, which is how a shop without a
gateway has always taken e-wallets.

The drawer report sees the parts, not the lump: a 200 cash plus 140 GCash sale files 200
under cash and 140 under GCash, net of change, because counting 340 of anything makes the
drawer impossible to reconcile.

### Returns

A return is its own transaction pointing back at the original sale, never an edit of it. A
void says the sale never happened, which rewrites yesterday's takings and unbalances a
shift that already closed. Returns are stored with negative quantities and negative money,
which is what makes every existing rollup correct without knowing returns exist.

Refunds are proportional to what came back, so a discounted or VAT-exempt sale refunds what
the customer actually paid rather than the shelf price. Partial returns are tracked, so two
of them cannot together refund more than was sold. Stock goes back on the shelf. A manager
approves, because money is leaving.

### Senior citizen and PWD discount

The statutory Philippine discount is not 20 percent off the shelf price:

```
Gross (VAT inclusive)          112.00
Less VAT, 112 / 1.12        =  100.00   the sale becomes VAT exempt
Less 20% of 100             =   20.00
Amount due                  =   80.00
```

Charging 89.60 overcharges the customer; leaving the VAT in misdeclares it. The till
captures the name and OSCA or PWD number, prints them with a signature line, and reports
the discount and VAT-exempt sales separately.

### Shifts and the drawer

A shift belongs to one person at one register, and the till will not sell until a float is
counted in. Expected cash is the float plus cash taken less change given: card and e-wallet
money never touched the drawer.

**Closing is a blind count.** The cashier enters what is in the drawer before the till says
what should be there, because showing the expected figure first turns a count into a copying
exercise. The variance then reads Short, Over or Balanced and asks what happened.

### Inventory

Stock on hand, low and out flags, stock value at cost and retail, manual adjustments with a
reason, and a movement log. Sales deduct; voids and returns put back.

Drinks are deliberately not stock-tracked: nobody counts lattes. See Known gaps for what
that leaves missing.

### Analytics

Sales by day, takings by hour, top products, category split, payment mix, and gross profit
against the cost captured on each sale line. Charts are inline SVG rather than a library,
one hue for magnitude, category colours validated for colour-blind separation, every bar
direct-labelled so identity never rests on colour.

### Export

Sales export to CSV from the Sales screen, one row per receipt or one row per line, with a
BOM so Excel on a Windows machine renders peso signs and Filipino names correctly.

---

## Access and security

Staff sign in at the till with a **staff code and a PIN** on a number pad. Firebase has no
PIN provider, so underneath each person is an email-and-password account whose address
nobody ever sees: the code becomes a reserved-domain address (`.invalid`, reserved by RFC
2606 for exactly this) and the PIN becomes the password. Real Firebase sessions, so the
rules work unchanged.

A 4-digit PIN is four digits of entropy however it is wrapped. What protects it is
Firebase's rate limiting and the register sitting behind a counter. Manager PINs are six
digits because they approve voids and refunds.

| | Cashier | Manager |
|---|---|---|
| Sell, take payment, print | yes | yes |
| See the back office | no | yes |
| Edit catalog, prices, settings, roles | no | yes |
| Void, discount, refund | manager approval at the till | yes |

Approval runs on a second auth session so the cashier is never signed out, verifies the
role rather than just the PIN, and records who approved it.

**Deactivate anyone who leaves.** Their code and PIN stop working, enforced in the rules
rather than only hidden in the interface, and the device forgets their cached PIN so the
offline path closes too. Their sales stay: deleting them is the opposite of what an audit
trail is for.

### Applying the rules

[firestore.rules](firestore.rules) is written but must be published by hand, in this order:

1. Firebase console, Authentication, Sign-in method, enable **Email/Password**
2. Create the owner account in the app, while test mode still allows the write
3. Firestore Database, Rules, paste the file, Publish

Publishing first locks you out of creating the account the rules require.

The rules make sales, returns, stock movements and shifts append-only, and let a cashier
change exactly one field on a product, the stock count, because that is what a sale does.

---

## Offline

The app is an installable PWA. Two halves make offline work and both are needed: the
service worker precaches the app shell so the page loads with no connection, and Firestore's
`persistentLocalCache` holds the data and queues writes until the line returns. Without the
service worker, "works offline" would only mean "works offline as long as you never close
the tab".

Sign-in works offline too, for staff who have used that register before: the device keeps
their code, name, role and a per-device salted hash of their PIN in localStorage. The hash
never goes to Firestore, because a shared hash of a 4-digit PIN is a 4-digit secret anyone
signed in could crack in seconds.

---

## How it is built

```
frontend/src
  shells/          RegisterShell (the till), AdminShell (the back office)
  pages/           Sell, Dashboard, Products, Inventory, Sales, Shifts, Staff, Settings
  components/      grid, cart, modals, receipt, charts, shared UI
  store/           reducer (every state transition, pure), provider, context
  auth/            PIN sign-in over Firebase Auth, offline cache, roles
  data/            firebase init, cloud sync, local storage adapter, seed
  lib/             cart and tax math, returns, payments, shifts, reports,
                   analytics, scanners, CSV, images
  scripts/         check-math.mjs, seed-demo.mjs, make-icons.mjs
```

State lives in one reducer. Screens never touch storage: they read through `usePos()` and
write by dispatching. Persistence sits underneath, localStorage always and Firestore when
configured, which is what has kept the storage decision reversible.

Firestore sync is layered over the reducer rather than replacing it. A sale lands in local
state and renders immediately; the write goes out behind it. `pushToCloud` diffs two states
and writes only what changed; `startCloudSync` subscribes per collection and merges what
other devices wrote.

### Decisions worth knowing before changing things

**Receipt numbers are per terminal**, `T1-00001`, not from a shared counter. A shared
counter needs a server transaction per sale, so the register could not issue a receipt with
the internet down. The counter also checks itself against the highest number already
recorded for that terminal, so clearing site data on a tablet cannot silently reissue
numbers that already exist.

**Stock syncs as a delta, not a count.** Two tills holding 4, each selling one, each
computing 3 and writing it, would leave the shop having sold two units while the count fell
by one. `increment()` sends the change instead of the answer.

**A stock change writes only the stock field**, which is what lets the rules allow a cashier
to deduct stock without touching a price, and stops a register with a stale copy reverting
an edit a manager just made.

**Cost is captured on the sale line** at checkout, so a supplier price change today does not
re-value last month's profit.

**Open carts and tabs are never synced.** A cart belongs to the terminal holding it, and two
registers should not fight over one basket.

---

## Demo data

`node scripts/seed-demo.mjs` fills the project with a coffee shop: 26 items, twelve
employees who can sign in, and a fortnight of trading. `--wipe` clears first, `--dry` prints
what it would write, `--no-staff` skips the accounts. The generator is seeded, so a re-run
produces the same shop.

The history is deliberately untidy: a morning rush and an afternoon lull, cashiers tied to
the shifts they worked, drawers a few pesos short, senior discounts, split payments and the
occasional void. Those are the cases the reports have to survive.

**The demo PINs are in that script, in this repository.** Fine for demo accounts, and they
must not survive contact with real staff. Rotate or deactivate the twelve before the shop
opens.

---

## Known gaps

Deliberately not built, listed so nobody assumes otherwise:

- **Recipes and ingredient stock.** Pastries are counted; the drinks that make up most of
  the revenue are not, because a latte consumes beans, milk and a cup rather than a unit of
  itself. This is the largest missing piece for a coffee shop.
- **Multi-branch.** One catalog, one sales pool, one settings document. Terminals are
  separated; branches are not. A second location today would share the first one's stock.
- **BIR accreditation.** Receipts say they are not official receipts, and mean it. A
  Computerized Accounting System needs accreditation, an e-journal and a tamper-evident
  audit trail before it can issue one.
- **Hardware beyond browser printing.** No ESC/POS thermal driver, no cash drawer kick, no
  scale.
- **Automatic payment confirmation**, as above: needs a merchant account and a server.
- **Test coverage beyond the math.** `npm run check` covers money, stock, shifts and
  returns. There are no component or end-to-end tests.
- **Bundle size.** 297 KB gzipped, roughly 125 KB of it the ZXing scanner fallback,
  precached whether or not the till ever scans with a camera.
