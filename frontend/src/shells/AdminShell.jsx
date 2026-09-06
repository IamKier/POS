import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  LogOut,
  Package,
  ReceiptText,
  Settings as SettingsIcon,
  ShoppingCart,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { usePos } from "../store/context.js";
import { useAuth } from "../auth/context.js";
import { signOutNow } from "../auth/authService.js";
import { subscribeStatus } from "../data/cloudSync.js";
import Dashboard from "../pages/Dashboard.jsx";
import Products from "../pages/Products.jsx";
import Inventory from "../pages/Inventory.jsx";
import Sales from "../pages/Sales.jsx";
import Shifts from "../pages/Shifts.jsx";
import Staff from "../pages/Staff.jsx";
import Settings from "../pages/Settings.jsx";

/**
 * The back office. Everything a manager does and a cashier never
 * touches, behind its own shell so the register stays a register.
 */
const PAGES = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, Page: Dashboard },
  { id: "products", label: "Products", icon: Package, Page: Products },
  { id: "inventory", label: "Inventory", icon: Boxes, Page: Inventory },
  { id: "sales", label: "Sales", icon: ReceiptText, Page: Sales },
  { id: "shifts", label: "Shifts", icon: Wallet, Page: Shifts },
  { id: "staff", label: "Staff", icon: Users, Page: Staff },
  { id: "settings", label: "Settings", icon: SettingsIcon, Page: Settings },
];

export default function AdminShell({ onOpenRegister }) {
  const { settings } = usePos();
  const { profile, requiresAuth } = useAuth();
  const [page, setPage] = useState("dashboard");
  const current = PAGES.find((p) => p.id === page) ?? PAGES[0];
  const Page = current.Page;

  return (
    <div className="flex h-screen overflow-hidden bg-surface-2">
      <nav className="no-print flex w-16 shrink-0 flex-col border-r border-line bg-surface lg:w-60">
        <div className="flex h-16 items-center gap-3 px-3 lg:px-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-accent-solid text-white">
            <Store className="size-5" />
          </span>
          <span className="hidden min-w-0 lg:block">
            <span className="block truncate text-sm font-semibold text-ink">
              {settings.storeName}
            </span>
            <span className="block text-xs font-medium tracking-wide text-muted uppercase">
              Back office
            </span>
          </span>
        </div>

        <div className="scroll-slim flex-1 overflow-y-auto px-2 py-2 lg:px-3">
          <ul className="flex flex-col gap-1">
            {PAGES.map((item) => {
              const Icon = item.icon;
              const active = item.id === page;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setPage(item.id)}
                    title={item.label}
                    className={`flex w-full items-center gap-3 rounded-sm px-3 py-3 text-sm font-medium transition-colors ${
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

        <div className="border-t border-line p-2 lg:p-3">
          <button
            onClick={onOpenRegister}
            className="mb-1 flex w-full items-center gap-3 rounded-sm bg-accent-solid px-3 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <ShoppingCart className="size-5 shrink-0" />
            <span className="hidden lg:block">Open the register</span>
          </button>

          <ConnectionBadge />

          {requiresAuth ? (
            <button
              onClick={() => signOutNow()}
              className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <LogOut className="size-5 shrink-0" />
              <span className="hidden truncate lg:block">
                Sign out{profile?.name ? `, ${profile.name}` : ""}
              </span>
            </button>
          ) : null}
        </div>
      </nav>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Page />
      </main>
    </div>
  );
}

function ConnectionBadge() {
  const [online, setOnline] = useState(true);
  const [status, setStatus] = useState("off");

  useEffect(() => {
    const update = () => setOnline(window.navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => subscribeStatus(setStatus), []);

  if (status === "off") return null;

  const state = !online
    ? { tone: "text-warn", label: "Offline, sales queued" }
    : status === "error"
      ? { tone: "text-bad", label: "Cloud unreachable" }
      : status === "synced"
        ? { tone: "text-muted", label: "Cloud sync on" }
        : { tone: "text-muted", label: "Connecting" };

  return (
    <p className={`hidden px-3 py-2 text-xs lg:block ${state.tone}`}>
      {state.label}
    </p>
  );
}
