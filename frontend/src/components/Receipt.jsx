import { formatMoney, formatDateTime } from "../lib/format.js";

const METHOD_LABEL = {
  cash: "Cash",
  card: "Card",
  ewallet: "E-wallet",
};

/**
 * Rendered at 80mm width so what shows on screen is what a thermal
 * printer puts on the roll. The .print-area class is what the print
 * stylesheet keeps; everything else on the page is hidden.
 */
export default function Receipt({ sale, settings }) {
  const currency = settings.currency;
  const money = (n) => formatMoney(n, currency);

  return (
    <div className="print-area mx-auto w-[76mm] bg-white px-3 py-4 font-mono text-[11px] leading-tight text-black">
      <div className="text-center">
        <p className="text-sm font-bold tracking-wide uppercase">
          {settings.storeName}
        </p>
        {settings.address ? <p>{settings.address}</p> : null}
        {settings.taxId ? <p>{settings.taxId}</p> : null}
      </div>

      <Divider />

      <div className="flex justify-between">
        <span>{sale.number}</span>
        <span>{sale.tabName}</span>
      </div>
      <div>{formatDateTime(sale.at)}</div>
      {sale.cashier?.name ? <div>Cashier: {sale.cashier.name}</div> : null}
      {sale.status === "voided" ? (
        <>
          <p className="mt-1 text-center text-sm font-bold">*** VOIDED ***</p>
          {sale.voidedBy?.name ? (
            <p className="text-center text-[10px]">
              Approved by {sale.voidedBy.name}
            </p>
          ) : null}
        </>
      ) : null}

      <Divider />

      {sale.items.map((line) => (
        <div key={line.id} className="mb-1">
          <div className="flex justify-between gap-2">
            <span className="min-w-0 flex-1 truncate">{line.name}</span>
            <span className="tnum">{money(line.unitPrice * line.qty)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span>
              {line.qty} x {money(line.unitPrice)}
            </span>
          </div>
          {line.modifiers.map((m) => (
            <div key={m.optionId} className="pl-2 text-[10px]">
              + {m.optionName}
              {m.price ? ` (${money(m.price)})` : ""}
            </div>
          ))}
        </div>
      ))}

      <Divider />

      <Row label={`Subtotal (${sale.itemCount} items)`} value={money(sale.subtotal)} />
      {sale.discount > 0 ? (
        <Row
          label={sale.vatExempt ? "Less 20% discount" : "Discount"}
          value={`-${money(sale.discount)}`}
        />
      ) : null}
      {sale.vatExempt ? (
        <>
          <Row
            label={`${settings.taxLabel}-exempt sale`}
            value={money(sale.taxExempt)}
          />
          <Row label={`${settings.taxLabel}`} value={money(0)} />
        </>
      ) : settings.taxInclusive ? (
        <>
          <Row label={`${settings.taxLabel}able`} value={money(sale.taxable)} />
          <Row
            label={`${settings.taxLabel} included`}
            value={money(sale.tax)}
          />
        </>
      ) : (
        <Row label={settings.taxLabel} value={money(sale.tax)} />
      )}

      <div className="mt-1 flex justify-between border-t border-dashed border-black pt-1 text-sm font-bold">
        <span>TOTAL</span>
        <span className="tnum">{money(sale.total)}</span>
      </div>

      <Divider />

      <Row
        label={METHOD_LABEL[sale.payment.method] ?? sale.payment.method}
        value={money(sale.payment.tendered)}
      />
      {sale.payment.method === "cash" ? (
        <Row label="Change" value={money(sale.payment.change)} />
      ) : null}
      {sale.payment.reference ? (
        <Row label="Reference" value={sale.payment.reference} />
      ) : null}

      {sale.customer ? (
        <>
          <Divider />
          <p className="font-bold">
            {sale.customer.type === "pwd" ? "PWD" : "Senior citizen"} discount
          </p>
          <div>Name: {sale.customer.name}</div>
          <div>ID no: {sale.customer.idNumber}</div>
          <div className="mt-2">Signature: ____________________</div>
        </>
      ) : null}

      {sale.note ? <p className="mt-2">Note: {sale.note}</p> : null}

      <p className="mt-3 text-center">{settings.receiptFooter}</p>
      <p className="mt-1 text-center text-[10px]">
        This document is not an official receipt.
      </p>
    </div>
  );
}

function Divider() {
  return <div className="my-2 border-t border-dashed border-black" />;
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="tnum">{value}</span>
    </div>
  );
}
