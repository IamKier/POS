import { useState } from "react";
import { Minus, Percent, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button, EmptyState, IconButton, Input } from "./ui.jsx";
import { formatMoney } from "../lib/format.js";

export default function CartPanel({
  cart,
  totals,
  settings,
  onQty,
  onRemove,
  onDiscount,
  onNote,
  onClear,
  onCharge,
}) {
  const [editingDiscount, setEditingDiscount] = useState(false);
  const currency = settings.currency;
  const money = (n) => formatMoney(n, currency);
  const empty = cart.items.length === 0;

  return (
    <aside className="no-print flex w-full max-w-md min-w-0 shrink-0 flex-col border-l border-line bg-surface md:w-[22rem] lg:w-[26rem]">
      <header className="flex h-14 items-center justify-between border-b border-line px-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ShoppingCart className="size-4 text-muted" />
          Current order
          {totals.itemCount > 0 ? (
            <span className="tnum rounded-pill bg-accent-soft px-2 py-0.5 text-xs text-accent">
              {totals.itemCount}
            </span>
          ) : null}
        </h2>
        {!empty ? (
          <button
            onClick={onClear}
            className="text-xs font-medium text-muted transition-colors hover:text-bad"
          >
            Clear
          </button>
        ) : null}
      </header>

      <div className="scroll-slim flex-1 overflow-y-auto">
        {empty ? (
          <EmptyState
            icon={ShoppingCart}
            title="Cart is empty"
            hint="Tap a product to start the order, or scan a barcode into the search box."
          />
        ) : (
          <ul className="divide-y divide-line">
            {cart.items.map((line) => (
              <li key={line.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{line.name}</p>
                    {line.modifiers.length ? (
                      <p className="mt-0.5 text-xs text-muted">
                        {line.modifiers.map((m) => m.optionName).join(", ")}
                      </p>
                    ) : null}
                    <p className="tnum mt-0.5 text-xs text-muted">
                      {money(line.unitPrice)} each
                    </p>
                  </div>
                  <span className="tnum text-sm font-semibold text-ink">
                    {money(line.unitPrice * line.qty)}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <IconButton
                    label="Decrease quantity"
                    className="border border-line-strong"
                    onClick={() => onQty(line.id, line.qty - 1)}
                  >
                    <Minus className="size-4" />
                  </IconButton>
                  <span className="tnum w-8 text-center text-sm font-semibold">
                    {line.qty}
                  </span>
                  <IconButton
                    label="Increase quantity"
                    className="border border-line-strong"
                    onClick={() => onQty(line.id, line.qty + 1)}
                  >
                    <Plus className="size-4" />
                  </IconButton>
                  <IconButton
                    label="Remove line"
                    className="ml-auto hover:text-bad"
                    onClick={() => onRemove(line.id)}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-line px-4 py-3">
        <input
          value={cart.note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Order note (optional)"
          className="mb-3 w-full rounded-card bg-surface-2 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-accent/20"
        />

        <dl className="space-y-1.5 text-sm">
          <Line label="Subtotal" value={money(totals.subtotal)} />

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setEditingDiscount((v) => !v)}
              className="flex items-center gap-1 text-muted transition-colors hover:text-accent"
            >
              <Percent className="size-3.5" />
              Discount
            </button>
            <span className="tnum text-ink">
              {totals.discount ? `-${money(totals.discount)}` : money(0)}
            </span>
          </div>

          {editingDiscount ? (
            <div className="flex items-center gap-2 pb-1">
              <div className="flex overflow-hidden rounded-card border border-line-strong">
                {["percent", "amount"].map((type) => (
                  <button
                    key={type}
                    onClick={() => onDiscount({ ...cart.discount, type })}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      cart.discount.type === type
                        ? "bg-accent-solid text-white"
                        : "bg-surface text-muted hover:bg-surface-2"
                    }`}
                  >
                    {type === "percent" ? "%" : currency}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={cart.discount.value}
                onChange={(e) =>
                  onDiscount({ ...cart.discount, value: Number(e.target.value) })
                }
                className="tnum h-8 flex-1"
              />
            </div>
          ) : null}

          <Line
            label={
              settings.taxInclusive
                ? `${settings.taxLabel} included`
                : settings.taxLabel
            }
            value={money(totals.tax)}
          />
        </dl>

        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-sm font-medium text-muted">Total</span>
          <span className="tnum text-2xl font-bold text-ink">
            {money(totals.total)}
          </span>
        </div>

        <Button
          size="lg"
          className="mt-3 w-full"
          disabled={empty}
          onClick={onCharge}
        >
          Charge {money(totals.total)}
        </Button>
      </div>
    </aside>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="tnum text-ink">{value}</dd>
    </div>
  );
}
