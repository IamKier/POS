import { Package, SlidersHorizontal } from "lucide-react";
import { EmptyState } from "./ui.jsx";
import { formatMoney } from "../lib/format.js";

export default function ProductGrid({
  products,
  categoryById,
  currency,
  lowStockThreshold,
  onPick,
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

        return (
          <button
            key={product.id}
            disabled={out}
            onClick={() => onPick(product)}
            className="group flex h-32 flex-col justify-between rounded-card border border-line bg-surface p-3 text-left transition-all hover:border-accent hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:shadow-none"
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className="mt-1 size-2.5 shrink-0 rounded-full"
                style={{ background: category?.color ?? "#d1d5db" }}
              />
              {product.modifierGroups?.length ? (
                <SlidersHorizontal className="size-3.5 shrink-0 text-muted" />
              ) : null}
            </div>

            <p className="line-clamp-3 text-sm font-medium text-ink">
              {product.name}
            </p>

            <div className="flex items-end justify-between gap-2">
              <span className="tnum text-sm font-semibold text-accent">
                {formatMoney(product.price, currency)}
              </span>
              {product.trackStock ? (
                <span
                  className={`tnum text-xs font-medium ${
                    out ? "text-bad" : low ? "text-warn" : "text-muted"
                  }`}
                >
                  {out ? "Out" : `${product.stock} left`}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
