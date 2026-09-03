import { useMemo, useState } from "react";
import { FileText, ReceiptText, TrendingUp } from "lucide-react";
import { usePos } from "../store/context.js";
import { Badge, Button, EmptyState } from "../components/ui.jsx";
import ReceiptModal from "../components/ReceiptModal.jsx";
import DaySummaryModal from "../components/DaySummaryModal.jsx";
import { summarize } from "../lib/report.js";
import {
  dayKey,
  formatMoney,
  formatNumber,
  formatTime,
  formatDate,
} from "../lib/format.js";

const RANGES = [
  { id: "today", label: "Today" },
  { id: "week", label: "Last 7 days" },
  { id: "all", label: "All time" },
];

const METHOD_LABEL = {
  cash: "Cash",
  card: "Card",
  ewallet: "E-wallet",
};

export default function Sales() {
  const { dispatch, sales, settings, productById, categoryById } = usePos();
  const [range, setRange] = useState("today");
  const [openSale, setOpenSale] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  /* The clock is read once when the screen opens, so the range boundary
     does not shift underneath a report the cashier is reading. */
  const [openedAt] = useState(() => Date.now());

  const money = (n) => formatMoney(n, settings.currency);

  const inRange = useMemo(() => {
    if (range === "all") return sales;
    if (range === "today") {
      const today = dayKey(openedAt);
      return sales.filter((s) => dayKey(s.at) === today);
    }
    const cutoff = openedAt - 7 * 24 * 60 * 60 * 1000;
    return sales.filter((s) => new Date(s.at).getTime() >= cutoff);
  }, [sales, range, openedAt]);

  const summary = useMemo(
    () => summarize(inRange, productById, categoryById),
    [inRange, productById, categoryById],
  );

  const rangeLabel =
    range === "today"
      ? formatDate(openedAt)
      : range === "week"
        ? "Last 7 days"
        : "All time";

  function voidSale(sale) {
    const reason = window.prompt(`Reason for voiding ${sale.number}`);
    if (reason === null) return;
    dispatch({
      type: "sale/void",
      saleId: sale.id,
      reason: reason.trim(),
      at: new Date().toISOString(),
    });
    setOpenSale(null);
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4">
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`rounded-pill px-3 py-1.5 text-sm font-medium transition-colors ${
                range === r.id
                  ? "bg-ink text-white"
                  : "bg-surface-2 text-muted hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          disabled={!inRange.length}
          onClick={() => setShowSummary(true)}
        >
          <FileText className="size-4" />
          <span className="hidden sm:inline">Summary</span>
        </Button>
      </header>

      <div className="scroll-slim min-h-0 flex-1 overflow-auto p-4">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Net sales" value={money(summary.total)} accent />
          <Stat label="Transactions" value={formatNumber(summary.transactions)} />
          <Stat label="Items sold" value={formatNumber(summary.items)} />
          <Stat label="Average sale" value={money(summary.average)} />
        </div>

        <div className="mb-4 grid gap-3 lg:grid-cols-2">
          <Panel title="Payment methods">
            {Object.keys(summary.byMethod).length ? (
              <ul className="divide-y divide-line">
                {Object.entries(summary.byMethod).map(([method, value]) => (
                  <Row
                    key={method}
                    label={METHOD_LABEL[method] ?? method}
                    value={money(value)}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm text-muted">No sales in this range.</p>
            )}
          </Panel>

          <Panel title="Top items">
            {summary.topItems.length ? (
              <ul className="divide-y divide-line">
                {summary.topItems.slice(0, 5).map((item) => (
                  <Row
                    key={item.name}
                    label={`${item.qty} x ${item.name}`}
                    value={money(item.value)}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm text-muted">Nothing sold yet.</p>
            )}
          </Panel>
        </div>

        {inRange.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No sales in this range"
            hint="Ring up an order on the Sell screen and it lands here."
          />
        ) : (
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-2 text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Receipt</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Time</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">
                    Order for
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Items</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {inRange.map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => setOpenSale(sale)}
                    className="cursor-pointer hover:bg-surface-2"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{sale.number}</span>
                        {sale.status === "voided" ? (
                          <Badge tone="bad">Voided</Badge>
                        ) : null}
                      </div>
                      <span className="text-xs text-muted sm:hidden">
                        {formatTime(sale.at)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-muted sm:table-cell">
                      {formatTime(sale.at)}
                    </td>
                    <td className="hidden px-4 py-3 text-muted md:table-cell">
                      {sale.tabName}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-muted">
                      {sale.itemCount}
                    </td>
                    <td className="hidden px-4 py-3 text-muted sm:table-cell">
                      {METHOD_LABEL[sale.payment.method] ?? sale.payment.method}
                    </td>
                    <td
                      className={`tnum px-4 py-3 text-right font-semibold ${
                        sale.status === "voided"
                          ? "text-muted line-through"
                          : "text-ink"
                      }`}
                    >
                      {money(sale.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openSale ? (
        <ReceiptModal
          sale={openSale}
          settings={settings}
          onClose={() => setOpenSale(null)}
          onVoid={() => voidSale(openSale)}
        />
      ) : null}

      {showSummary ? (
        <DaySummaryModal
          summary={summary}
          settings={settings}
          rangeLabel={rangeLabel}
          onClose={() => setShowSummary(false)}
        />
      ) : null}
    </>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div
      className={`rounded-card border px-4 py-3 ${
        accent ? "border-accent/30 bg-accent-soft" : "border-line bg-surface"
      }`}
    >
      <p
        className={`flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase ${
          accent ? "text-accent" : "text-muted"
        }`}
      >
        {accent ? <TrendingUp className="size-3.5" /> : null}
        {label}
      </p>
      <p
        className={`tnum mt-1 text-2xl font-bold ${accent ? "text-accent" : "text-ink"}`}
      >
        {value}
      </p>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface">
      <h2 className="border-b border-line bg-surface-2 px-4 py-2.5 text-xs font-medium tracking-wide text-muted uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
      <span className="min-w-0 truncate text-ink">{label}</span>
      <span className="tnum shrink-0 font-medium text-ink">{value}</span>
    </li>
  );
}
