/**
 * Fills the project with a believable coffee shop: a menu, twelve
 * employees, and a fortnight of trading.
 *
 * Demo data that is too tidy teaches you nothing. The sales generated
 * here have a morning rush and an afternoon lull, cashiers who worked
 * particular shifts, drawers that came up a few pesos short, senior
 * discounts, and the occasional void, because those are the cases the
 * reports have to survive.
 *
 *   node scripts/seed-demo.mjs            add the demo data
 *   node scripts/seed-demo.mjs --wipe     clear catalog and history first
 *   node scripts/seed-demo.mjs --no-staff skip creating sign-in accounts
 *
 * Reads the Firebase config from frontend/.env.local.
 */
import { readFileSync } from "node:fs";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";

/* ------------------------------------------------------------------ */
/* config                                                              */

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    }),
);

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);
const auth = getAuth(app);

const WIPE = process.argv.includes("--wipe");
const SKIP_STAFF = process.argv.includes("--no-staff");
const DAYS = 14;

/* ------------------------------------------------------------------ */
/* the shop                                                            */

const SETTINGS = {
  storeName: "Kapé Kalye",
  address: "142 Sampaguita Ave, Brgy Kapitolyo, Pasig City",
  taxId: "TIN 009-421-337-000",
  currency: "PHP",
  taxLabel: "VAT",
  taxRate: 0.12,
  taxInclusive: true,
  lowStockThreshold: 6,
  serviceMode: "retail",
  requireShift: true,
  statutoryDiscount: true,
  statutoryRate: 0.2,
  receiptFooter: "Salamat po! Kitakits ulit.",
};

const CATEGORIES = [
  { id: "cat_espresso", name: "Espresso" },
  { id: "cat_brewed", name: "Brewed" },
  { id: "cat_noncoffee", name: "Non-coffee" },
  { id: "cat_pastry", name: "Pastries" },
  { id: "cat_meals", name: "Meals" },
  { id: "cat_beans", name: "Beans and merch" },
];

const sizeGroup = {
  id: "grp_size",
  name: "Size",
  required: true,
  options: [
    { id: "opt_size_r", name: "Regular", price: 0 },
    { id: "opt_size_l", name: "Large", price: 25 },
  ],
};

const tempGroup = {
  id: "grp_temp",
  name: "Hot or iced",
  required: true,
  options: [
    { id: "opt_hot", name: "Hot", price: 0 },
    { id: "opt_iced", name: "Iced", price: 10 },
  ],
};

const milkGroup = {
  id: "grp_milk",
  name: "Milk",
  required: false,
  options: [
    { id: "opt_oat", name: "Oat milk", price: 30 },
    { id: "opt_soy", name: "Soy milk", price: 25 },
  ],
};

const addOnGroup = {
  id: "grp_addon",
  name: "Add-ons",
  required: false,
  options: [
    { id: "opt_shot", name: "Extra shot", price: 35 },
    { id: "opt_syrup", name: "Flavour syrup", price: 20 },
    { id: "opt_whip", name: "Whipped cream", price: 25 },
  ],
};

const drink = (id, name, sku, price, cost, categoryId, groups) => ({
  id,
  name,
  sku,
  barcode: "",
  categoryId,
  price,
  cost,
  trackStock: false,
  stock: 0,
  active: true,
  image: "",
  modifierGroups: groups,
});

const stocked = (id, name, sku, barcode, price, cost, categoryId, stock) => ({
  id,
  name,
  sku,
  barcode,
  categoryId,
  price,
  cost,
  trackStock: true,
  stock,
  active: true,
  image: "",
  modifierGroups: [],
});

const PRODUCTS = [
  drink("prd_espresso", "Espresso", "ESP-001", 110, 34, "cat_espresso", [addOnGroup]),
  drink("prd_americano", "Americano", "ESP-002", 130, 38, "cat_espresso", [sizeGroup, tempGroup, addOnGroup]),
  drink("prd_latte", "Café Latte", "ESP-003", 150, 52, "cat_espresso", [sizeGroup, tempGroup, milkGroup, addOnGroup]),
  drink("prd_cappuccino", "Cappuccino", "ESP-004", 150, 52, "cat_espresso", [sizeGroup, tempGroup, milkGroup, addOnGroup]),
  drink("prd_caramel", "Caramel Macchiato", "ESP-005", 175, 64, "cat_espresso", [sizeGroup, tempGroup, milkGroup, addOnGroup]),
  drink("prd_spanish", "Spanish Latte", "ESP-006", 165, 61, "cat_espresso", [sizeGroup, tempGroup, milkGroup]),
  drink("prd_mocha", "Café Mocha", "ESP-007", 170, 63, "cat_espresso", [sizeGroup, tempGroup, milkGroup, addOnGroup]),

  drink("prd_house", "House Blend", "BRW-001", 100, 26, "cat_brewed", [sizeGroup, tempGroup]),
  drink("prd_coldbrew", "Cold Brew", "BRW-002", 160, 48, "cat_brewed", [sizeGroup]),
  drink("prd_barako", "Batangas Barako", "BRW-003", 95, 24, "cat_brewed", [sizeGroup, tempGroup]),

  drink("prd_matcha", "Matcha Latte", "NCF-001", 170, 66, "cat_noncoffee", [sizeGroup, tempGroup, milkGroup]),
  drink("prd_choco", "Hot Chocolate", "NCF-002", 145, 49, "cat_noncoffee", [sizeGroup, milkGroup]),
  drink("prd_frappe", "Strawberry Frappe", "NCF-003", 175, 68, "cat_noncoffee", [sizeGroup, addOnGroup]),
  drink("prd_icedtea", "House Iced Tea", "NCF-004", 90, 22, "cat_noncoffee", [sizeGroup]),

  stocked("prd_croissant", "Butter Croissant", "PST-001", "4806000000011", 95, 41, "cat_pastry", 24),
  stocked("prd_danish", "Cheese Danish", "PST-002", "4806000000028", 105, 46, "cat_pastry", 18),
  stocked("prd_banana", "Banana Bread", "PST-003", "4806000000035", 90, 33, "cat_pastry", 20),
  stocked("prd_cookie", "Choco Chip Cookie", "PST-004", "4806000000042", 75, 26, "cat_pastry", 32),
  stocked("prd_cinnamon", "Cinnamon Roll", "PST-005", "4806000000059", 110, 47, "cat_pastry", 14),

  stocked("prd_panini", "Tuna Panini", "MEA-001", "4806000000066", 185, 84, "cat_meals", 12),
  stocked("prd_hamcheese", "Ham and Cheese", "MEA-002", "4806000000073", 165, 72, "cat_meals", 15),
  stocked("prd_carbonara", "Carbonara", "MEA-003", "4806000000080", 195, 88, "cat_meals", 10),
  stocked("prd_tapa", "Beef Tapa Rice Bowl", "MEA-004", "4806000000097", 210, 96, "cat_meals", 9),

  stocked("prd_beans", "House Blend Beans 250g", "BNS-001", "4806000000103", 480, 305, "cat_beans", 22),
  stocked("prd_tumbler", "Kapé Kalye Tumbler", "BNS-002", "4806000000110", 650, 410, "cat_beans", 8),
  stocked("prd_mug", "Ceramic Mug", "BNS-003", "4806000000127", 350, 198, "cat_beans", 4),
];

/**
 * Twelve people: an owner, two supervisors who can approve a void, and
 * nine baristas on the register. PINs are deliberately obvious because
 * this is demo data and someone has to be able to sign in as them.
 */
const STAFF = [
  { code: "elena", name: "Elena Villaruel", role: "manager", pin: "220188" },
  { code: "jomar", name: "Jomar Reyes", role: "manager", pin: "441027" },
  { code: "maria", name: "Maria Santos", role: "manager", pin: "319845" },
  { code: "andrea", name: "Andrea Lim", role: "cashier", pin: "2431" },
  { code: "paolo", name: "Paolo Cruz", role: "cashier", pin: "7712" },
  { code: "bea", name: "Bea Ramos", role: "cashier", pin: "5064" },
  { code: "karl", name: "Karl Mendoza", role: "cashier", pin: "8829" },
  { code: "nica", name: "Nica Villanueva", role: "cashier", pin: "3390" },
  { code: "rafael", name: "Rafael Dizon", role: "cashier", pin: "6157" },
  { code: "trisha", name: "Trisha Gonzales", role: "cashier", pin: "9048" },
  { code: "miguel", name: "Miguel Torres", role: "cashier", pin: "1276" },
  { code: "joy", name: "Joy Aquino", role: "cashier", pin: "4503" },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */

let seed = 20260906;
/** Deterministic, so a re-run produces the same shop. */
function random() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (min, max) => min + Math.floor(random() * (max - min + 1));
const chance = (p) => random() < p;
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const uid = (p) => `${p}_${Math.floor(random() * 1e9).toString(36)}${Date.now().toString(36).slice(-3)}`;

async function commit(operations) {
  for (let i = 0; i < operations.length; i += 400) {
    const batch = writeBatch(db);
    for (const op of operations.slice(i, i + 400)) {
      if (op.type === "delete") batch.delete(doc(db, op.path, op.id));
      else batch.set(doc(db, op.path, op.id), op.data);
    }
    await batch.commit();
  }
}

async function wipe(paths) {
  const operations = [];
  for (const path of paths) {
    const snapshot = await getDocs(collection(db, path));
    snapshot.forEach((d) => operations.push({ type: "delete", path, id: d.id }));
  }
  if (operations.length) await commit(operations);
  return operations.length;
}

/* A coffee shop is not busy at a constant rate. Mornings carry it. */
const HOUR_WEIGHT = {
  6: 3, 7: 9, 8: 12, 9: 10, 10: 6, 11: 5,
  12: 7, 13: 6, 14: 4, 15: 6, 16: 7, 17: 6,
  18: 4, 19: 3, 20: 2,
};

function buildLine(product) {
  const modifiers = [];
  for (const group of product.modifierGroups ?? []) {
    if (group.required) {
      modifiers.push(asModifier(group, chance(0.55) ? group.options[0] : group.options[1] ?? group.options[0]));
    } else if (chance(0.22)) {
      modifiers.push(asModifier(group, pick(group.options)));
    }
  }
  const addOn = modifiers.reduce((sum, m) => sum + m.price, 0);
  const qty = chance(0.16) ? 2 : 1;
  return {
    id: uid("line"),
    signature: `${product.id}::${modifiers.map((m) => m.optionId).sort().join("|")}`,
    productId: product.id,
    name: product.name,
    basePrice: product.price,
    unitPrice: round2(product.price + addOn),
    qty,
    modifiers,
  };
}

const asModifier = (group, option) => ({
  groupId: group.id,
  groupName: group.name,
  optionId: option.id,
  optionName: option.name,
  price: option.price,
});

function totalsFor(items, customer) {
  const subtotal = round2(items.reduce((s, l) => s + l.unitPrice * l.qty, 0));
  const itemCount = items.reduce((n, l) => n + l.qty, 0);
  if (customer) {
    const exempt = round2(subtotal / 1.12);
    const statutory = round2(exempt * 0.2);
    return {
      subtotal, discount: statutory, statutoryDiscount: statutory,
      vatExempt: true, taxable: 0, taxExempt: exempt, tax: 0,
      total: round2(exempt - statutory), itemCount, customer,
    };
  }
  const tax = round2(subtotal - subtotal / 1.12);
  return {
    subtotal, discount: 0, statutoryDiscount: 0, vatExempt: false,
    taxable: round2(subtotal - tax), taxExempt: 0, tax,
    total: subtotal, itemCount,
  };
}

function tendersFor(total) {
  const roll = random();
  if (roll < 0.5) {
    const given = Math.ceil(total / 50) * 50 + (chance(0.3) ? 50 : 0);
    return { tenders: [{ method: "cash", amount: given, reference: "" }], change: round2(given - total) };
  }
  if (roll < 0.74) return { tenders: [{ method: "gcash", amount: total, reference: String(between(100000, 999999)) }], change: 0 };
  if (roll < 0.88) return { tenders: [{ method: "card", amount: total, reference: String(between(10000, 99999)) }], change: 0 };
  if (roll < 0.95) return { tenders: [{ method: "maya", amount: total, reference: String(between(100000, 999999)) }], change: 0 };
  const cash = Math.round(total / 2 / 10) * 10;
  return {
    tenders: [
      { method: "cash", amount: cash, reference: "" },
      { method: "gcash", amount: round2(total - cash), reference: String(between(100000, 999999)) },
    ],
    change: 0,
  };
}

const SENIOR_NAMES = ["Lolo Ising Ramos", "Aida Perez", "Rogelio Manalo", "Corazon Dizon"];

/* ------------------------------------------------------------------ */
/* generation                                                          */

function generate() {
  const operations = [];
  const stock = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.stock]));
  const cashiers = STAFF.filter((s) => s.role === "cashier");
  const supervisors = STAFF.filter((s) => s.role === "manager");

  let saleNumber = 1;
  const now = new Date();

  for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset--) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);
    const weekend = day.getDay() === 0 || day.getDay() === 6;

    /* Two shifts a day, opening and closing, each with its own person. */
    for (const [index, window] of [[6, 14], [14, 21]].entries()) {
      const cashier = cashiers[(dayOffset * 2 + index) % cashiers.length];
      const shiftId = uid("shift");
      const openedAt = new Date(day);
      openedAt.setHours(window[0], between(0, 12), 0, 0);

      const shiftSales = [];

      for (let hour = window[0]; hour < window[1]; hour++) {
        const weight = HOUR_WEIGHT[hour] ?? 2;
        /* Scaled to one busy branch rather than a chain, which also
           keeps the localStorage mirror under quota: that holds the
           whole history as a single blob. */
        const count = Math.max(
          0,
          Math.round(weight * 0.5 * (weekend ? 1.35 : 1) * (0.6 + random() * 0.8)),
        );

        for (let i = 0; i < count; i++) {
          const at = new Date(day);
          at.setHours(hour, between(0, 59), between(0, 59), 0);
          if (at > now) continue;

          const items = [];
          const lineCount = chance(0.42) ? 2 : chance(0.12) ? 3 : 1;
          for (let l = 0; l < lineCount; l++) {
            const product = chance(0.68)
              ? pick(PRODUCTS.filter((p) => !p.trackStock))
              : pick(PRODUCTS.filter((p) => p.trackStock && p.categoryId !== "cat_beans"));
            items.push(buildLine(product));
          }

          const customer = chance(0.045)
            ? {
                type: chance(0.7) ? "senior" : "pwd",
                name: pick(SENIOR_NAMES),
                idNumber: `OSCA-${between(1000, 9999)}`,
              }
            : null;

          const totals = totalsFor(items, customer);
          const { tenders, change } = tendersFor(totals.total);
          const voided = chance(0.012);

          const sale = {
            id: uid("sale"),
            number: `T1-${String(saleNumber++).padStart(5, "0")}`,
            at: at.toISOString(),
            tabName: "Walk-in",
            cashier: { uid: `demo_${cashier.code}`, name: cashier.name },
            shiftId,
            note: "",
            customer,
            items,
            discountRule: { type: "percent", value: 0 },
            ...totals,
            payment: {
              method: tenders.length > 1 ? "split" : tenders[0].method,
              tenders,
              tendered: round2(tenders.reduce((s, t) => s + t.amount, 0)),
              change,
              reference: tenders.map((t) => t.reference).filter(Boolean).join(", "),
            },
            status: voided ? "voided" : "completed",
            ...(voided
              ? {
                  voidedAt: new Date(at.getTime() + 120000).toISOString(),
                  voidReason: pick(["wrong item", "customer changed mind", "double charge"]),
                  voidedBy: { uid: "demo_sup", name: pick(supervisors).name },
                }
              : {}),
          };

          operations.push({ type: "set", path: "sales", id: sale.id, data: sale });
          shiftSales.push(sale);

          if (!voided) {
            for (const line of items) {
              if (stock[line.productId] === undefined) continue;
              const product = PRODUCTS.find((p) => p.id === line.productId);
              if (!product.trackStock) continue;
              stock[line.productId] -= line.qty;
              const move = {
                id: uid("mv"),
                at: sale.at,
                productId: line.productId,
                delta: -line.qty,
                reason: "sale",
                note: sale.number,
              };
              operations.push({ type: "set", path: "stockMoves", id: move.id, data: move });
            }
          }
        }
      }

      /* A delivery lands most mornings, or the pastry case runs dry. */
      if (index === 0 && chance(0.7)) {
        for (const product of PRODUCTS.filter((p) => p.trackStock && p.categoryId === "cat_pastry")) {
          const qty = between(10, 24);
          stock[product.id] += qty;
          const move = {
            id: uid("mv"),
            at: new Date(day.setHours(6, 20, 0, 0)).toISOString(),
            productId: product.id,
            delta: qty,
            reason: "delivery",
            note: `DR-${between(1000, 9999)}`,
          };
          operations.push({ type: "set", path: "stockMoves", id: move.id, data: move });
        }
      }

      const cashTaken = round2(
        shiftSales
          .filter((s) => s.status === "completed")
          .reduce((sum, s) => {
            const cash = s.payment.tenders
              .filter((t) => t.method === "cash")
              .reduce((n, t) => n + t.amount, 0);
            return sum + cash - (cash ? s.payment.change : 0);
          }, 0),
      );

      const openingFloat = 2000;
      const expectedCash = round2(openingFloat + cashTaken);
      /* Drawers are rarely exact. Most balance, some are a few pesos out. */
      const variance = chance(0.62) ? 0 : round2((chance(0.6) ? -1 : 1) * between(1, 8) * 5);
      const closedAt = new Date(day);
      closedAt.setHours(window[1], between(2, 25), 0, 0);
      const stillOpen = closedAt > now;

      const shift = {
        id: shiftId,
        terminalCode: "T1",
        cashier: { uid: `demo_${cashier.code}`, name: cashier.name },
        openedAt: openedAt.toISOString(),
        openingFloat,
        status: stillOpen ? "open" : "closed",
        closedAt: stillOpen ? null : closedAt.toISOString(),
        ...(stillOpen
          ? {}
          : {
              countedCash: round2(expectedCash + variance),
              expectedCash,
              variance,
              closingNote: variance === 0 ? "" : variance < 0 ? "short, wrong change given" : "over, unclaimed change",
              totals: { net: round2(shiftSales.reduce((s, x) => s + (x.status === "completed" ? x.total : 0), 0)), sales: shiftSales.length },
            }),
      };
      operations.push({ type: "set", path: "shifts", id: shift.id, data: shift });
    }
  }

  for (const product of PRODUCTS) {
    operations.push({
      type: "set",
      path: "products",
      id: product.id,
      data: { ...product, stock: Math.max(0, stock[product.id] ?? 0) },
    });
  }
  for (const category of CATEGORIES) {
    operations.push({ type: "set", path: "categories", id: category.id, data: category });
  }
  operations.push({ type: "set", path: "config", id: "settings", data: SETTINGS });

  return operations;
}

/* ------------------------------------------------------------------ */

async function createStaffAccounts() {
  const domain = `${env.VITE_FIREBASE_PROJECT_ID}.invalid`;
  const results = [];

  for (const person of STAFF) {
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        `${person.code}@${domain}`,
        `${person.pin}-pos-pin`,
      );
      await updateProfile(credential.user, { displayName: person.name });
      const batch = writeBatch(db);
      batch.set(doc(db, "users", credential.user.uid), {
        uid: credential.user.uid,
        code: person.code,
        name: person.name,
        role: person.role,
        active: true,
        createdAt: new Date().toISOString(),
      });
      await batch.commit();
      await signOut(auth);
      results.push(`  created ${person.code.padEnd(8)} ${person.role.padEnd(8)} PIN ${person.pin}`);
    } catch (error) {
      results.push(`  skipped ${person.code.padEnd(8)} ${error.code ?? error.message}`);
    }
  }
  return results;
}

async function main() {
  if (process.argv.includes("--dry")) {
    const operations = generate();
    const sales = operations.filter((o) => o.path === "sales").map((o) => o.data);
    const completed = sales.filter((s) => s.status === "completed");
    const revenue = completed.reduce((sum, s) => sum + s.total, 0);
    const byMethod = {};
    for (const sale of completed) {
      for (const t of sale.payment.tenders) {
        byMethod[t.method] = Math.round((byMethod[t.method] ?? 0) + t.amount);
      }
    }
    console.log(`documents: ${operations.length}`);
    console.log(`sales: ${sales.length} (${sales.length - completed.length} voided)`);
    console.log(`revenue: ${Math.round(revenue).toLocaleString()} over ${DAYS} days`);
    console.log(`average sale: ${Math.round(revenue / completed.length)}`);
    console.log(`per day: ${Math.round(completed.length / DAYS)} sales`);
    console.log("tenders:", byMethod);
    console.log("senior/PWD sales:", completed.filter((s) => s.customer).length);
    console.log("sample:", JSON.stringify(completed[0], null, 1).slice(0, 700));
    await deleteApp(app);
    process.exit(0);
  }

  if (WIPE) {
    const removed = await wipe(["sales", "stockMoves", "shifts", "products", "categories"]);
    console.log(`wiped ${removed} documents`);
  }

  const operations = generate();
  await commit(operations);

  const sales = operations.filter((o) => o.path === "sales").length;
  const shifts = operations.filter((o) => o.path === "shifts").length;
  const moves = operations.filter((o) => o.path === "stockMoves").length;
  console.log(
    `wrote ${PRODUCTS.length} products, ${CATEGORIES.length} categories, ${shifts} shifts, ${sales} sales, ${moves} stock movements`,
  );

  if (!SKIP_STAFF) {
    console.log("staff accounts:");
    for (const line of await createStaffAccounts()) console.log(line);
  }

  await deleteApp(app);
  process.exit(0);
}

main().catch((error) => {
  console.error("FAILED:", error);
  process.exit(1);
});
