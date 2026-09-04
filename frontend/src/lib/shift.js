import { round2 } from "./format.js";
import { summarize } from "./report.js";

/**
 * What the drawer should hold at the end of a shift.
 *
 * The float plus the cash that came in, minus the change that went back
 * out. Card and e-wallet takings are deliberately excluded: they never
 * touched the drawer, so holding a cashier accountable for them would
 * be counting money that was never in front of them.
 */
export function shiftReport(shift, sales, productById = {}, categoryById = {}) {
  const mine = sales.filter((s) => s.shiftId === shift.id);
  const summary = summarize(mine, productById, categoryById);

  const cashTaken = round2(summary.byMethod.cash ?? 0);
  const expectedCash = round2((shift.openingFloat ?? 0) + cashTaken);

  return {
    ...summary,
    cashTaken,
    expectedCash,
    /* Everything that settled somewhere other than the drawer. */
    nonCash: round2(
      Object.entries(summary.byMethod)
        .filter(([method]) => method !== "cash")
        .reduce((sum, [, value]) => sum + value, 0),
    ),
    saleCount: mine.length,
  };
}

export function activeShiftOf(state) {
  if (!state.activeShiftId) return null;
  return (
    state.shifts.find(
      (s) => s.id === state.activeShiftId && s.status === "open",
    ) ?? null
  );
}

export function varianceTone(variance) {
  if (Math.abs(variance) < 0.01) return "good";
  return variance > 0 ? "warn" : "bad";
}

export function varianceLabel(variance) {
  if (Math.abs(variance) < 0.01) return "Balanced";
  return variance > 0 ? "Over" : "Short";
}
