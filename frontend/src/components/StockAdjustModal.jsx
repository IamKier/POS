import { useState } from "react";
import { Button, Field, Input, Modal, Select } from "./ui.jsx";

const MODES = [
  { id: "add", label: "Receive" },
  { id: "remove", label: "Remove" },
  { id: "set", label: "Set count" },
];

const REASONS = {
  add: ["delivery", "return", "transfer in", "correction"],
  remove: ["damaged", "expired", "internal use", "transfer out", "correction"],
  set: ["physical count", "correction"],
};

export default function StockAdjustModal({ product, onClose, onConfirm }) {
  const [mode, setMode] = useState("add");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("delivery");
  const [note, setNote] = useState("");

  const amount = Number(qty) || 0;
  const delta =
    mode === "add" ? amount : mode === "remove" ? -amount : amount - product.stock;
  const resulting = product.stock + delta;

  function pickMode(next) {
    setMode(next);
    setReason(REASONS[next][0]);
    if (next === "set") setQty(String(product.stock));
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Adjust stock: ${product.name}`}
      subtitle={`${product.stock} on hand right now`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={delta === 0 || resulting < 0}
            onClick={() => onConfirm({ delta, reason, note: note.trim() })}
          >
            Save adjustment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => pickMode(m.id)}
              className={`rounded-card border px-3 py-2.5 text-sm font-medium transition-colors ${
                mode === m.id
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line-strong bg-surface text-muted hover:bg-surface-2"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <Field label={mode === "set" ? "Counted quantity" : "Quantity"}>
          <Input
            type="number"
            min="0"
            step="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="tnum h-12 text-lg"
            autoFocus
          />
        </Field>

        <Field label="Reason">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS[mode].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Note" hint="Delivery receipt number, who counted, and so on.">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        <div
          className={`flex items-center justify-between rounded-card px-4 py-3 text-sm ${
            resulting < 0 ? "bg-bad-soft text-bad" : "bg-surface-2 text-ink"
          }`}
        >
          <span className="font-medium">
            {resulting < 0 ? "That would go below zero" : "New quantity on hand"}
          </span>
          <span className="tnum text-xl font-bold">{resulting}</span>
        </div>
      </div>
    </Modal>
  );
}
