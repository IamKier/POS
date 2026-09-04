import { useState } from "react";
import { IdCard } from "lucide-react";
import { Button, Field, Input, Modal } from "./ui.jsx";
import { formatMoney } from "../lib/format.js";
import { computeTotals } from "../lib/cart.js";

const TYPES = [
  { id: "senior", label: "Senior citizen", idLabel: "OSCA or senior ID number" },
  { id: "pwd", label: "PWD", idLabel: "PWD ID number" },
];

/**
 * The statutory discount is granted against a named person holding an
 * ID, not against a basket. The name and ID number are required
 * because they have to appear on the receipt and in the day's report,
 * and because the paper booklet the customer signs has to match.
 */
export default function CustomerDiscountModal({
  items,
  settings,
  current,
  onApply,
  onRemove,
  onClose,
}) {
  const [type, setType] = useState(current?.type ?? "senior");
  const [name, setName] = useState(current?.name ?? "");
  const [idNumber, setIdNumber] = useState(current?.idNumber ?? "");
  const [error, setError] = useState("");

  const preview = computeTotals(items, null, settings, { type });
  const plain = computeTotals(items, null, settings, null);
  const money = (n) => formatMoney(n, settings.currency);
  const idLabel = TYPES.find((t) => t.id === type).idLabel;

  function apply() {
    if (!name.trim() || !idNumber.trim()) {
      setError("Both the name and the ID number are required.");
      return;
    }
    onApply({ type, name: name.trim(), idNumber: idNumber.trim() });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Senior citizen or PWD discount"
      subtitle="20 percent off, and the sale becomes VAT exempt"
      footer={
        <>
          {current ? (
            <Button variant="ghost" className="mr-auto text-bad" onClick={onRemove}>
              Remove discount
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={apply}>Apply discount</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`flex items-center justify-center gap-2 rounded-card border px-3 py-3 text-sm font-medium transition-colors ${
                type === t.id
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line-strong bg-surface text-muted hover:bg-surface-2"
              }`}
            >
              <IdCard className="size-4" />
              {t.label}
            </button>
          ))}
        </div>

        <Field label="Customer name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="As printed on the ID"
            autoFocus
          />
        </Field>

        <Field label={idLabel}>
          <Input
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            className="font-mono"
          />
        </Field>

        {error ? (
          <p className="rounded-card bg-bad-soft px-3 py-2 text-sm text-bad">
            {error}
          </p>
        ) : null}

        <dl className="space-y-1.5 rounded-card bg-surface-2 px-4 py-3 text-sm">
          <Row label="Gross" value={money(preview.subtotal)} />
          <Row
            label={`Less ${settings.taxLabel} (exempt)`}
            value={`-${money(round(preview.subtotal - preview.taxExempt))}`}
          />
          <Row
            label="Less 20 percent discount"
            value={`-${money(preview.statutoryDiscount)}`}
          />
          <div className="flex items-center justify-between border-t border-line pt-2 text-base font-semibold">
            <dt>Amount due</dt>
            <dd className="tnum">{money(preview.total)}</dd>
          </div>
          <p className="pt-1 text-xs text-muted">
            Without the discount this sale is {money(plain.total)}.
          </p>
        </dl>

        <p className="text-xs text-muted">
          The discount applies to the whole order. Ring up items for other
          customers separately.
        </p>
      </div>
    </Modal>
  );
}

function round(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="tnum text-ink">{value}</dd>
    </div>
  );
}
