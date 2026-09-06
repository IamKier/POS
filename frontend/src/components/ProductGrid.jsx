import { Package, SlidersHorizontal } from "lucide-react";
import { EmptyState } from "./ui.jsx";
import { formatMoney } from "../lib/format.js";

/**
 * Tiles are sized for a finger on a counter, not a cursor: nothing is
 * smaller than about 9mm of glass, and nothing important is revealed by
 * hovering, because a touchscreen never hovers.
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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3">
      {products.map((product) => {
        const category = categoryById[product.categoryId];
        const out = product.trackStock && product.stock <= 0;
        const low =
          product.trackStock && !out && product.stock <= lowStockThreshold;
        /* A scan gives no physical feedback, so the tile confirms it. */
        const added = justAddedId === product.id;

        return (
          <button
            key={product.id}
            disabled={out}
            onClick={() => onPick(product)}
            className={`group relative flex h-40 flex-col justify-between rounded-2xl border bg-surface p-4 text-left transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
              added
                ? "border-accent-solid ring-2 ring-accent-solid/25"
                : "border-line hover:border-line-strong"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ background: category?.color ?? "#dde0e7" }}
              />
              {product.modifierGroups?.length ? (
                <SlidersHorizontal className="size-4 shrink-0 text-muted" />
              ) : null}
            </div>

            <p className="line-clamp-3 text-[15px] leading-snug font-medium text-ink">
              {product.name}
            </p>

            <div className="flex items-end justify-between gap-2">
              <span className="tnum text-lg font-semibold text-ink">
                {formatMoney(product.price, currency)}
              </span>
              {product.trackStock ? (
                <span
                  className={`tnum text-xs font-medium ${
                    out ? "text-bad" : low ? "text-warn" : "text-muted"
                  }`}
                >
                  {out ? "Out" : product.stock}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
