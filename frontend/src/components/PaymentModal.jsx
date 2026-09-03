import { useMemo, useState } from "react";
import { Banknote, CreditCard, Wallet } from "lucide-react";
import { Button, Field, Input, Modal } from "./ui.jsx";
import { formatMoney, round2 } from "../lib/format.js";

const METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "ewallet", label: "E-wallet", icon: Wallet },
];

/** Exact amount first, then the notes a cashier is most likely handed. */
function quickAmounts(total) {
  const steps = [50, 100, 200, 500, 1000];
  const out = [round2(total)];
  for (const step of steps) {
    const up = Math.ceil(total / step) * step;
    if (up > total && !out.includes(up)) out.push(up);
  }
  return out.slice(0, 5);
}

export default function PaymentModal({ totals, currency, onClose, onConfirm }) {
  const [method, setMethod] = useState("cash");
  const [tendered, setTendered] = useState(String(round2(totals.total)));
  const [reference, setReference] = useState("");

  const amounts = useMemo(() => quickAmounts(totals.total), [totals.total]);
  const paid = method === "cash" ? Number(tendered) || 0 : totals.total;
  const change = round2(paid - totals.total);
  const short = method === "cash" && change < 0;

  function confirm() {
    if (short) return;
    onConfirm({
      method,
      tendered: round2(paid),
      change: method === "cash" ? change : 0,
      reference: reference.trim(),
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Take payment"
      subtitle={`${totals.itemCount} item${totals.itemCount === 1 ? "" : "s"} on this order`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="good" size="lg" disabled={short} onClick={confirm}>
            Complete sale
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-card bg-accent-soft px-4 py-3 text-center">
          <p className="text-xs font-medium tracking-wide text-accent uppercase">
            Amount due
          </p>
          <p className="tnum mt-1 text-3xl font-bold text-accent">
            {formatMoney(totals.total, currency)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const active = m.id === method;
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`flex flex-col items-center gap-1.5 rounded-card border px-3 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line-strong bg-surface text-muted hover:bg-surface-2"
                }`}
              >
                <Icon className="size-5" />
                {m.label}
              </button>
            );
          })}
        </div>

        {method === "cash" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {amounts.map((amount, i) => (
                <button
                  key={amount}
                  onClick={() => setTendered(String(amount))}
                  className="rounded-card border border-line-strong bg-surface px-2 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
                >
                  {i === 0 ? "Exact" : formatMoney(amount, currency)}
                </button>
              ))}
            </div>

            <Field label="Cash received">
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                className="tnum h-12 text-lg"
                autoFocus
              />
            </Field>

            <div
              className={`flex items-center justify-between rounded-card px-4 py-3 ${
                short ? "bg-bad-soft text-bad" : "bg-good-soft text-good"
              }`}
            >
              <span className="text-sm font-medium">
                {short ? "Still short" : "Change due"}
              </span>
              <span className="tnum text-xl font-bold">
                {formatMoney(Math.abs(change), currency)}
              </span>
            </div>
          </div>
        ) : (
          <Field
            label="Reference number"
            hint="Approval code or e-wallet reference. Optional."
          >
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. 4821 9930"
              autoFocus
            />
          </Field>
        )}
      </div>
    </Modal>
  );
}
