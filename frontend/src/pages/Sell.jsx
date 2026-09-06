import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Plus, Search, TriangleAlert, Wallet, X } from "lucide-react";
import { usePos } from "../store/context.js";
import { useAuth } from "../auth/context.js";
import { Button, Chip, SearchInput } from "../components/ui.jsx";
import ProductGrid from "../components/ProductGrid.jsx";
import CartPanel from "../components/CartPanel.jsx";
import ModifierModal from "../components/ModifierModal.jsx";
import PaymentModal from "../components/PaymentModal.jsx";
import ReceiptModal from "../components/ReceiptModal.jsx";
import ApprovalModal from "../components/ApprovalModal.jsx";
import CustomerDiscountModal from "../components/CustomerDiscountModal.jsx";
import ScannerModal from "../components/ScannerModal.jsx";
import { listenForScans } from "../lib/hardwareScanner.js";
import { cameraSupported } from "../lib/scanner.js";
import { OpenShiftModal } from "../components/ShiftModal.jsx";
import { activeShiftOf } from "../lib/shift.js";

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
    shifts,
    activeShiftId,
    terminal,
  } = usePos();

  const activeShift = activeShiftOf({ shifts, activeShiftId });

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [modifierFor, setModifierFor] = useState(null);
  const [paying, setPaying] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [warning, setWarning] = useState("");
  const [approval, setApproval] = useState(null);
  const [discountApproved, setDiscountApproved] = useState(false);
  const [customerDiscountOpen, setCustomerDiscountOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [openingShift, setOpeningShift] = useState(false);
  const [justAdded, setJustAdded] = useState(null);
  const searchRef = useRef(null);
  const { isManager, user, profile } = useAuth();

  /* Checkout prepends the new sale, so the newest one is the one to show. */
  const receipt = showReceipt ? sales[0] : null;

  useEffect(() => {
    if (!warning) return undefined;
    const t = setTimeout(() => setWarning(""), 2600);
    return () => clearTimeout(t);
  }, [warning]);

  useEffect(() => {
    if (!justAdded) return undefined;
    const t = setTimeout(() => setJustAdded(null), 700);
    return () => clearTimeout(t);
  }, [justAdded]);

  /* The handler closes over the catalog, so it changes every render.
     Keeping it in a ref means the global key listener is attached once
     rather than torn down and rebuilt constantly. */
  const latestHandler = useRef(null);
  useEffect(() => {
    latestHandler.current = handleCode;
  });

  /**
   * A USB or Bluetooth scanner types wherever the focus is, so this
   * listens globally and works without clicking the search box first.
   * It stands down while a modal is open, so a scan cannot drop an item
   * into a cart the cashier is halfway through paying for.
   */
  const modalOpen = Boolean(
    modifierFor || paying || showReceipt || approval || customerDiscountOpen || scanning,
  );
  useEffect(() => {
    if (modalOpen) return undefined;
    return listenForScans({ onScan: (code) => latestHandler.current?.(code) });
  }, [modalOpen]);

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
    setJustAdded(product.id);
  }

  function pick(product) {
    if (product.modifierGroups?.length) {
      setModifierFor(product);
      return;
    }
    addToCart(product);
  }

  /**
   * One path for every scan, whichever device produced it: a USB or
   * Bluetooth scanner, the phone camera, or someone typing a code and
   * pressing Enter.
   */
  function handleCode(raw) {
    const q = String(raw).trim().toLowerCase();
    if (!q) return;
    const exact = products.find(
      (p) => p.active && (p.barcode === q || p.sku.toLowerCase() === q),
    );
    const target = exact ?? (visible.length === 1 ? visible[0] : null);
    if (!target) {
      setWarning(`Nothing matches ${q}.`);
      return;
    }
    pick(target);
    setQuery("");
  }

  function onSearchKeyDown(e) {
    if (e.key !== "Enter") return;
    handleCode(query);
  }

  /* Every sale carries who rang it up. Without that, a shortfall at
     the end of a shift has nobody to ask about it. */
  function checkout(payment) {
    dispatch({
      type: "sale/checkout",
      tabId: activeTabId,
      totals,
      payment,
      at: new Date().toISOString(),
      cashier: user
        ? { uid: user.uid, name: profile?.name ?? user.email }
        : null,
    });
    setPaying(false);
    setShowReceipt(true);
    setDiscountApproved(false);
  }

  const tablesMode = settings.serviceMode === "tables";

  /**
   * With shifts required, the register does not open until someone has
   * counted a float into the drawer. That is the whole point: cash with
   * nobody's name on it is cash nobody has to explain.
   */
  if (settings.requireShift && !activeShift) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 text-center shadow-card">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-accent-soft">
            <Wallet className="size-6 text-accent" />
          </span>
          <h2 className="text-base font-semibold text-ink">No shift open</h2>
          <p className="mt-1 text-sm text-muted">
            Count the float into the drawer and open a shift on{" "}
            {terminal?.code ?? "this register"} to start selling.
          </p>
          <Button
            size="lg"
            className="mt-5 w-full"
            onClick={() => setOpeningShift(true)}
          >
            Open a shift
          </Button>
        </div>

        {openingShift ? (
          <OpenShiftModal
            settings={settings}
            cashierName={profile?.name}
            onClose={() => setOpeningShift(false)}
            onOpen={(openingFloat) => {
              dispatch({
                type: "shift/open",
                at: new Date().toISOString(),
                openingFloat,
                cashier: user
                  ? { uid: user.uid, name: profile?.name ?? user.uid }
                  : null,
              });
              setOpeningShift(false);
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="no-print flex h-16 items-center gap-3 border-b border-line bg-surface px-4">
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

            {cameraSupported() ? (
              <button
                onClick={() => setScanning(true)}
                title="Scan with the camera"
                className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-line px-4 text-sm font-medium text-ink transition-colors active:bg-surface-2"
              >
                <Camera className="size-4" />
                <span className="hidden sm:inline">Scan</span>
              </button>
            ) : null}
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
              justAddedId={justAdded}
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
          onClear={() => {
            dispatch({ type: "cart/clear", tabId: activeTabId });
            setDiscountApproved(false);
          }}
          onCharge={() => setPaying(true)}
          onCustomerDiscount={() => setCustomerDiscountOpen(true)}
          discountLocked={!isManager && !discountApproved}
          onUnlockDiscount={() =>
            setApproval({
              action: "Apply a discount to this order",
              run: () => setDiscountApproved(true),
            })
          }
        />
      </div>

      {scanning ? (
        <ScannerModal
          title="Scan into the cart"
          subtitle="Keep scanning to add more items"
          continuous
          onScan={handleCode}
          onClose={() => {
            setScanning(false);
            searchRef.current?.focus();
          }}
        />
      ) : null}

      {customerDiscountOpen ? (
        <CustomerDiscountModal
          items={activeCart.items}
          settings={settings}
          current={activeCart.customer}
          onClose={() => setCustomerDiscountOpen(false)}
          onRemove={() => {
            dispatch({ type: "cart/setCustomer", tabId: activeTabId, customer: null });
            setCustomerDiscountOpen(false);
          }}
          onApply={(customer) => {
            dispatch({ type: "cart/setCustomer", tabId: activeTabId, customer });
            setCustomerDiscountOpen(false);
          }}
        />
      ) : null}

      {approval ? (
        <ApprovalModal
          action={approval.action}
          onClose={() => setApproval(null)}
          onApproved={() => {
            approval.run();
            setApproval(null);
          }}
        />
      ) : null}

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
          settings={settings}
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

