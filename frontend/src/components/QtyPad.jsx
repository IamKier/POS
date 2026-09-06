import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Modal } from "./ui.jsx";
import { formatMoney } from "../lib/format.js";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Twelve of something is twelve taps on a plus button, or two on a
 * keypad. Tapping the quantity in the cart opens this.
 */
export default function QtyPad({ line, currency, onApply, onRemove, onClose }) {
  const [value, setValue] = useState("");
  const qty = value === "" ? line.qty : Number(value);
  const money = (n) => formatMoney(n, currency);

  return (
    <Modal
      open
      onClose={onClose}
      title={line.name}
      subtitle={`${money(line.unitPrice)} each`}
      width="max-w-xs"
      footer={
        <>
          <Button
            variant="ghost"
            className="mr-auto text-bad"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
            Remove
          </Button>
          <Button size="lg" disabled={qty < 1} onClick={() => onApply(qty)}>
            {money(line.unitPrice * Math.max(qty, 0))}
          </Button>
        </>
      }
    >
      <div>
        <div className="mb-4 rounded-sm bg-surface-2 py-5 text-center">
          <p className="tnum text-4xl font-semibold text-ink">{qty || 0}</p>
          <p className="mt-1 text-xs tracking-wide text-muted uppercase">
            Quantity
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((digit) => (
            <PadKey
              key={digit}
              onClick={() => setValue((v) => (v + digit).slice(0, 4))}
            >
              {digit}
            </PadKey>
          ))}
          <PadKey onClick={() => setValue("")}>C</PadKey>
          <PadKey onClick={() => setValue((v) => (v + "0").slice(0, 4))}>
            0
          </PadKey>
          <PadKey onClick={() => setValue((v) => v.slice(0, -1))}>←</PadKey>
        </div>
      </div>
    </Modal>
  );
}

function PadKey(props) {
  return (
    <button
      type="button"
      className="flex h-16 items-center justify-center rounded-sm border border-line bg-surface text-2xl font-medium text-ink transition-colors active:bg-surface-2"
      {...props}
    />
  );
}
