import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { usePos } from "../store/context.js";
import { Chip, PageHeader } from "../components/ui.jsx";
import { BarChart, Panel, RankedBars, StatTile } from "../components/charts.jsx";
import { tenderLabel } from "../lib/payments.js";
import { formatMoney, formatNumber } from "../lib/format.js";
import {
  busiestHour,
  categoryShare,
  dailySeries,
  hourlySeries,
  margin,
  salesInRange,
  tenderMix,
  topProducts,
} from "../lib/analytics.js";

const RANGES = [
  { id: "today", label: "Today", days: 1 },
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "all", label: "All time", days: 30 },
];

export default function Dashboard() {
  const { sales, settings, productById, categoryById } = usePos();
  const [range, setRange] = useState("7d");

  /* Read once on open, so the window does not shift under a report
     someone is reading. */
  const [openedAt] = useState(() => Date.now());

  const money = (n) => formatMoney(n, settings.currency);
  const days = RANGES.find((r) => r.id === range).days;

  const view = useMemo(() => {
    const inRange = salesInRange(sales, range, openedAt);
    return {
      sales: inRange,
      daily: dailySeries(inRange, days, openedAt),
      hourly: hourlySeries(inRange),
      products: topProducts(inRange),
      categories: categoryShare(inRange, productById, categoryById),
      tenders: tenderMix(inRange).map((t) => ({
        ...t,
        name: tenderLabel(t.id),
      })),
      profit: margin(inRange, productById),
    };
  }, [sales, range, days, openedAt, productById, categoryById]);

  /* An empty dashboard reads as a broken one, so say which it is. */
  const noSalesEver = !sales.some((s) => s.status === "completed");

  const count = view.sales.length;
  const items = view.sales.reduce((n, s) => n + s.itemCount, 0);
  const average = count ? view.profit.revenue / count : 0;
  const peak = busiestHour(view.hourly);

  return (
    <>
      <PageHeader title="Dashboard">
        {RANGES.map((r) => (
          <Chip key={r.id} active={range === r.id} onClick={() => setRange(r.id)}>
            {r.label}
          </Chip>
        ))}
      </PageHeader>

      <div className="scroll-slim min-h-0 flex-1 overflow-auto p-4">
        {noSalesEver ? (
          <div className="mx-auto max-w-md py-16 text-center">
            <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent-soft">
              <BarChart3 className="size-7 text-accent" />
            </span>
            <h2 className="text-base font-semibold text-ink">
              Nothing has been sold yet
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              Every chart here is built from real sales, so it fills in the
              moment the register takes its first one. Open the register, ring
              something up, and come back.
            </p>
          </div>
        ) : null}

        <div
          className={`mx-auto max-w-6xl space-y-4 ${noSalesEver ? "hidden" : ""}`}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Net sales"
              value={money(view.profit.revenue)}
              hint={`${formatNumber(count)} sale${count === 1 ? "" : "s"}`}
              tone="accent"
            />
            <StatTile
              label="Gross profit"
              value={money(view.profit.profit)}
              hint={`${view.profit.percent}% margin, cost ${money(view.profit.cost)}`}
              tone={view.profit.profit >= 0 ? "good" : "bad"}
            />
            <StatTile label="Average sale" value={money(average)} />
            <StatTile
              label="Items sold"
              value={formatNumber(items)}
              hint={peak ? `Busiest at ${peak.key}:00` : undefined}
            />
          </div>

          <Panel
            title="Sales by day"
            hint={
              range === "today"
                ? "Today only. Pick a longer range to see a trend."
                : `The last ${days} days.`
            }
          >
            <BarChart
              data={view.daily}
              format={money}
              emptyLabel="No sales in this range yet"
            />
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Busiest hours"
              hint="Where a second person on the counter would pay for itself."
            >
              <BarChart
                data={view.hourly}
                format={money}
                height={140}
                emptyLabel="No sales in this range yet"
              />
            </Panel>

            <Panel title="Top products" hint="By takings, not by count.">
              <RankedBars rows={view.products} format={money} />
            </Panel>

            <Panel title="Sales by category">
              <RankedBars rows={view.categories} format={money} />
            </Panel>

            <Panel
              title="How people paid"
              hint="Split payments count as their parts."
            >
              <RankedBars rows={view.tenders} format={money} />
            </Panel>
          </div>

          <p className="px-1 pb-2 text-xs text-muted">
            Profit is estimated against each product&apos;s cost as it stands
            today, so a supplier price change re-values older sales. Good enough
            to steer by, not to file.
          </p>
        </div>
      </div>
    </>
  );
}
