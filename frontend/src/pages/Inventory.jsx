import { useMemo, useState } from "react";
import { Boxes, Search, TriangleAlert } from "lucide-react";
import { usePos } from "../store/context.js";
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  PageHeader,
  SearchInput,
} from "../components/ui.jsx";
import StockAdjustModal from "../components/StockAdjustModal.jsx";
import { formatMoney, formatDateTime, formatNumber } from "../lib/format.js";

const FILTERS = [
  { id: "all", label: "All tracked" },
  { id: "low", label: "Low stock" },
  { id: "out", label: "Out of stock" },
];

export default function Inventory() {
  const { dispatch, products, categoryById, stockMoves, productById, settings } =
    usePos();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [adjusting, setAdjusting] = useState(null);

  const money = (n) => formatMoney(n, settings.currency);
  const threshold = settings.lowStockThreshold;

  const tracked = useMemo(
    () => products.filter((p) => p.trackStock),
    [products],
  );

  const stats = useMemo(() => {
    const low = tracked.filter((p) => p.stock > 0 && p.stock <= threshold);
    const out = tracked.filter((p) => p.stock <= 0);
    const value = tracked.reduce((sum, p) => sum + p.stock * p.cost, 0);
    const retail = tracked.reduce((sum, p) => sum + p.stock * p.price, 0);
    return { low: low.length, out: out.length, value, retail };
  }, [tracked, threshold]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracked
      .filter((p) => {
        if (filter === "low") return p.stock > 0 && p.stock <= threshold;
        if (filter === "out") return p.stock <= 0;
        return true;
      })
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q),
      )
      .sort((a, b) => a.stock - b.stock);
  }, [tracked, filter, query, threshold]);

  return (
    <>
      <PageHeader
        title="Inventory"
        actions={FILTERS.map((f) => (
          <Chip
            key={f.id}
            active={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Chip>
        ))}
      >
        <SearchInput
          icon={Search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tracked items"
          className="max-w-sm"
        />
      </PageHeader>

      <div className="scroll-slim min-h-0 flex-1 overflow-auto p-4">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Tracked items" value={formatNumber(tracked.length)} />
          <Stat label="Low stock" value={formatNumber(stats.low)} tone="warn" />
          <Stat label="Out of stock" value={formatNumber(stats.out)} tone="bad" />
          <Stat
            label="Stock value at cost"
            value={money(stats.value)}
            hint={`${money(stats.retail)} at retail`}
          />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="Nothing to show"
            hint="Turn on stock tracking for a product in the Products screen."
          />
        ) : (
          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-2 text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right font-medium">On hand</th>
                  <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">
                    Value at cost
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((product) => {
                  const out = product.stock <= 0;
                  const low = !out && product.stock <= threshold;
                  return (
                    <tr key={product.id} className="hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{product.name}</p>
                        <p className="text-xs text-muted">{product.sku || "-"}</p>
                      </td>
                      <td className="hidden px-4 py-3 text-muted md:table-cell">
                        {categoryById[product.categoryId]?.name ?? "Uncategorized"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="tnum font-semibold text-ink">
                            {product.stock}
                          </span>
                          {out ? (
                            <Badge tone="bad">Out</Badge>
                          ) : low ? (
                            <Badge tone="warn">
                              <TriangleAlert className="size-3" />
                              Low
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="tnum hidden px-4 py-3 text-right text-muted sm:table-cell">
                        {money(product.stock * product.cost)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAdjusting(product)}
                        >
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-ink">Recent movements</h2>
          {stockMoves.length === 0 ? (
            <p className="text-sm text-muted">
              Sales, voids and manual adjustments will show up here.
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
              {stockMoves.slice(0, 25).map((move) => (
                <li
                  key={move.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {productById[move.productId]?.name ?? "Deleted product"}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDateTime(move.at)} - {move.reason}
                      {move.note ? ` - ${move.note}` : ""}
                    </p>
                  </div>
                  <span
                    className={`tnum shrink-0 font-semibold ${move.delta > 0 ? "text-good" : "text-bad"}`}
                  >
                    {move.delta > 0 ? "+" : ""}
                    {move.delta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {adjusting ? (
        <StockAdjustModal
          product={adjusting}
          onClose={() => setAdjusting(null)}
          onConfirm={({ delta, reason, note }) => {
            dispatch({
              type: "stock/adjust",
              productId: adjusting.id,
              delta,
              reason,
              note,
              at: new Date().toISOString(),
            });
            setAdjusting(null);
          }}
        />
      ) : null}
    </>
  );
}

function Stat({ label, value, hint, tone = "neutral" }) {
  const tones = {
    neutral: "text-ink",
    warn: "text-warn",
    bad: "text-bad",
    good: "text-good",
  };
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className={`tnum mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
