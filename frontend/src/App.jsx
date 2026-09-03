import { useState } from "react";
import {
  Boxes,
  Package,
  ReceiptText,
  Settings as SettingsIcon,
  ShoppingCart,
  Store,
} from "lucide-react";
import PosProvider from "./store/PosProvider.jsx";
import Sell from "./pages/Sell.jsx";
import Products from "./pages/Products.jsx";
import Inventory from "./pages/Inventory.jsx";
import Sales from "./pages/Sales.jsx";
import Settings from "./pages/Settings.jsx";

/**
 * No router on purpose. The app is a handful of full-screen views and a
 * cashier never deep-links into one, so a single piece of state keeps
 * the URL free for whatever needs it later.
 */
const NAV = [
  { id: "sell", label: "Sell", icon: ShoppingCart, Page: Sell },
  { id: "products", label: "Products", icon: Package, Page: Products },
  { id: "inventory", label: "Inventory", icon: Boxes, Page: Inventory },
  { id: "sales", label: "Sales", icon: ReceiptText, Page: Sales },
  { id: "settings", label: "Settings", icon: SettingsIcon, Page: Settings },
];

function Shell() {
  const [page, setPage] = useState("sell");
  const current = NAV.find((n) => n.id === page) ?? NAV[0];
  const Page = current.Page;

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <nav className="no-print flex w-16 shrink-0 flex-col border-r border-line bg-surface lg:w-56">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-card bg-accent text-white">
            <Store className="size-5" />
          </span>
          <span className="hidden text-sm font-semibold text-ink lg:block">
            Tindahan POS
          </span>
        </div>

        <ul className="flex flex-1 flex-col gap-1 px-2 py-2 lg:px-3">
          {NAV.map((item) => {
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

        <p className="hidden px-5 py-4 text-xs text-muted lg:block">
          Local demo data. Nothing leaves this browser.
        </p>
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
