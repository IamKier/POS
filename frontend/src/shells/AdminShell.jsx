import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  LogOut,
  Moon,
  Package,
  ReceiptText,
  Settings as SettingsIcon,
  ShoppingCart,
  Store,
  Sun,
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

const THEMES = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

export default function AdminShell({ onOpenRegister }) {
  const { settings } = usePos();
  const { profile, requiresAuth } = useAuth();
  const [page, setPage] = useState("dashboard");
  const current = PAGES.find((p) => p.id === page) ?? PAGES[0];
  const Page = current.Page;

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <nav className="no-print flex w-16 shrink-0 flex-col border-r border-line bg-surface lg:w-60">
        <div className="flex h-16 items-center gap-3 px-3 lg:px-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-solid text-white">
            <Store className="size-5" />
          </span>
          <span className="hidden min-w-0 lg:block">
            <span className="block truncate text-sm font-semibold text-ink">
              {settings.storeName}
            </span>
            <span className="block text-xs text-muted">Admin</span>
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
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
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
            className="mb-1 flex w-full items-center gap-3 rounded-xl bg-accent-solid px-3 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <ShoppingCart className="size-5 shrink-0" />
            <span className="hidden lg:block">Open the register</span>
          </button>

          <ThemeToggle />
          <ConnectionBadge />

          {requiresAuth ? (
            <button
              onClick={() => signOutNow()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
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

function ThemeToggle() {
  const { dispatch, settings } = usePos();
  const index = Math.max(
    0,
    THEMES.findIndex((t) => t.id === (settings.theme ?? "light")),
  );
  const current = THEMES[index];
  const next = THEMES[(index + 1) % THEMES.length];
  const Icon = current.icon;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", current.id);
  }, [current.id]);

  return (
    <button
      onClick={() => dispatch({ type: "settings/save", patch: { theme: next.id } })}
      title={`${current.label}. Switch to ${next.label.toLowerCase()}.`}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <Icon className="size-5 shrink-0" />
      <span className="hidden lg:block">{current.label}</span>
    </button>
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
    ? { dot: "bg-warn", label: "Offline, sales queued" }
    : status === "error"
      ? { dot: "bg-bad", label: "Cloud unreachable" }
      : status === "synced"
        ? { dot: "bg-good", label: "Cloud sync on" }
        : { dot: "bg-line-strong", label: "Connecting" };

  return (
    <div className="flex items-center gap-3 px-3 py-2 text-xs text-muted">
      <span className={`size-2 shrink-0 rounded-full ${state.dot}`} />
      <span className="hidden lg:block">{state.label}</span>
    </div>
  );
}
