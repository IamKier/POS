import { useMemo, useState } from "react";
import { LayoutGrid, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { usePos } from "../store/context.js";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  SearchInput,
} from "../components/ui.jsx";
import ProductModal from "../components/ProductModal.jsx";
import CategoryModal from "../components/CategoryModal.jsx";
import { formatMoney } from "../lib/format.js";

export default function Products() {
  const { dispatch, products, categories, categoryById, settings } = usePos();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // product object, or "new"
  const [managingCategories, setManagingCategories] = useState(false);

  const money = (n) => formatMoney(n, settings.currency);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q),
    );
  }, [products, query]);

  const productCount = useMemo(() => {
    const counts = {};
    for (const p of products) {
      counts[p.categoryId] = (counts[p.categoryId] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  function remove(product) {
    const ok = window.confirm(
      `Delete "${product.name}"? Past sales keep their own copy of the item.`,
    );
    if (ok) dispatch({ type: "product/remove", productId: product.id });
  }

  return (
    <>
      <PageHeader
        title="Products"
        actions={
          <>
            <Button variant="outline" onClick={() => setManagingCategories(true)}>
              <LayoutGrid className="size-4" />
              <span className="hidden sm:inline">Categories</span>
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">New product</span>
            </Button>
          </>
        }
      >
        <SearchInput
          icon={Search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, SKU or barcode"
          className="max-w-sm"
        />
      </PageHeader>

      <div className="scroll-slim min-h-0 flex-1 overflow-auto p-4">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Products" value={products.length} />
          <Stat
            label="On the sell screen"
            value={products.filter((p) => p.active).length}
          />
          <Stat
            label="Stock tracked"
            value={products.filter((p) => p.trackStock).length}
          />
          <Stat label="Categories" value={categories.length} />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title={query ? "No products match" : "Nothing here yet"}
            hint={
              query
                ? "Clear the search box to see the whole catalog."
                : "Add your first product to start selling."
            }
            action={
              query ? null : (
                <Button onClick={() => setEditing("new")}>
                  <Plus className="size-4" />
                  New product
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-2 text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">SKU</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">
                    Cost
                  </th>
                  <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">
                    Margin
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((product) => {
                  const category = categoryById[product.categoryId];
                  const margin = product.price
                    ? ((product.price - product.cost) / product.price) * 100
                    : 0;
                  return (
                    <tr key={product.id} className="hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt=""
                              loading="lazy"
                              className="size-10 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <span
                              className="flex size-10 shrink-0 items-center justify-center rounded text-xs font-semibold text-white"
                              style={{ background: category?.color ?? "#8a857c" }}
                            >
                              {product.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-ink">{product.name}</p>
                            {product.modifierGroups?.length ? (
                              <p className="text-xs text-muted">
                                {product.modifierGroups.length} option group
                                {product.modifierGroups.length === 1 ? "" : "s"}
                              </p>
                            ) : null}
                          </div>
                          {!product.active ? (
                            <Badge tone="neutral">Hidden</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted sm:table-cell">
                        {product.sku || "-"}
                      </td>
                      <td className="hidden px-4 py-3 text-muted md:table-cell">
                        {category?.name ?? "Uncategorized"}
                      </td>
                      <td className="tnum px-4 py-3 text-right font-medium text-ink">
                        {money(product.price)}
                      </td>
                      <td className="tnum hidden px-4 py-3 text-right text-muted lg:table-cell">
                        {money(product.cost)}
                      </td>
                      <td className="tnum hidden px-4 py-3 text-right text-muted lg:table-cell">
                        {margin.toFixed(0)}%
                      </td>
                      <td className="tnum px-4 py-3 text-right">
                        {product.trackStock ? (
                          <span
                            className={
                              product.stock <= 0
                                ? "text-bad"
                                : product.stock <= settings.lowStockThreshold
                                  ? "text-warn"
                                  : "text-ink"
                            }
                          >
                            {product.stock}
                          </span>
                        ) : (
                          <span className="text-muted">Not tracked</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditing(product)}
                            className="flex items-center gap-1.5 rounded px-2 py-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil className="size-4" />
                            <span className="hidden text-xs font-medium lg:inline">
                              Edit
                            </span>
                          </button>
                          <button
                            onClick={() => remove(product)}
                            className="flex items-center gap-1.5 rounded px-2 py-1.5 text-muted transition-colors hover:bg-bad-soft hover:text-bad"
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 className="size-4" />
                            <span className="hidden text-xs font-medium lg:inline">
                              Delete
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing ? (
        <ProductModal
          product={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={(product) => {
            dispatch({ type: "product/save", product });
            setEditing(null);
          }}
        />
      ) : null}

      {managingCategories ? (
        <CategoryModal
          categories={categories}
          productCount={productCount}
          onClose={() => setManagingCategories(false)}
          onSave={(category) => dispatch({ type: "category/save", category })}
          onRemove={(categoryId) => {
            const ok = window.confirm(
              "Delete this category? Its products stay, without a category.",
            );
            if (ok) dispatch({ type: "category/remove", categoryId });
          }}
        />
      ) : null}
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className="tnum mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
