import { uid, round2 } from "../lib/format.js";
import { buildLine, lineSignature } from "../lib/cart.js";
import {
  defaultSettings,
  seedCategories,
  seedProducts,
  seedTabs,
} from "../data/seed.js";

export const STORAGE_KEY = "pos.state.v1";

function emptyCart() {
  return {
    items: [],
    discount: { type: "percent", value: 0 },
    note: "",
    customer: null,
  };
}

/**
 * Every register gets its own code, and receipt numbers carry it. This
 * is how tills have always numbered receipts, and the reason is that
 * the alternative does not survive a POS: a single shared counter would
 * need a transaction against the server on every sale, so the moment
 * the internet drops, the register cannot issue a receipt at all. A
 * per-terminal sequence is unique without anyone coordinating, and
 * keeps working with the cable unplugged.
 *
 * The code is random so two devices never collide out of the box, and
 * editable in Settings so a shop can use T1, T2, COUNTER1 instead. It
 * is deliberately local to the device and never synced.
 */
function newTerminal() {
  return {
    id: uid("term"),
    code: "T" + Math.random().toString(36).slice(2, 6).toUpperCase(),
  };
}

export function initialState() {
  return {
    settings: { ...defaultSettings },
    categories: seedCategories.map((c) => ({ ...c })),
    products: seedProducts.map((p) => ({ ...p })),
    tabs: seedTabs.map((t) => ({ ...t })),
    activeTabId: "tab_walkin",
    carts: { tab_walkin: emptyCart() },
    sales: [],
    stockMoves: [],
    saleCounter: 1,
    terminal: newTerminal(),
  };
}

function cartOf(state, tabId) {
  return state.carts[tabId] ?? emptyCart();
}

function withCart(state, tabId, cart) {
  return { ...state, carts: { ...state.carts, [tabId]: cart } };
}

function saleNumber(terminal, n) {
  return `${terminal?.code ?? "T"}-${String(n).padStart(5, "0")}`;
}

function applyStock(products, productId, delta) {
  return products.map((p) =>
    p.id === productId && p.trackStock
      ? { ...p, stock: round2(p.stock + delta) }
      : p,
  );
}

export function reducer(state, action) {
  switch (action.type) {
    /* ----------------------------- cart ----------------------------- */
    case "cart/add": {
      const { tabId, product, modifiers = [], qty = 1 } = action;
      const cart = cartOf(state, tabId);
      const signature = lineSignature(product.id, modifiers);
      const existing = cart.items.find((l) => l.signature === signature);
      const items = existing
        ? cart.items.map((l) =>
            l.signature === signature ? { ...l, qty: l.qty + qty } : l,
          )
        : [...cart.items, buildLine(product, modifiers, qty)];
      return withCart(state, tabId, { ...cart, items });
    }

    case "cart/setQty": {
      const { tabId, lineId, qty } = action;
      const cart = cartOf(state, tabId);
      const items =
        qty <= 0
          ? cart.items.filter((l) => l.id !== lineId)
          : cart.items.map((l) => (l.id === lineId ? { ...l, qty } : l));
      return withCart(state, tabId, { ...cart, items });
    }

    case "cart/removeLine": {
      const cart = cartOf(state, action.tabId);
      return withCart(state, action.tabId, {
        ...cart,
        items: cart.items.filter((l) => l.id !== action.lineId),
      });
    }

    case "cart/setDiscount": {
      const cart = cartOf(state, action.tabId);
      return withCart(state, action.tabId, {
        ...cart,
        discount: action.discount,
      });
    }

    /* Senior citizen or PWD, with the ID that has to appear on the
       receipt and in the day's report. */
    case "cart/setCustomer": {
      const cart = cartOf(state, action.tabId);
      return withCart(state, action.tabId, { ...cart, customer: action.customer });
    }

    case "cart/setNote": {
      const cart = cartOf(state, action.tabId);
      return withCart(state, action.tabId, { ...cart, note: action.note });
    }

    case "cart/clear":
      return withCart(state, action.tabId, emptyCart());

    /* ----------------------------- tabs ----------------------------- */
    case "tab/select":
      return { ...state, activeTabId: action.tabId };

    case "tab/add": {
      const tab = { id: uid("tab"), name: action.name };
      return {
        ...state,
        tabs: [...state.tabs, tab],
        carts: { ...state.carts, [tab.id]: emptyCart() },
        activeTabId: tab.id,
      };
    }

    case "tab/rename":
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId ? { ...t, name: action.name } : t,
        ),
      };

    case "tab/remove": {
      if (state.tabs.length <= 1) return state;
      const tabs = state.tabs.filter((t) => t.id !== action.tabId);
      const carts = { ...state.carts };
      delete carts[action.tabId];
      return {
        ...state,
        tabs,
        carts,
        activeTabId:
          state.activeTabId === action.tabId ? tabs[0].id : state.activeTabId,
      };
    }

    /* --------------------------- checkout --------------------------- */
    case "sale/checkout": {
      const { tabId, totals, payment, at, cashier } = action;
      const cart = cartOf(state, tabId);
      if (!cart.items.length) return state;

      const tab = state.tabs.find((t) => t.id === tabId);
      const sale = {
        id: uid("sale"),
        number: saleNumber(state.terminal, state.saleCounter),
        at,
        tabName: tab?.name ?? "Walk-in",
        cashier: cashier ?? null,
        note: cart.note,
        customer: cart.customer ?? null,
        items: cart.items.map((l) => ({ ...l })),
        discountRule: cart.discount,
        ...totals,
        payment,
        status: "completed",
      };

      let products = state.products;
      const moves = [];
      for (const line of cart.items) {
        const product = state.products.find((p) => p.id === line.productId);
        if (!product?.trackStock) continue;
        products = applyStock(products, line.productId, -line.qty);
        moves.push({
          id: uid("mv"),
          at,
          productId: line.productId,
          delta: -line.qty,
          reason: "sale",
          note: sale.number,
        });
      }

      return {
        ...withCart({ ...state, products }, tabId, emptyCart()),
        sales: [sale, ...state.sales],
        stockMoves: [...moves, ...state.stockMoves],
        saleCounter: state.saleCounter + 1,
      };
    }

    case "sale/void": {
      const sale = state.sales.find((s) => s.id === action.saleId);
      if (!sale || sale.status === "voided") return state;

      let products = state.products;
      const moves = [];
      for (const line of sale.items) {
        const product = state.products.find((p) => p.id === line.productId);
        if (!product?.trackStock) continue;
        products = applyStock(products, line.productId, line.qty);
        moves.push({
          id: uid("mv"),
          at: action.at,
          productId: line.productId,
          delta: line.qty,
          reason: "void",
          note: sale.number,
        });
      }

      return {
        ...state,
        products,
        stockMoves: [...moves, ...state.stockMoves],
        sales: state.sales.map((s) =>
          s.id === action.saleId
            ? {
                ...s,
                status: "voided",
                voidedAt: action.at,
                voidReason: action.reason,
                voidedBy: action.by ?? null,
              }
            : s,
        ),
      };
    }

    /* --------------------------- catalog ---------------------------- */
    case "product/save": {
      const product = action.product;
      const exists = state.products.some((p) => p.id === product.id);
      return {
        ...state,
        products: exists
          ? state.products.map((p) => (p.id === product.id ? product : p))
          : [...state.products, product],
      };
    }

    case "product/remove":
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.productId),
      };

    case "category/save": {
      const category = action.category;
      const exists = state.categories.some((c) => c.id === category.id);
      return {
        ...state,
        categories: exists
          ? state.categories.map((c) => (c.id === category.id ? category : c))
          : [...state.categories, category],
      };
    }

    case "category/remove":
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.categoryId),
        products: state.products.map((p) =>
          p.categoryId === action.categoryId ? { ...p, categoryId: null } : p,
        ),
      };

    /* -------------------------- inventory --------------------------- */
    case "stock/adjust": {
      const { productId, delta, reason, note, at } = action;
      if (!delta) return state;
      return {
        ...state,
        products: applyStock(state.products, productId, delta),
        stockMoves: [
          { id: uid("mv"), at, productId, delta, reason, note },
          ...state.stockMoves,
        ],
      };
    }

    /* Local to this device, never synced: it is what makes this
       register's receipt numbers distinct from the next one's. */
    case "terminal/setCode":
      return {
        ...state,
        terminal: { ...state.terminal, code: action.code },
      };

    /* --------------------------- settings --------------------------- */
    case "settings/save":
      return { ...state, settings: { ...state.settings, ...action.patch } };

    /* Wholesale swap of the state, from another tab on this machine. */
    case "state/replace":
      return action.state;

    /* One collection arriving from Firestore, whether this device wrote
       it or another register did. Carts and tabs are never touched:
       they belong to the terminal, not to the account. */
    case "remote/merge":
      return { ...state, [action.slice]: action.docs };

    case "remote/settings":
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case "state/reset":
      return initialState();

    default:
      return state;
  }
}

/** Merge a stored blob over a fresh state so new fields never come back undefined. */
export function hydrate(raw) {
  const base = initialState();
  if (!raw) return base;
  try {
    const saved = JSON.parse(raw);
    return {
      ...base,
      ...saved,
      settings: { ...base.settings, ...(saved.settings ?? {}) },
      carts: saved.carts ?? base.carts,
    };
  } catch {
    return base;
  }
}
