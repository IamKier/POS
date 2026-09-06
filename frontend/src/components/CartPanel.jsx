import { useState } from "react";
import {
  IdCard,
  Lock,
  Minus,
  Percent,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Button, EmptyState, Input } from "./ui.jsx";
import QtyPad from "./QtyPad.jsx";
import { formatMoney } from "../lib/format.js";

/**
 * The right-hand column of the register. Everything here is sized for a
 * thumb: the step controls are 48px, and the quantity itself is a
 * button, because twelve of something should be two taps on a keypad
 * rather than twelve taps on a plus sign.
 */
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
  discountLocked,
  onUnlockDiscount,
  onCustomerDiscount,
}) {
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const currency = settings.currency;
  const money = (n) => formatMoney(n, currency);
  const empty = cart.items.length === 0;

  return (
    <aside className="no-print flex w-full max-w-md min-w-0 shrink-0 flex-col border-l border-line bg-surface md:w-[24rem] lg:w-[27rem]">
      <header className="flex h-16 items-center justify-between border-b border-line px-4">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <ShoppingCart className="size-5 text-muted" />
          Order
          {totals.itemCount > 0 ? (
            <span className="tnum rounded bg-accent-soft px-2.5 py-1 text-sm text-accent">
              {totals.itemCount}
            </span>
          ) : null}
        </h2>
        {!empty ? (
          <button
            onClick={onClear}
            className="rounded px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-bad active:bg-surface-2"
          >
            Clear
          </button>
        ) : null}
      </header>

      <div className="scroll-slim flex-1 overflow-y-auto">
        {empty ? (
          <EmptyState
            icon={ShoppingCart}
            title="Nothing in the order yet"
            hint="Tap a product, or scan one."
          />
        ) : (
          <ul className="divide-y divide-line">
            {cart.items.map((line) => (
              <li key={line.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] leading-snug font-medium text-ink">
                      {line.name}
                    </p>
                    {line.modifiers.length ? (
                      <p className="mt-0.5 text-sm text-muted">
                        {line.modifiers.map((m) => m.optionName).join(", ")}
                      </p>
                    ) : null}
                    <p className="tnum mt-0.5 text-sm text-muted">
                      {money(line.unitPrice)} each
                    </p>
                  </div>
                  <span className="tnum text-[15px] font-semibold text-ink">
                    {money(line.unitPrice * line.qty)}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <StepButton
                    label="One less"
                    onClick={() => onQty(line.id, line.qty - 1)}
                  >
                    <Minus className="size-5" />
                  </StepButton>

                  <button
                    onClick={() => setEditingLine(line)}
                    title="Type a quantity"
                    className="tnum h-12 min-w-14 rounded-md bg-surface-2 px-3 text-lg font-semibold text-ink transition-colors active:bg-surface-3"
                  >
                    {line.qty}
                  </button>

                  <StepButton
                    label="One more"
                    onClick={() => onQty(line.id, line.qty + 1)}
                  >
                    <Plus className="size-5" />
                  </StepButton>

                  <StepButton
                    label="Remove"
                    className="ml-auto text-muted hover:text-bad"
                    onClick={() => onRemove(line.id)}
                  >
                    <Trash2 className="size-5" />
                  </StepButton>
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
          placeholder="Order note"
          className="mb-3 h-11 w-full rounded-md bg-surface-2 px-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-accent-solid/20"
        />

        <dl className="space-y-2 text-[15px]">
          <Line label="Subtotal" value={money(totals.subtotal)} />

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() =>
                discountLocked ? onUnlockDiscount() : setEditingDiscount((v) => !v)
              }
              className="-ml-2 flex items-center gap-1.5 rounded px-2 py-1.5 text-muted transition-colors hover:text-accent active:bg-surface-2"
            >
              {discountLocked ? (
                <Lock className="size-4" />
              ) : (
                <Percent className="size-4" />
              )}
              Discount
            </button>
            <span className="tnum text-ink">
              {totals.discount && !totals.statutoryDiscount
                ? `-${money(totals.discount)}`
                : money(0)}
            </span>
          </div>

          {editingDiscount && !discountLocked ? (
            <div className="flex items-center gap-2 pb-1">
              <div className="flex overflow-hidden rounded-md border border-line-strong">
                {["percent", "amount"].map((type) => (
                  <button
                    key={type}
                    onClick={() => onDiscount({ ...cart.discount, type })}
                    className={`h-11 px-4 text-sm font-medium transition-colors ${
                      cart.discount.type === type
                        ? "bg-accent-solid text-white"
                        : "bg-surface text-muted"
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
                className="tnum h-11 flex-1"
              />
            </div>
          ) : null}

          {settings.statutoryDiscount ? (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={onCustomerDiscount}
                className={`-ml-2 flex min-w-0 items-center gap-1.5 rounded px-2 py-1.5 transition-colors hover:text-accent active:bg-surface-2 ${
                  cart.customer ? "font-medium text-accent" : "text-muted"
                }`}
              >
                <IdCard className="size-4 shrink-0" />
                <span className="truncate">
                  {cart.customer
                    ? `${cart.customer.type === "pwd" ? "PWD" : "Senior"}: ${cart.customer.name}`
                    : "Senior / PWD"}
                </span>
              </button>
              <span className="tnum shrink-0 text-ink">
                {totals.statutoryDiscount
                  ? `-${money(totals.statutoryDiscount)}`
                  : ""}
              </span>
            </div>
          ) : null}

          <Line
            label={
              totals.vatExempt
                ? `${settings.taxLabel} exempt`
                : settings.taxInclusive
                  ? `${settings.taxLabel} included`
                  : settings.taxLabel
            }
            value={money(totals.tax)}
          />
        </dl>

        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <span className="text-[15px] font-medium text-muted">Total</span>
          <span className="tnum text-3xl font-bold text-ink">
            {money(totals.total)}
          </span>
        </div>

        <Button
          className="mt-3 h-16 w-full text-lg"
          disabled={empty}
          onClick={onCharge}
        >
          Charge {money(totals.total)}
        </Button>
      </div>

      {editingLine ? (
        <QtyPad
          line={editingLine}
          currency={currency}
          onClose={() => setEditingLine(null)}
          onRemove={() => {
            onRemove(editingLine.id);
            setEditingLine(null);
          }}
          onApply={(qty) => {
            onQty(editingLine.id, qty);
            setEditingLine(null);
          }}
        />
      ) : null}
    </aside>
  );
}

function StepButton({ label, className = "", ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`flex size-12 shrink-0 items-center justify-center rounded-md border border-line text-ink transition-colors active:bg-surface-2 ${className}`}
      {...props}
    />
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
