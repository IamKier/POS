import { useState } from "react";
import { Minus, Plus, Undo2 } from "lucide-react";
import { Button, Field, Input, Modal, Select } from "./ui.jsx";
import { formatMoney, formatDate } from "../lib/format.js";
import { TENDERS } from "../lib/payments.js";
import { returnableLines } from "../lib/returns.js";

const REASONS = [
  "Wrong item",
  "Not as expected",
  "Damaged or spoiled",
  "Customer changed mind",
  "Duplicate charge",
];

/**
 * Picks what is coming back and how the money goes out. Only what has
 * not already been returned can be selected, so two partial returns
 * cannot together refund more than the customer paid.
 */
export default function ReturnModal({ sale, sales, settings, onClose, onConfirm }) {
  const rows = returnableLines(sale, sales);
  const [selections, setSelections] = useState({});
  const [refundMethod, setRefundMethod] = useState(
    sale.payment?.tenders?.[0]?.method ?? sale.payment?.method ?? "cash",
  );
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");

  const money = (n) => formatMoney(n, settings.currency);

  const selectedValue = rows.reduce(
    (sum, row) => sum + (selections[row.line.id] ?? 0) * row.line.unitPrice,
    0,
  );
  /* Refund at what was actually paid, not the shelf price: a discounted
     sale must not refund more than it took. */
  const share = sale.subtotal ? selectedValue / sale.subtotal : 0;
  const refund = Math.round(sale.total * share * 100) / 100;
  const anything = rows.some((row) => (selections[row.line.id] ?? 0) > 0);

  function setQty(lineId, qty, max) {
    setSelections((prev) => ({
      ...prev,
      [lineId]: Math.max(0, Math.min(qty, max)),
    }));
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Return against ${sale.number}`}
      subtitle={`Sold ${formatDate(sale.at)} by ${sale.cashier?.name ?? "unknown"}`}
      width="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!anything}
            onClick={() =>
              onConfirm({
                selections,
                refundMethod,
                reason: note.trim() ? `${reason}: ${note.trim()}` : reason,
              })
            }
          >
            <Undo2 className="size-4" />
            Refund {money(refund)}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line">
          {rows.map(({ line, remaining, returned }) => {
            const qty = selections[line.id] ?? 0;
            return (
              <li key={line.id} className="px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{line.name}</p>
                    {line.modifiers?.length ? (
                      <p className="text-xs text-muted">
                        {line.modifiers.map((m) => m.optionName).join(", ")}
                      </p>
                    ) : null}
                    <p className="tnum text-xs text-muted">
                      {money(line.unitPrice)} each, {line.qty} sold
                      {returned ? `, ${returned} already returned` : ""}
                    </p>
                  </div>

                  {remaining === 0 ? (
                    <span className="shrink-0 text-xs text-muted">
                      All returned
                    </span>
                  ) : (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => setQty(line.id, qty - 1, remaining)}
                        className="flex size-10 items-center justify-center rounded-sm border border-line text-ink active:bg-surface-2"
                        aria-label="One fewer"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="tnum w-8 text-center text-base font-semibold">
                        {qty}
                      </span>
                      <button
                        onClick={() => setQty(line.id, qty + 1, remaining)}
                        className="flex size-10 items-center justify-center rounded-sm border border-line text-ink active:bg-surface-2"
                        aria-label="One more"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reason">
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Refund by" hint="Cash comes out of the drawer.">
            <Select
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value)}
            >
              {TENDERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Note" hint="Optional. Kept on the return record.">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        <div className="flex items-center justify-between rounded-card bg-surface-2 px-4 py-3">
          <span className="text-sm text-muted">Refund total</span>
          <span className="tnum text-xl font-bold text-ink">{money(refund)}</span>
        </div>

        <p className="text-xs text-muted">
          The original sale is left as it was. This is recorded as its own
          transaction pointing back at {sale.number}, so the day it was sold
          keeps its takings and any shift that already balanced still balances.
        </p>
      </div>
    </Modal>
  );
}
