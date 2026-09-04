import { useState } from "react";
import { Printer, Wallet } from "lucide-react";
import { Button, Field, Input, Modal } from "./ui.jsx";
import { formatMoney, formatDateTime, formatTime } from "../lib/format.js";
import { tenderLabel } from "../lib/payments.js";
import { varianceLabel, varianceTone } from "../lib/shift.js";

/** Opening: the float that goes in the drawer before the first sale. */
export function OpenShiftModal({ settings, cashierName, onOpen, onClose }) {
  const [float, setFloat] = useState("1000");

  return (
    <Modal
      open
      onClose={onClose}
      title="Open a shift"
      subtitle={cashierName ? `Signed in as ${cashierName}` : undefined}
      width="max-w-sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onOpen(Number(float) || 0)}>Open shift</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-card bg-accent-soft px-3 py-2.5 text-sm text-accent">
          <Wallet className="mt-0.5 size-4 shrink-0" />
          <p>
            Count the float into the drawer first. Everything sold from now is
            counted against this shift, and against you.
          </p>
        </div>

        <Field label="Opening float" hint="The cash already in the drawer.">
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={float}
            onChange={(e) => setFloat(e.target.value)}
            className="tnum h-12 text-lg"
            autoFocus
          />
        </Field>

        <p className="text-xs text-muted">
          {formatMoney(Number(float) || 0, settings.currency)} going in.
        </p>
      </div>
    </Modal>
  );
}

/**
 * Closing is a blind count on purpose: the cashier enters what is in the
 * drawer before the till says what should be there. Showing the expected
 * figure first turns a count into a copying exercise, and a shortfall
 * nobody can see is a shortfall nobody investigates.
 */
export function CloseShiftModal({ shift, report, settings, onClose, onConfirm }) {
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [revealed, setRevealed] = useState(false);
  const money = (n) => formatMoney(n, settings.currency);

  const countedValue = Number(counted) || 0;
  const variance = countedValue - report.expectedCash;
  const tone = varianceTone(variance);
  const tones = {
    good: "bg-good-soft text-good",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Close the shift"
      subtitle={`Opened ${formatTime(shift.openedAt)} on ${shift.terminalCode}`}
      width="max-w-md"
      footer={
        revealed ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Back
            </Button>
            <Button
              variant="good"
              onClick={() =>
                onConfirm({
                  countedCash: countedValue,
                  expectedCash: report.expectedCash,
                  note: note.trim(),
                })
              }
            >
              Close the shift
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={counted === ""} onClick={() => setRevealed(true)}>
              Count is final
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        <Field
          label="Cash counted in the drawer"
          hint="Count it before moving on. The till shows what it expected after that."
        >
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={counted}
            disabled={revealed}
            onChange={(e) => setCounted(e.target.value)}
            className="tnum h-14 text-2xl"
            autoFocus
          />
        </Field>

        {revealed ? (
          <>
            <dl className="space-y-1.5 rounded-card bg-surface-2 px-4 py-3 text-sm">
              <Row label="Opening float" value={money(shift.openingFloat)} />
              <Row label="Cash sales" value={money(report.cashTaken)} />
              <Row label="Expected in drawer" value={money(report.expectedCash)} />
              <Row label="Counted" value={money(countedValue)} />
            </dl>

            <div
              className={`flex items-center justify-between rounded-card px-4 py-3 ${tones[tone]}`}
            >
              <span className="text-sm font-medium">{varianceLabel(variance)}</span>
              <span className="tnum text-xl font-bold">
                {money(Math.abs(variance))}
              </span>
            </div>

            {Math.abs(variance) >= 0.01 ? (
              <Field label="What happened" hint="Recorded against the shift.">
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Short by one 20, gave wrong change"
                  autoFocus
                />
              </Field>
            ) : null}

            <div className="rounded-card border border-line px-4 py-3 text-sm">
              <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
                Not in the drawer
              </p>
              {Object.entries(report.byMethod)
                .filter(([method]) => method !== "cash")
                .map(([method, value]) => (
                  <Row key={method} label={tenderLabel(method)} value={money(value)} />
                ))}
              {report.nonCash === 0 ? (
                <p className="text-muted">Nothing settled off the drawer.</p>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">
            {report.saleCount} sale{report.saleCount === 1 ? "" : "s"} on this
            shift. The expected figure stays hidden until the count is final.
          </p>
        )}
      </div>
    </Modal>
  );
}

/** The Z reading: what a manager takes away from a closed shift. */
export function ShiftReportModal({ shift, report, settings, onClose }) {
  const money = (n) => formatMoney(n, settings.currency);
  const variance = shift.variance ?? 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Shift on ${shift.terminalCode}`}
      subtitle={shift.cashier?.name ?? "Unattributed"}
      width="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      <div className="bg-surface-2 py-4">
        <div className="print-area mx-auto w-[76mm] bg-white px-3 py-4 font-mono text-[11px] leading-tight text-black shadow-sm">
          <div className="text-center">
            <p className="text-sm font-bold uppercase">{settings.storeName}</p>
            <p>SHIFT REPORT</p>
            <p>
              {shift.terminalCode} · {shift.cashier?.name ?? "Unattributed"}
            </p>
          </div>

          <Divider />
          <PlainRow label="Opened" value={formatDateTime(shift.openedAt)} />
          {shift.closedAt ? (
            <PlainRow label="Closed" value={formatDateTime(shift.closedAt)} />
          ) : null}
          <PlainRow label="Sales" value={String(report.saleCount)} />
          <PlainRow label="Items" value={String(report.items)} />

          <Divider />
          <PlainRow label="Gross" value={money(report.gross)} />
          <PlainRow label="Discounts" value={`-${money(report.discounts)}`} />
          {report.statutorySales ? (
            <PlainRow
              label={`Senior/PWD (${report.statutorySales})`}
              value={`-${money(report.statutoryDiscount)}`}
            />
          ) : null}
          <PlainRow label={settings.taxLabel} value={money(report.tax)} />
          <div className="mt-1 flex justify-between border-t border-dashed border-black pt-1 text-sm font-bold">
            <span>NET SALES</span>
            <span className="tnum">{money(report.total)}</span>
          </div>

          <Divider />
          <p className="font-bold">Taken by</p>
          {Object.entries(report.byMethod).map(([method, value]) => (
            <PlainRow key={method} label={tenderLabel(method)} value={money(value)} />
          ))}

          <Divider />
          <p className="font-bold">Drawer</p>
          <PlainRow label="Opening float" value={money(shift.openingFloat)} />
          <PlainRow label="Cash sales" value={money(report.cashTaken)} />
          <PlainRow label="Expected" value={money(report.expectedCash)} />
          {shift.status === "closed" ? (
            <>
              <PlainRow label="Counted" value={money(shift.countedCash)} />
              <div className="mt-1 flex justify-between border-t border-dashed border-black pt-1 font-bold">
                <span>{varianceLabel(variance).toUpperCase()}</span>
                <span className="tnum">{money(Math.abs(variance))}</span>
              </div>
              {shift.closingNote ? <p className="mt-1">{shift.closingNote}</p> : null}
            </>
          ) : (
            <p className="mt-1">Shift still open.</p>
          )}

          <Divider />
          <PlainRow label="Voided sales" value={String(report.voided)} />
          <PlainRow label="Voided value" value={money(report.voidedValue)} />

          <p className="mt-3 text-center">Signature: __________________</p>
        </div>
      </div>
    </Modal>
  );
}

function Divider() {
  return <div className="my-2 border-t border-dashed border-black" />;
}

function PlainRow({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="min-w-0 truncate">{label}</span>
      <span className="tnum shrink-0">{value}</span>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="tnum text-ink">{value}</dd>
    </div>
  );
}
