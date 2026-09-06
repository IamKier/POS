import { Package, SlidersHorizontal } from "lucide-react";
import { EmptyState } from "./ui.jsx";
import { formatMoney } from "../lib/format.js";

/**
 * Product cards, sized for a finger on a counter rather than a cursor.
 * Nothing is smaller than about 9mm of glass and nothing important is
 * revealed by hovering, because a touchscreen never hovers.
 *
 * A photo is the fastest way to find an item on a busy screen, so it
 * gets the top two thirds of the card. Without one the card falls back
 * to the initials on the category colour, which still gives the eye
 * something to aim at instead of a wall of identical white boxes.
 */
export default function ProductGrid({
  products,
  categoryById,
  currency,
  lowStockThreshold,
  onPick,
  justAddedId,
}) {
  if (!products.length) {
    return (
      <EmptyState
        icon={Package}
        title="No products match"
        hint="Try another category, or clear the search box."
      />
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3">
      {products.map((product) => {
        const category = categoryById[product.categoryId];
        const out = product.trackStock && product.stock <= 0;
        const low =
          product.trackStock && !out && product.stock <= lowStockThreshold;
        /* A scan gives no sound and no movement, so the card it landed
           on confirms it. Without this the cashier scans twice. */
        const added = justAddedId === product.id;
        const color = category?.color ?? "#8a857c";

        return (
          <button
            key={product.id}
            disabled={out}
            onClick={() => onPick(product)}
            className={`group flex flex-col overflow-hidden rounded-2xl border bg-surface text-left transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
              added
                ? "border-accent-solid ring-2 ring-accent-solid/25"
                : "border-line"
            }`}
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
              {product.image ? (
                <img
                  src={product.image}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : (
                <span
                  className="flex size-full items-center justify-center text-2xl font-semibold text-white/95"
                  style={{ background: color }}
                >
                  {initials(product.name)}
                </span>
              )}

              {product.modifierGroups?.length ? (
                <span className="absolute top-2 right-2 rounded-lg bg-white/90 p-1.5">
                  <SlidersHorizontal className="size-3.5 text-ink" />
                </span>
              ) : null}

              {out ? (
                <span className="absolute inset-x-0 bottom-0 bg-bad px-2 py-1 text-center text-xs font-medium text-white">
                  Out of stock
                </span>
              ) : low ? (
                <span className="absolute right-2 bottom-2 rounded-lg bg-warn px-2 py-0.5 text-xs font-medium text-white">
                  {product.stock} left
                </span>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col justify-between gap-1 p-3">
              <p className="line-clamp-2 text-sm leading-snug font-medium text-ink">
                {product.name}
              </p>
              <div className="flex items-end justify-between gap-2">
                <span className="tnum text-[15px] font-semibold text-ink">
                  {formatMoney(product.price, currency)}
                </span>
                {product.trackStock && !out && !low ? (
                  <span className="tnum text-xs text-muted">
                    {product.stock}
                  </span>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function initials(name) {
  return String(name)
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();
}
