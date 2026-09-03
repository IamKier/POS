import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, TriangleAlert, X } from "lucide-react";
import { usePos } from "../store/context.js";
import { Chip, SearchInput } from "../components/ui.jsx";
import ProductGrid from "../components/ProductGrid.jsx";
import CartPanel from "../components/CartPanel.jsx";
import ModifierModal from "../components/ModifierModal.jsx";
import PaymentModal from "../components/PaymentModal.jsx";
import ReceiptModal from "../components/ReceiptModal.jsx";

export default function Sell() {
  const {
    dispatch,
    settings,
    products,
    categories,
    categoryById,
    tabs,
    activeTabId,
    carts,
    activeCart,
    totals,
    sales,
  } = usePos();

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [modifierFor, setModifierFor] = useState(null);
  const [paying, setPaying] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [warning, setWarning] = useState("");
  const searchRef = useRef(null);

  /* Checkout prepends the new sale, so the newest one is the one to show. */
  const receipt = showReceipt ? sales[0] : null;

  useEffect(() => {
    if (!warning) return undefined;
    const t = setTimeout(() => setWarning(""), 2600);
    return () => clearTimeout(t);
  }, [warning]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.active) return false;
      if (categoryId !== "all" && p.categoryId !== categoryId) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q)
      );
    });
  }, [products, query, categoryId]);

  function qtyInCart(productId) {
    return activeCart.items
      .filter((l) => l.productId === productId)
      .reduce((n, l) => n + l.qty, 0);
  }

  function addToCart(product, modifiers = [], qty = 1) {
    if (product.trackStock && qtyInCart(product.id) + qty > product.stock) {
      setWarning(`Only ${product.stock} of ${product.name} left in stock.`);
      return;
    }
    dispatch({ type: "cart/add", tabId: activeTabId, product, modifiers, qty });
  }

  function pick(product) {
    if (product.modifierGroups?.length) {
      setModifierFor(product);
      return;
    }
    addToCart(product);
  }

  /* Barcode scanners type the code and press Enter. */
  function onSearchKeyDown(e) {
    if (e.key !== "Enter") return;
    const q = query.trim().toLowerCase();
    if (!q) return;
    const exact = products.find(
      (p) => p.active && (p.barcode === q || p.sku.toLowerCase() === q),
    );
    const target = exact ?? (visible.length === 1 ? visible[0] : null);
    if (!target) {
      setWarning("No product matches that code.");
      return;
    }
    pick(target);
    setQuery("");
  }

  function checkout(payment) {
    dispatch({
      type: "sale/checkout",
      tabId: activeTabId,
      totals,
      payment,
      at: new Date().toISOString(),
    });
    setPaying(false);
    setShowReceipt(true);
  }

  const tablesMode = settings.serviceMode === "tables";

  return (
    <>
      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="no-print flex h-16 items-center gap-3 border-b border-line bg-surface px-4">
            <h1 className="hidden shrink-0 text-base font-semibold text-ink md:block">
              Sell
            </h1>
            <div className="relative flex min-w-0 flex-1 items-center">
              <SearchInput
                ref={searchRef}
                icon={Search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search a product, or scan a barcode"
                autoFocus
              />
              {query ? (
                <button
                  onClick={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </header>

          {tablesMode ? (
            <div className="no-print flex items-center gap-2 overflow-x-auto border-b border-line bg-surface-2 px-4 py-2">
              {tabs.map((tab) => {
                const count = (carts[tab.id]?.items ?? []).reduce(
                  (n, l) => n + l.qty,
                  0,
                );
                const active = tab.id === activeTabId;
                return (
                  <button
                    key={tab.id}
                    onClick={() => dispatch({ type: "tab/select", tabId: tab.id })}
                    className={`flex shrink-0 items-center gap-2 rounded-pill px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-accent-solid text-white"
                        : count
                          ? "bg-accent-soft text-accent"
                          : "bg-surface text-muted hover:text-ink"
                    }`}
                  >
                    {tab.name}
                    {count ? (
                      <span className="tnum rounded-pill bg-black/15 px-1.5 text-xs">
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  const name = window.prompt("Name for the new table or tab");
                  if (name?.trim()) dispatch({ type: "tab/add", name: name.trim() });
                }}
                className="flex shrink-0 items-center gap-1 rounded-pill border border-dashed border-line-strong px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
              >
                <Plus className="size-3.5" />
                Add
              </button>
            </div>
          ) : null}

          <div className="no-print flex items-center gap-2 overflow-x-auto border-b border-line bg-surface px-4 py-2.5">
            <Chip
              active={categoryId === "all"}
              onClick={() => setCategoryId("all")}
            >
              All
            </Chip>
            {categories.map((c) => (
              <Chip
                key={c.id}
                active={categoryId === c.id}
                onClick={() => setCategoryId(c.id)}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: categoryId === c.id ? "#fff" : c.color }}
                />
                {c.name}
              </Chip>
            ))}
          </div>

          {warning ? (
            <div className="no-print flex items-center gap-2 border-b border-warn/30 bg-warn-soft px-4 py-2 text-sm text-warn">
              <TriangleAlert className="size-4 shrink-0" />
              {warning}
            </div>
          ) : null}

          <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-4">
            <ProductGrid
              products={visible}
              categoryById={categoryById}
              currency={settings.currency}
              lowStockThreshold={settings.lowStockThreshold}
              onPick={pick}
            />
          </div>
        </section>

        <CartPanel
          cart={activeCart}
          totals={totals}
          settings={settings}
          onQty={(lineId, qty) =>
            dispatch({ type: "cart/setQty", tabId: activeTabId, lineId, qty })
          }
          onRemove={(lineId) =>
            dispatch({ type: "cart/removeLine", tabId: activeTabId, lineId })
          }
          onDiscount={(discount) =>
            dispatch({ type: "cart/setDiscount", tabId: activeTabId, discount })
          }
          onNote={(note) =>
            dispatch({ type: "cart/setNote", tabId: activeTabId, note })
          }
          onClear={() => dispatch({ type: "cart/clear", tabId: activeTabId })}
          onCharge={() => setPaying(true)}
        />
      </div>

      {modifierFor ? (
        <ModifierModal
          product={modifierFor}
          currency={settings.currency}
          onClose={() => setModifierFor(null)}
          onConfirm={(modifiers, qty) => {
            addToCart(modifierFor, modifiers, qty);
            setModifierFor(null);
          }}
        />
      ) : null}

      {paying ? (
        <PaymentModal
          totals={totals}
          currency={settings.currency}
          onClose={() => setPaying(false)}
          onConfirm={checkout}
        />
      ) : null}

      {receipt ? (
        <ReceiptModal
          sale={receipt}
          settings={settings}
          onClose={() => {
            setShowReceipt(false);
            searchRef.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}

