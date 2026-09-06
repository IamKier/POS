import { useEffect, useState } from "react";
import { Camera, Plus, Trash2 } from "lucide-react";
import { Button, Field, Input, Modal, Select, Toggle } from "./ui.jsx";
import { uid } from "../lib/format.js";
import ScannerModal from "./ScannerModal.jsx";
import { cameraSupported } from "../lib/scanner.js";
import { listenForScans } from "../lib/hardwareScanner.js";
import ImageField from "./ImageField.jsx";

const BLANK = {
  name: "",
  image: "",
  sku: "",
  barcode: "",
  categoryId: "",
  price: "",
  cost: "",
  trackStock: true,
  stock: 0,
  active: true,
  modifierGroups: [],
};

export default function ProductModal({ product, categories, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...BLANK,
    ...(product ?? {}),
    categoryId: product?.categoryId ?? categories[0]?.id ?? "",
    modifierGroups: structuredClone(product?.modifierGroups ?? []),
  }));
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  /* Building a catalog means typing hundreds of 13-digit numbers, or
     pulling the trigger on a scanner while this form is open. */
  useEffect(() => {
    if (scanning) return undefined;
    return listenForScans({
      onScan: (barcode) => setForm((f) => ({ ...f, barcode })),
    });
  }, [scanning]);

  function updateGroup(groupId, patch) {
    set({
      modifierGroups: form.modifierGroups.map((g) =>
        g.id === groupId ? { ...g, ...patch } : g,
      ),
    });
  }

  function updateOption(groupId, optionId, patch) {
    set({
      modifierGroups: form.modifierGroups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              options: g.options.map((o) =>
                o.id === optionId ? { ...o, ...patch } : o,
              ),
            }
          : g,
      ),
    });
  }

  function submit() {
    if (!form.name.trim()) {
      setError("A product needs a name.");
      return;
    }
    if (form.price === "" || Number(form.price) < 0) {
      setError("Enter a selling price of zero or more.");
      return;
    }
    const clean = form.modifierGroups
      .filter((g) => g.name.trim() && g.options.length)
      .map((g) => ({
        ...g,
        name: g.name.trim(),
        options: g.options
          .filter((o) => o.name.trim())
          .map((o) => ({ ...o, name: o.name.trim(), price: Number(o.price) || 0 })),
      }));

    onSave({
      ...form,
      image: form.image ?? "",
      id: product?.id ?? uid("prd"),
      name: form.name.trim(),
      sku: form.sku.trim(),
      barcode: form.barcode.trim(),
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      stock: form.trackStock ? Number(form.stock) || 0 : 0,
      modifierGroups: clean,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={product ? "Edit product" : "New product"}
      subtitle={product?.sku || undefined}
      width="max-w-2xl"
      footer={
        <>
          {error ? (
            <span className="mr-auto text-sm text-bad">{error}</span>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Save product</Button>
        </>
      }
    >
      <div className="space-y-4">
        <ImageField
          value={form.image}
          onChange={(image) => set({ image })}
          hint="Shown on the card at the till. A photo is the fastest way to find something on a busy screen."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. Cafe Latte"
              autoFocus
            />
          </Field>

          <Field label="Category">
            <Select
              value={form.categoryId ?? ""}
              onChange={(e) => set({ categoryId: e.target.value })}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Selling price">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => set({ price: e.target.value })}
              className="tnum"
            />
          </Field>

          <Field label="Cost" hint="Used for the margin column.">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.cost}
              onChange={(e) => set({ cost: e.target.value })}
              className="tnum"
            />
          </Field>

          <Field label="SKU">
            <Input
              value={form.sku}
              onChange={(e) => set({ sku: e.target.value })}
              placeholder="DRK-001"
            />
          </Field>

          <Field
            label="Barcode"
            className="sm:col-span-2"
            hint="Pull the trigger on a USB or Bluetooth scanner and it lands here."
          >
            <div className="flex items-center gap-2">
              <Input
                value={form.barcode}
                onChange={(e) => set({ barcode: e.target.value })}
                placeholder="4800000000011"
                className="font-mono"
              />
              {cameraSupported() ? (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => setScanning(true)}
                >
                  <Camera className="size-4" />
                  <span className="hidden sm:inline">Scan</span>
                </Button>
              ) : null}
            </div>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-6 rounded-card bg-surface-2 px-4 py-3">
          <Toggle
            checked={form.trackStock}
            onChange={(v) => set({ trackStock: v })}
            label="Track stock"
          />
          {form.trackStock ? (
            <label className="flex items-center gap-2 text-sm text-ink">
              On hand
              <Input
                type="number"
                step="1"
                value={form.stock}
                onChange={(e) => set({ stock: e.target.value })}
                className="tnum h-8 w-24"
              />
            </label>
          ) : null}
          <Toggle
            checked={form.active}
            onChange={(v) => set({ active: v })}
            label="Available on the sell screen"
          />
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Option groups</h3>
              <p className="text-xs text-muted">
                Sizes, add-ons, anything that changes the price at the till.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                set({
                  modifierGroups: [
                    ...form.modifierGroups,
                    {
                      id: uid("grp"),
                      name: "",
                      required: true,
                      options: [{ id: uid("opt"), name: "", price: 0 }],
                    },
                  ],
                })
              }
            >
              <Plus className="size-4" />
              Add group
            </Button>
          </div>

          <div className="space-y-3">
            {form.modifierGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-card border border-line bg-surface-2 p-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={group.name}
                    onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                    placeholder="Group name, e.g. Size"
                    className="h-8 flex-1"
                  />
                  <Toggle
                    checked={group.required}
                    onChange={(v) => updateGroup(group.id, { required: v })}
                    label="Required"
                  />
                  <button
                    onClick={() =>
                      set({
                        modifierGroups: form.modifierGroups.filter(
                          (g) => g.id !== group.id,
                        ),
                      })
                    }
                    className="rounded-sm p-1.5 text-muted hover:text-bad"
                    aria-label="Remove group"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {group.options.map((option) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <Input
                        value={option.name}
                        onChange={(e) =>
                          updateOption(group.id, option.id, {
                            name: e.target.value,
                          })
                        }
                        placeholder="Option name"
                        className="h-8 flex-1"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={option.price}
                        onChange={(e) =>
                          updateOption(group.id, option.id, {
                            price: e.target.value,
                          })
                        }
                        className="tnum h-8 w-28"
                      />
                      <button
                        onClick={() =>
                          updateGroup(group.id, {
                            options: group.options.filter(
                              (o) => o.id !== option.id,
                            ),
                          })
                        }
                        className="rounded-sm p-1.5 text-muted hover:text-bad"
                        aria-label="Remove option"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      updateGroup(group.id, {
                        options: [
                          ...group.options,
                          { id: uid("opt"), name: "", price: 0 },
                        ],
                      })
                    }
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Add option
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {scanning ? (
        <ScannerModal
          title="Scan the barcode"
          subtitle="Point at the code on the packaging"
          onScan={(barcode) => {
            set({ barcode });
            setScanning(false);
          }}
          onClose={() => setScanning(false)}
        />
      ) : null}
    </Modal>
  );
}
