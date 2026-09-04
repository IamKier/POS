import { useEffect, useState } from "react";
import {
  Boxes,
  LogOut,
  Monitor,
  Moon,
  Package,
  ReceiptText,
  Settings as SettingsIcon,
  ShieldCheck,
  ShoppingCart,
  Store,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import PosProvider from "./store/PosProvider.jsx";
import { subscribeStatus } from "./data/cloudSync.js";
import { usePos } from "./store/context.js";
import Sell from "./pages/Sell.jsx";
import Products from "./pages/Products.jsx";
import Inventory from "./pages/Inventory.jsx";
import Sales from "./pages/Sales.jsx";
import Settings from "./pages/Settings.jsx";
import Staff from "./pages/Staff.jsx";
import Shifts from "./pages/Shifts.jsx";
import Login from "./pages/Login.jsx";
import AuthProvider from "./auth/AuthProvider.jsx";
import { useAuth } from "./auth/context.js";
import { signOutNow } from "./auth/authService.js";

/**
 * No router on purpose. The app is a handful of full-screen views and a
 * cashier never deep-links into one, so a single piece of state keeps
 * the URL free for whatever needs it later.
 *
 * The two groups are the access model: Register is what a cashier
 * touches, Admin is everything that changes the catalog, the stock or
 * the money settings. A cashier never sees the Admin group, and the
 * Firestore rules reject their writes even if they did.
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
      { id: "shifts", label: "Shifts", icon: Wallet, Page: Shifts },
      { id: "staff", label: "Staff", icon: Users, Page: Staff },
      { id: "settings", label: "Settings", icon: SettingsIcon, Page: Settings },
    ],
  },
];

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

/**
 * A till needs to say out loud whether it is online, because the answer
 * changes what the cashier should expect, not whether they can sell.
 * Firestore queues writes made offline and flushes them on reconnect.
 */
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

  if (status === "off") {
    return (
      <p className="mt-2 hidden px-3 pb-1 text-xs text-muted lg:block">
        Local data only. Nothing leaves this browser.
      </p>
    );
  }

  const state = !online
    ? {
        dot: "bg-warn",
        text: "text-warn",
        label: "Offline, sales queued",
        title:
          "No internet. Selling continues and every sale syncs when the connection returns.",
      }
    : status === "error"
      ? {
          dot: "bg-bad",
          text: "text-bad",
          label: "Cloud unreachable",
          title:
            "Firestore refused the connection. Check that the database exists and that security rules allow this app. Selling still works and stays on this device.",
        }
      : status === "synced"
        ? {
            dot: "bg-good",
            text: "text-muted",
            label: "Cloud sync on",
            title: "Connected. Sales and stock sync to every device on this store.",
          }
        : {
            dot: "bg-line-strong",
            text: "text-muted",
            label: "Connecting",
            title: "Reaching Firestore.",
          };

  return (
    <div
      title={state.title}
      className="mt-1 flex items-center gap-3 rounded-card px-3 py-2 text-xs"
    >
      <span className={`size-2 shrink-0 rounded-full ${state.dot}`} />
      <span className={`hidden lg:block ${state.text}`}>{state.label}</span>
    </div>
  );
}

function Shell() {
  const { settings } = usePos();
  const { isManager } = useAuth();
  const [page, setPage] = useState("sell");

  /* A cashier gets the register and nothing else. Hiding Admin is the
     convenience; the security is in the Firestore rules, which reject
     a cashier's write regardless of what the interface offers. */
  const groups = isManager ? GROUPS : GROUPS.filter((g) => !g.admin);
  const allowed = groups.flatMap((g) => g.items);
  const current = allowed.find((n) => n.id === page) ?? allowed[0];
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
          {groups.map((group) => (
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
          <SignedInAs />
          <ThemeToggle />
          <ConnectionBadge />
        </div>
      </nav>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Page />
      </main>
    </div>
  );
}

function SignedInAs() {
  const { user, profile, role, requiresAuth } = useAuth();
  if (!requiresAuth || !user) return null;

  return (
    <div className="mb-2 border-b border-line pb-2">
      <div className="hidden px-3 pb-2 lg:block">
        <p className="truncate text-sm font-medium text-ink">
          {profile?.name || user.email}
        </p>
        <p className="text-xs text-muted capitalize">{role}</p>
      </div>
      <button
        onClick={() => signOutNow()}
        title={`Signed in as ${profile?.name || user.email}. Sign out.`}
        className="flex w-full items-center gap-3 rounded-card px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <LogOut className="size-5 shrink-0" />
        <span className="hidden lg:block">Sign out</span>
      </button>
    </div>
  );
}

/**
 * Auth wraps the till rather than the other way round: there is no
 * point loading a register for someone who has not identified
 * themselves, and every sale needs a name attached to it.
 */
function Gate() {
  const { ready, user, requiresAuth, unlockLocally } = useAuth();

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <p className="text-sm text-muted">Opening the register</p>
      </div>
    );
  }

  if (requiresAuth && !user) return <Login onOfflineUnlock={unlockLocally} />;

  return (
    <PosProvider>
      <Shell />
    </PosProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
