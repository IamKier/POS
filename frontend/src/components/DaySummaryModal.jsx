import { Printer } from "lucide-react";
import { Button, Modal } from "./ui.jsx";
import { formatMoney, formatDateTime } from "../lib/format.js";
import { tenderLabel } from "../lib/payments.js";

/** A cash-up sheet: what was sold, how it was paid, what was voided. */
export default function DaySummaryModal({ summary, settings, rangeLabel, onClose }) {
  const money = (n) => formatMoney(n, settings.currency);

  return (
    <Modal
      open
      onClose={onClose}
      title="Sales summary"
      subtitle={rangeLabel}
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
            <p>SALES SUMMARY</p>
            <p>{rangeLabel}</p>
            <p>Printed {formatDateTime(new Date().toISOString())}</p>
          </div>

          <Divider />
          <Row label="Transactions" value={String(summary.transactions)} />
          <Row label="Items sold" value={String(summary.items)} />
          <Row label="Average sale" value={money(summary.average)} />

          <Divider />
          <Row label="Gross sales" value={money(summary.gross)} />
          <Row label="Discounts" value={`-${money(summary.discounts)}`} />
          <Row
            label={`${settings.taxLabel}${settings.taxInclusive ? " included" : ""}`}
            value={money(summary.tax)}
          />
          {summary.statutorySales ? (
            <>
              <Row
                label={`Senior/PWD discount (${summary.statutorySales})`}
                value={`-${money(summary.statutoryDiscount)}`}
              />
              <Row
                label={`${settings.taxLabel}-exempt sales`}
                value={money(summary.vatExemptSales)}
              />
            </>
          ) : null}
          <div className="mt-1 flex justify-between border-t border-dashed border-black pt-1 text-sm font-bold">
            <span>NET SALES</span>
            <span className="tnum">{money(summary.total)}</span>
          </div>

          <Divider />
          <p className="font-bold">Payments</p>
          {Object.entries(summary.byMethod).length ? (
            Object.entries(summary.byMethod).map(([method, value]) => (
              <Row
                key={method}
                label={tenderLabel(method)}
                value={money(value)}
              />
            ))
          ) : (
            <p>No payments recorded.</p>
          )}

          <Divider />
          <p className="font-bold">By category</p>
          {summary.byCategory.length ? (
            summary.byCategory.map(([name, value]) => (
              <Row key={name} label={name} value={money(value)} />
            ))
          ) : (
            <p>Nothing sold.</p>
          )}

          {summary.topItems.length ? (
            <>
              <Divider />
              <p className="font-bold">Top items</p>
              {summary.topItems.map((item) => (
                <Row
                  key={item.name}
                  label={`${item.qty} x ${item.name}`}
                  value={money(item.value)}
                />
              ))}
            </>
          ) : null}

          <Divider />
          <Row label="Voided sales" value={String(summary.voided)} />
          <Row label="Voided value" value={money(summary.voidedValue)} />

          <p className="mt-3 text-center">Cashier copy</p>
        </div>
      </div>
    </Modal>
  );
}

function Divider() {
  return <div className="my-2 border-t border-dashed border-black" />;
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="min-w-0 truncate">{label}</span>
      <span className="tnum shrink-0">{value}</span>
    </div>
  );
}
