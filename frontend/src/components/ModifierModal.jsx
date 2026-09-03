import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button, IconButton, Modal } from "./ui.jsx";
import { formatMoney } from "../lib/format.js";

/**
 * Required groups behave like a radio set (one choice, preselected).
 * Optional groups are free multi-select add-ons.
 */
export default function ModifierModal({ product, currency, onClose, onConfirm }) {
  const [qty, setQty] = useState(1);
  const [picked, setPicked] = useState(() => {
    const initial = {};
    for (const group of product.modifierGroups ?? []) {
      initial[group.id] = group.required ? [group.options[0]?.id] : [];
    }
    return initial;
  });

  const chosen = useMemo(() => {
    const out = [];
    for (const group of product.modifierGroups ?? []) {
      for (const optionId of picked[group.id] ?? []) {
        const option = group.options.find((o) => o.id === optionId);
        if (!option) continue;
        out.push({
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          price: option.price,
        });
      }
    }
    return out;
  }, [picked, product.modifierGroups]);

  const unitPrice =
    product.price + chosen.reduce((sum, m) => sum + Number(m.price || 0), 0);

  function toggle(group, optionId) {
    setPicked((prev) => {
      if (group.required) return { ...prev, [group.id]: [optionId] };
      const current = prev[group.id] ?? [];
      return {
        ...prev,
        [group.id]: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      };
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={product.name}
      subtitle={`Base price ${formatMoney(product.price, currency)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(chosen, qty)}>
            Add {qty} for {formatMoney(unitPrice * qty, currency)}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {(product.modifierGroups ?? []).map((group) => (
          <section key={group.id}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">{group.name}</h3>
              <span className="text-xs text-muted">
                {group.required ? "Pick one" : "Optional"}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.options.map((option) => {
                const active = (picked[group.id] ?? []).includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => toggle(group, option.id)}
                    className={`flex items-center justify-between gap-2 rounded-card border px-3 py-2.5 text-left text-sm transition-colors ${
                      active
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-line-strong bg-surface text-ink hover:bg-surface-2"
                    }`}
                  >
                    <span className="min-w-0 truncate">{option.name}</span>
                    {option.price ? (
                      <span className="tnum shrink-0 text-xs">
                        {option.price > 0 ? "+" : ""}
                        {formatMoney(option.price, currency)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <section className="flex items-center justify-between border-t border-line pt-4">
          <span className="text-sm font-medium text-ink">Quantity</span>
          <div className="flex items-center gap-2">
            <IconButton
              label="Decrease"
              className="border border-line-strong"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              <Minus className="size-4" />
            </IconButton>
            <span className="tnum w-8 text-center text-base font-semibold">
              {qty}
            </span>
            <IconButton
              label="Increase"
              className="border border-line-strong"
              onClick={() => setQty((q) => q + 1)}
            >
              <Plus className="size-4" />
            </IconButton>
          </div>
        </section>
      </div>
    </Modal>
  );
}
