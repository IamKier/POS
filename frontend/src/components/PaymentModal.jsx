import { useMemo, useState } from "react";
import {
  Banknote,
  Camera,
  CreditCard,
  Landmark,
  QrCode,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button, Field, Input, Modal } from "./ui.jsx";
import ScannerModal from "./ScannerModal.jsx";
import { formatMoney, round2 } from "../lib/format.js";
import { cameraSupported } from "../lib/scanner.js";
import { paymentSummary, quickAmounts, TENDERS } from "../lib/payments.js";

const ICONS = {
  cash: Banknote,
  card: CreditCard,
  gcash: Wallet,
  maya: Wallet,
  qrph: QrCode,
  bank: Landmark,
};

/**
 * Takes payment across one or several tenders. Everything settles by
 * the cashier confirming it, because there is no payment gateway
 * behind this: for the QR methods the customer scans the store's own
 * code, shows the confirmation on their phone, and the reference is
 * recorded against the sale.
 */
export default function PaymentModal({ totals, settings, onClose, onConfirm }) {
  const [tenders, setTenders] = useState([]);
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(String(round2(totals.total)));
  const [reference, setReference] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const money = (n) => formatMoney(n, settings.currency);
  const summary = paymentSummary(tenders, totals.total);
  const due = summary.remaining;
  const tender = TENDERS.find((t) => t.id === method);
  const quick = useMemo(() => quickAmounts(due || totals.total), [due, totals.total]);
  const storeQr = settings.paymentQr;

  function addTender() {
    const value = round2(Number(amount) || 0);
    if (value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    /* Only cash may exceed what is owed, because only cash gives change. */
    if (method !== "cash" && value > due + 0.001) {
      setError(`A ${tender.label} payment cannot be more than the ${money(due)} due.`);
      return;
    }

    const next = [...tenders, { method, amount: value, reference: reference.trim() }];
    setTenders(next);
    setError("");
    setReference("");

    const left = paymentSummary(next, totals.total).remaining;
    setAmount(left > 0 ? String(left) : "0");
    if (left > 0) setMethod("cash");
  }

  function complete() {
    const finalTenders = tenders.length
      ? tenders
      : [{ method, amount: round2(Number(amount) || 0), reference: reference.trim() }];
    const finalSummary = paymentSummary(finalTenders, totals.total);
    if (!finalSummary.settled) {
      setError(`Still ${money(finalSummary.remaining)} short.`);
      return;
    }
    onConfirm({
      method: finalSummary.method,
      tenders: finalTenders,
      tendered: finalSummary.paid,
      change: finalSummary.change,
      /* Kept so older reports and receipts still read a single value. */
      reference: finalTenders.map((t) => t.reference).filter(Boolean).join(", "),
    });
  }

  const singleTenderReady =
    !tenders.length && round2(Number(amount) || 0) >= totals.total;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Take payment"
        subtitle={`${totals.itemCount} item${totals.itemCount === 1 ? "" : "s"}${
          totals.vatExempt ? `, ${settings.taxLabel} exempt` : ""
        }`}
        width="max-w-lg"
        footer={
          <>
            {tenders.length || !singleTenderReady ? (
              <Button variant="outline" onClick={addTender}>
                Add {money(round2(Number(amount) || 0))}
              </Button>
            ) : null}
            <Button
              variant="good"
              size="lg"
              disabled={!summary.settled && !singleTenderReady}
              onClick={complete}
            >
              Complete sale
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-card bg-accent-soft px-4 py-3 text-center">
            <p className="text-xs font-medium tracking-wide text-accent uppercase">
              {tenders.length ? "Still due" : "Amount due"}
            </p>
            <p className="tnum mt-1 text-3xl font-bold text-accent">
              {money(tenders.length ? due : totals.total)}
            </p>
            {tenders.length ? (
              <p className="text-xs text-accent">
                of {money(totals.total)}, {money(summary.paid)} taken
              </p>
            ) : null}
          </div>

          {tenders.length ? (
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line">
              {tenders.map((t, i) => (
                <li
                  key={`${t.method}-${i}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-ink">
                    {TENDERS.find((x) => x.id === t.method)?.label ?? t.method}
                    {t.reference ? (
                      <span className="ml-2 font-mono text-xs text-muted">
                        {t.reference}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tnum font-medium">{money(t.amount)}</span>
                    <button
                      onClick={() => setTenders(tenders.filter((_, j) => j !== i))}
                      className="rounded-sm p-1 text-muted hover:text-bad"
                      aria-label="Remove this payment"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            {TENDERS.map((t) => {
              const Icon = ICONS[t.id] ?? Wallet;
              const active = t.id === method;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setMethod(t.id);
                    setError("");
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-card border px-2 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line-strong bg-surface text-muted hover:bg-surface-2"
                  }`}
                >
                  <Icon className="size-5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tender.qr ? (
            <div className="rounded-card border border-line bg-surface-2 p-4 text-center">
              {storeQr ? (
                <>
                  <p className="mb-3 text-sm font-medium text-ink">
                    Customer scans this to pay {money(round2(Number(amount) || 0))}
                  </p>
                  <img
                    src={storeQr}
                    alt="Store payment QR"
                    className="mx-auto max-h-64 rounded-card bg-white p-2"
                  />
                </>
              ) : (
                <p className="text-sm text-muted">
                  No payment QR uploaded yet. Add your GCash, Maya or QR Ph code in
                  Settings and it appears here full size for the customer to scan.
                </p>
              )}
            </div>
          ) : null}

          {method === "cash" ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {quick.map((value, i) => (
                <button
                  key={value}
                  onClick={() => setAmount(String(value))}
                  className="rounded-card border border-line-strong bg-surface px-2 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
                >
                  {i === 0 ? "Exact" : money(value)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={method === "cash" ? "Cash received" : "Amount"}>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="tnum h-12 text-lg"
                autoFocus
              />
            </Field>

            {tender.reference ? (
              <Field label={tender.reference}>
                <div className="flex items-center gap-2">
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="4821 9930"
                    className="font-mono"
                  />
                  {cameraSupported() ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => setScanning(true)}
                      title="Scan the QR on the customer's confirmation"
                    >
                      <Camera className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </Field>
            ) : null}
          </div>

          {summary.change > 0 ? (
            <div className="flex items-center justify-between rounded-card bg-good-soft px-4 py-3 text-good">
              <span className="text-sm font-medium">Change due</span>
              <span className="tnum text-xl font-bold">{money(summary.change)}</span>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-card bg-bad-soft px-3 py-2 text-sm text-bad">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>

      {scanning ? (
        <ScannerModal
          title="Scan the customer's confirmation"
          subtitle="The QR on their payment receipt"
          onScan={(value) => {
            setReference(value);
            setScanning(false);
          }}
          onClose={() => setScanning(false)}
        />
      ) : null}
    </>
  );
}
