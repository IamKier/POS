import { RotateCcw, Trash2 } from "lucide-react";
import { usePos } from "../store/context.js";
import {
  Button,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
  Toggle,
} from "../components/ui.jsx";
import ImageField from "../components/ImageField.jsx";

const CURRENCIES = ["PHP", "USD", "EUR", "SGD"];

export default function Settings() {
  const { dispatch, settings, tabs, carts, terminal } = usePos();
  const save = (patch) => dispatch({ type: "settings/save", patch });

  return (
    <>
      <PageHeader title="Settings">
        <p className="truncate text-sm text-muted">
          Store details, tax rules and how the register behaves
        </p>
      </PageHeader>

      <div className="scroll-slim min-h-0 flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          <Section
            title="Store details"
            hint="These print at the top of every receipt."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Store name">
                <Input
                  value={settings.storeName}
                  onChange={(e) => save({ storeName: e.target.value })}
                />
              </Field>
              <Field label="Tax ID">
                <Input
                  value={settings.taxId}
                  onChange={(e) => save({ taxId: e.target.value })}
                />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Input
                  value={settings.address}
                  onChange={(e) => save({ address: e.target.value })}
                />
              </Field>
              <Field label="Receipt footer" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  value={settings.receiptFooter}
                  onChange={(e) => save({ receiptFooter: e.target.value })}
                />
              </Field>
            </div>
          </Section>

          <Section title="Money and tax">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Currency">
                <Select
                  value={settings.currency}
                  onChange={(e) => save({ currency: e.target.value })}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tax label">
                <Input
                  value={settings.taxLabel}
                  onChange={(e) => save({ taxLabel: e.target.value })}
                />
              </Field>
              <Field label="Tax rate (%)">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={(settings.taxRate * 100).toFixed(1)}
                  onChange={(e) =>
                    save({ taxRate: (Number(e.target.value) || 0) / 100 })
                  }
                  className="tnum"
                />
              </Field>
            </div>
            <div className="mt-4">
              <Toggle
                checked={settings.taxInclusive}
                onChange={(v) => save({ taxInclusive: v })}
                label="Prices already include tax"
              />
              <p className="mt-1 text-xs text-muted">
                On means the shelf price contains the tax and the receipt backs it
                out. Off means tax is added at checkout.
              </p>
            </div>
          </Section>

          <Section title="Service mode">
            <div className="grid gap-3 sm:grid-cols-2">
              <ModeCard
                active={settings.serviceMode === "retail"}
                onClick={() => save({ serviceMode: "retail" })}
                title="Retail"
                body="One running cart. Ring up, take payment, next customer."
              />
              <ModeCard
                active={settings.serviceMode === "tables"}
                onClick={() => save({ serviceMode: "tables" })}
                title="Tables and tabs"
                body="Several open orders at once, each held under a table or tab name."
              />
            </div>

            {settings.serviceMode === "tables" ? (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-medium text-ink">Open tabs</h3>
                <ul className="space-y-2">
                  {tabs.map((tab) => {
                    const count = (carts[tab.id]?.items ?? []).length;
                    return (
                      <li key={tab.id} className="flex items-center gap-2">
                        <Input
                          value={tab.name}
                          onChange={(e) =>
                            dispatch({
                              type: "tab/rename",
                              tabId: tab.id,
                              name: e.target.value,
                            })
                          }
                          className="h-9 flex-1"
                        />
                        <span className="w-24 shrink-0 text-xs text-muted">
                          {count ? `${count} lines open` : "empty"}
                        </span>
                        <button
                          onClick={() => {
                            if (count) {
                              window.alert(
                                "Clear or charge this tab before removing it.",
                              );
                              return;
                            }
                            dispatch({ type: "tab/remove", tabId: tab.id });
                          }}
                          className="rounded p-2 text-muted hover:text-bad"
                          aria-label={`Remove ${tab.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </Section>

          <Section
            title="Payment QR"
            hint="Shown to the customer at checkout for GCash, Maya and QR Ph."
          >
            <ImageField
              value={settings.paymentQr ?? ""}
              onChange={(paymentQr) => save({ paymentQr })}
              hint="A screenshot of your GCash, Maya or QR Ph code. It appears full size at checkout for the customer to scan."
              options={{ maxEdge: 700, quality: 0.85, maxBytes: 300 * 1024 }}
            />
            <p className="mt-4 text-xs text-muted">
              Nothing here talks to GCash or a bank. The customer scans, shows
              you their confirmation, and the cashier records the reference
              against the sale. Automatic confirmation needs a merchant account
              and a server to receive the webhook.
            </p>
          </Section>

          <Section
            title="Senior citizen and PWD discount"
            hint="The statutory 20 percent, with the sale made VAT exempt. Philippine retail needs this on."
          >
            <Toggle
              checked={settings.statutoryDiscount}
              onChange={(v) => save({ statutoryDiscount: v })}
              label="Offer the senior and PWD discount at the till"
            />
            {settings.statutoryDiscount ? (
              <Field
                label="Discount rate (%)"
                hint="20 by law. Change it only if the law does."
                className="mt-4 max-w-xs"
              >
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={((settings.statutoryRate ?? 0.2) * 100).toFixed(0)}
                  onChange={(e) =>
                    save({ statutoryRate: (Number(e.target.value) || 0) / 100 })
                  }
                  className="tnum"
                />
              </Field>
            ) : null}
          </Section>

          <Section
            title="Shifts and the drawer"
            hint="Who is accountable for the cash in front of them."
          >
            <Toggle
              checked={settings.requireShift !== false}
              onChange={(v) => save({ requireShift: v })}
              label="A shift must be open before selling"
            />
            <p className="mt-1 text-xs text-muted">
              On, the register asks for a counted float before it will sell, and
              every sale is attributed to that shift. Off, the till sells freely
              and the drawer is nobody's in particular.
            </p>
          </Section>

          <Section title="Inventory">
            <Field
              label="Low stock threshold"
              hint="Items at or below this count are flagged on the sell screen and in Inventory."
              className="max-w-xs"
            >
              <Input
                type="number"
                min="0"
                step="1"
                value={settings.lowStockThreshold}
                onChange={(e) =>
                  save({ lowStockThreshold: Number(e.target.value) || 0 })
                }
                className="tnum"
              />
            </Field>
          </Section>

          <Section
            title="This register"
            hint="Local to this device. It is not shared with the others."
          >
            <Field
              label="Terminal code"
              hint={`Every receipt from this device is numbered ${terminal?.code ?? "T"}-00001, ${terminal?.code ?? "T"}-00002 and so on. Give each register a different code (T1, T2, COUNTER1) so two of them can never issue the same receipt number, including while offline.`}
              className="max-w-xs"
            >
              <Input
                value={terminal?.code ?? ""}
                onChange={(e) =>
                  dispatch({
                    type: "terminal/setCode",
                    code: e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9-]/g, "")
                      .slice(0, 8),
                  })
                }
                className="font-mono tracking-wider"
              />
            </Field>
          </Section>

          <Section
            title="Data"
            hint="Everything lives in this browser. There is no server yet, so clearing site data clears the till."
          >
            <Button
              variant="danger"
              onClick={() => {
                const ok = window.confirm(
                  "Reset everything back to the demo catalog? Sales, stock and open carts are erased.",
                );
                if (ok) dispatch({ type: "state/reset" });
              }}
            >
              <RotateCcw className="size-4" />
              Reset demo data
            </Button>
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({ title, hint, children }) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {hint ? <p className="mt-0.5 mb-4 text-sm text-muted">{hint}</p> : <div className="mb-4" />}
      {children}
    </section>
  );
}

function ModeCard({ active, onClick, title, body }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-card border p-4 text-left transition-colors ${
        active
          ? "border-accent bg-accent-soft"
          : "border-line-strong bg-surface hover:bg-surface-2"
      }`}
    >
      <p className={`text-sm font-semibold ${active ? "text-accent" : "text-ink"}`}>
        {title}
      </p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </button>
  );
}
