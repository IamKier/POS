import { dayKey, round2 } from "./format.js";

/**
 * Analytics for a shop owner, which means questions with a decision
 * behind them: when am I busy, what actually sells, what do I make on
 * it. Everything works off the sales already in state, so it is as
 * available offline as the till is.
 */

export function salesInRange(sales, range, now) {
  const completed = sales.filter((s) => s.status === "completed");
  if (range === "all") return completed;

  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  if (range === "today") {
    const today = dayKey(now);
    return completed.filter((s) => dayKey(s.at) === today);
  }
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return completed.filter((s) => new Date(s.at).getTime() >= cutoff);
}

/** One point per calendar day, including the days that sold nothing. */
export function dailySeries(sales, days, now) {
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(dayKey(now - i * 24 * 60 * 60 * 1000), 0);
  }
  for (const sale of sales) {
    const key = dayKey(sale.at);
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + sale.total);
  }
  return [...buckets.entries()].map(([key, value]) => ({
    key,
    label: key.slice(5),
    value: round2(value),
  }));
}

/**
 * Takings by hour of the day. A shop reads this to decide when to put a
 * second person on, so empty hours have to stay in the series: a gap at
 * 3pm is the finding.
 */
export function hourlySeries(sales) {
  const hours = Array.from({ length: 24 }, () => 0);
  for (const sale of sales) hours[new Date(sale.at).getHours()] += sale.total;
  return hours.map((value, hour) => ({
    key: String(hour),
    label: hour % 3 === 0 ? `${hour}` : "",
    value: round2(value),
  }));
}

export function topProducts(sales, limit = 6) {
  const byProduct = new Map();
  for (const sale of sales) {
    for (const line of sale.items) {
      const entry = byProduct.get(line.productId) ?? {
        id: line.productId,
        name: line.name,
        qty: 0,
        value: 0,
      };
      entry.qty += line.qty;
      entry.value = round2(entry.value + line.unitPrice * line.qty);
      byProduct.set(line.productId, entry);
    }
  }
  return [...byProduct.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function categoryShare(sales, productById, categoryById) {
  const byCategory = new Map();
  for (const sale of sales) {
    for (const line of sale.items) {
      const category = categoryById[productById[line.productId]?.categoryId];
      const key = category?.id ?? "none";
      const entry = byCategory.get(key) ?? {
        id: key,
        name: category?.name ?? "Uncategorized",
        color: category?.color ?? "#98a2b3",
        value: 0,
      };
      entry.value = round2(entry.value + line.unitPrice * line.qty);
      byCategory.set(key, entry);
    }
  }
  return [...byCategory.values()].sort((a, b) => b.value - a.value);
}

export function tenderMix(sales) {
  const byTender = new Map();
  for (const sale of sales) {
    const tenders = sale.payment.tenders ?? [
      { method: sale.payment.method, amount: sale.total },
    ];
    for (const tender of tenders) {
      byTender.set(
        tender.method,
        round2((byTender.get(tender.method) ?? 0) + (Number(tender.amount) || 0)),
      );
    }
  }
  return [...byTender.entries()]
    .map(([method, value]) => ({ id: method, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * What the shop actually made, not what it took. Cost comes from the
 * product record as it stands today, so this is an estimate rather than
 * a historical cost of goods: if a price of a supplier changed last
 * month, older sales are valued at the new cost. Good enough to steer
 * by, not good enough to file.
 */
export function margin(sales, productById) {
  let revenue = 0;
  let cost = 0;
  for (const sale of sales) {
    revenue += sale.total;
    for (const line of sale.items) {
      cost += (productById[line.productId]?.cost ?? 0) * line.qty;
    }
  }
  const profit = round2(revenue - cost);
  return {
    revenue: round2(revenue),
    cost: round2(cost),
    profit,
    percent: revenue ? round2((profit / revenue) * 100) : 0,
  };
}

export function busiestHour(hours) {
  let best = null;
  for (const point of hours) {
    if (!best || point.value > best.value) best = point;
  }
  return best && best.value > 0 ? best : null;
}
