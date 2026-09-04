import { useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { usePos } from "../store/context.js";
import { useAuth } from "../auth/context.js";
import { Badge, Button, EmptyState, PageHeader } from "../components/ui.jsx";
import { CloseShiftModal, ShiftReportModal } from "../components/ShiftModal.jsx";
import { shiftReport, varianceLabel, varianceTone } from "../lib/shift.js";
import { formatDateTime, formatMoney, formatTime } from "../lib/format.js";

export default function Shifts() {
  const {
    dispatch,
    shifts,
    sales,
    settings,
    productById,
    categoryById,
  } = usePos();
  const { user, profile } = useAuth();
  const [closing, setClosing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const money = (n) => formatMoney(n, settings.currency);

  const rows = useMemo(
    () =>
      shifts.map((shift) => ({
        shift,
        report: shiftReport(shift, sales, productById, categoryById),
      })),
    [shifts, sales, productById, categoryById],
  );

  const open = rows.filter((r) => r.shift.status === "open");

  return (
    <>
      <PageHeader title="Shifts">
        <p className="truncate text-sm text-muted">
          Who had the drawer, and whether it balanced
        </p>
      </PageHeader>

      <div className="scroll-slim min-h-0 flex-1 overflow-auto p-4">
        {open.length ? (
          <div className="mb-4 space-y-3">
            {open.map(({ shift, report }) => (
              <div
                key={shift.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-accent/30 bg-accent-soft px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-accent">
                    {shift.terminalCode} open since {formatTime(shift.openedAt)}
                  </p>
                  <p className="text-sm text-accent/80">
                    {shift.cashier?.name ?? "Unattributed"} · {report.saleCount}{" "}
                    sale{report.saleCount === 1 ? "" : "s"} · {money(report.total)}
                  </p>
                </div>
                <Button onClick={() => setClosing({ shift, report })}>
                  Close shift
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No shifts yet"
            hint="A shift opens with a counted float and closes with a counted drawer."
          />
        ) : (
          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-2 text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Opened</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">
                    Cashier
                  </th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">
                    Register
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Net sales</th>
                  <th className="px-4 py-3 text-right font-medium">Drawer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ shift, report }) => {
                  const variance = shift.variance ?? 0;
                  const tone = varianceTone(variance);
                  return (
                    <tr
                      key={shift.id}
                      onClick={() => setViewing({ shift, report })}
                      className="cursor-pointer hover:bg-surface-2"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">
                          {formatDateTime(shift.openedAt)}
                        </p>
                        <p className="text-xs text-muted sm:hidden">
                          {shift.cashier?.name ?? "Unattributed"}
                        </p>
                      </td>
                      <td className="hidden px-4 py-3 text-muted sm:table-cell">
                        {shift.cashier?.name ?? "Unattributed"}
                      </td>
                      <td className="hidden px-4 py-3 font-mono text-muted md:table-cell">
                        {shift.terminalCode}
                      </td>
                      <td className="tnum px-4 py-3 text-right font-medium text-ink">
                        {money(report.total)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {shift.status === "open" ? (
                          <Badge tone="accent">Open</Badge>
                        ) : Math.abs(variance) < 0.01 ? (
                          <Badge tone="good">Balanced</Badge>
                        ) : (
                          <Badge tone={tone}>
                            {varianceLabel(variance)} {money(Math.abs(variance))}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {closing ? (
        <CloseShiftModal
          shift={closing.shift}
          report={closing.report}
          settings={settings}
          onClose={() => setClosing(null)}
          onConfirm={({ countedCash, expectedCash, note }) => {
            dispatch({
              type: "shift/close",
              shiftId: closing.shift.id,
              at: new Date().toISOString(),
              countedCash,
              expectedCash,
              note,
              totals: {
                net: closing.report.total,
                byMethod: closing.report.byMethod,
                sales: closing.report.saleCount,
                closedBy: user
                  ? { uid: user.uid, name: profile?.name ?? user.uid }
                  : null,
              },
            });
            setClosing(null);
            /* Straight into the reading, which is what gets signed. */
            setViewing({
              shift: {
                ...closing.shift,
                status: "closed",
                closedAt: new Date().toISOString(),
                countedCash,
                expectedCash,
                variance: countedCash - expectedCash,
                closingNote: note,
              },
              report: closing.report,
            });
          }}
        />
      ) : null}

      {viewing ? (
        <ShiftReportModal
          shift={viewing.shift}
          report={viewing.report}
          settings={settings}
          onClose={() => setViewing(null)}
        />
      ) : null}
    </>
  );
}
