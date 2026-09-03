import { useEffect, useState } from "react";
import {
  Boxes,
  Monitor,
  Moon,
  Package,
  ReceiptText,
  Settings as SettingsIcon,
  ShieldCheck,
  ShoppingCart,
  Store,
  Sun,
} from "lucide-react";
import PosProvider from "./store/PosProvider.jsx";
import { usePos } from "./store/context.js";
import Sell from "./pages/Sell.jsx";
import Products from "./pages/Products.jsx";
import Inventory from "./pages/Inventory.jsx";
import Sales from "./pages/Sales.jsx";
import Settings from "./pages/Settings.jsx";

/**
 * No router on purpose. The app is a handful of full-screen views and a
 * cashier never deep-links into one, so a single piece of state keeps
 * the URL free for whatever needs it later.
 *
 * The two groups are the whole access model for now: Register is what a
 * cashier touches, Admin is everything that changes the catalog, the
 * stock or the money settings. Locking Admin behind a real login is the
 * next step once there is a backend to authenticate against.
 */
const GROUPS = [
  {
    label: "Register",
    items: [{ id: "sell", label: "Sell", icon: ShoppingCart, Page: Sell }],
  },
  {
    label: "Admin",
    admin: true,
    items: [
      { id: "products", label: "Products", icon: Package, Page: Products },
      { id: "inventory", label: "Inventory", icon: Boxes, Page: Inventory },
      { id: "sales", label: "Sales", icon: ReceiptText, Page: Sales },
      { id: "settings", label: "Settings", icon: SettingsIcon, Page: Settings },
    ],
  },
];

const PAGES = GROUPS.flatMap((g) => g.items);

const THEMES = [
  { id: "system", label: "System theme", icon: Monitor },
  { id: "light", label: "Light theme", icon: Sun },
  { id: "dark", label: "Dark theme", icon: Moon },
];

function ThemeToggle() {
  const { dispatch, settings } = usePos();
  const index = Math.max(
    0,
    THEMES.findIndex((t) => t.id === (settings.theme ?? "system")),
  );
  const current = THEMES[index];
  const next = THEMES[(index + 1) % THEMES.length];
  const Icon = current.icon;

  /* The document element is an external system, so it is synced here
     rather than during render. */
  useEffect(() => {
    const root = document.documentElement;
    if (current.id === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", current.id);
  }, [current.id]);

  return (
    <button
      onClick={() => dispatch({ type: "settings/save", patch: { theme: next.id } })}
      title={`${current.label}. Switch to ${next.label.toLowerCase()}`}
      className="flex w-full items-center gap-3 rounded-card px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <Icon className="size-5 shrink-0" />
      <span className="hidden truncate lg:block">{current.label}</span>
    </button>
  );
}

function Shell() {
  const { settings } = usePos();
  const [page, setPage] = useState("sell");
  const current = PAGES.find((n) => n.id === page) ?? PAGES[0];
  const Page = current.Page;

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <nav className="no-print flex w-16 shrink-0 flex-col border-r border-line bg-surface lg:w-60">
        <div className="flex h-16 items-center gap-3 px-3 lg:px-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-card bg-accent-solid text-white shadow-card">
            <Store className="size-5" />
          </span>
          <span className="hidden min-w-0 lg:block">
            <span className="block truncate text-sm font-semibold text-ink">
              {settings.storeName}
            </span>
            <span className="block text-xs text-muted">Point of sale</span>
          </span>
        </div>

        <div className="scroll-slim flex-1 overflow-y-auto px-2 py-2 lg:px-3">
          {GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1 hidden items-center gap-1.5 px-3 text-[11px] font-semibold tracking-wider text-muted uppercase lg:flex">
                {group.admin ? <ShieldCheck className="size-3.5" /> : null}
                {group.label}
              </p>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.id === page;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setPage(item.id)}
                        title={item.label}
                        className={`flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-colors ${
                          active
                            ? "bg-accent-soft text-accent"
                            : "text-muted hover:bg-surface-2 hover:text-ink"
                        }`}
                      >
                        <Icon className="size-5 shrink-0" />
                        <span className="hidden lg:block">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-line p-2 lg:p-3">
          <ThemeToggle />
          <p className="mt-2 hidden px-3 pb-1 text-xs text-muted lg:block">
            Local data. Nothing leaves this browser yet.
          </p>
        </div>
      </nav>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Page />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <PosProvider>
      <Shell />
    </PosProvider>
  );
}
