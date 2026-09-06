import { LayoutDashboard, LogOut, Wallet } from "lucide-react";
import { usePos } from "../store/context.js";
import { useAuth } from "../auth/context.js";
import { signOutNow } from "../auth/authService.js";
import { activeShiftOf } from "../lib/shift.js";
import { formatMoney, formatTime } from "../lib/format.js";
import Sell from "../pages/Sell.jsx";

/**
 * The cashier's whole world. No sidebar, no navigation, no admin
 * anything: one screen that sells, with a thin bar above it saying who
 * is on, which register this is, and how long the shift has been open.
 *
 * Keeping this separate from the admin panel is not cosmetic. A cashier
 * with a queue should not be one mis-tap from the price list, and a
 * screen with nothing else on it is a screen nobody gets lost in.
 */
export default function RegisterShell({ onOpenAdmin }) {
  const { settings, shifts, activeShiftId, terminal, sales } = usePos();
  const { profile, isManager, requiresAuth } = useAuth();
  const shift = activeShiftOf({ shifts, activeShiftId });

  const shiftSales = shift
    ? sales.filter((s) => s.shiftId === shift.id && s.status === "completed")
    : [];
  const taken = shiftSales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <header className="no-print flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface px-4">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-ink">
            {settings.storeName}
          </span>
          <span className="rounded bg-accent-soft px-2 py-0.5 text-[11px] font-medium tracking-wide text-accent uppercase">
            Register
          </span>
        </span>

        <span className="hidden rounded bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted sm:inline">
          {terminal?.code ?? "T"}
        </span>

        {shift ? (
          <span className="hidden items-center gap-2 text-sm text-muted md:flex">
            <Wallet className="size-4" />
            Open since {formatTime(shift.openedAt)}
            <span className="tnum text-ink">
              {formatMoney(taken, settings.currency)}
            </span>
            taken
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {profile?.name ? (
            <span className="hidden text-sm text-muted sm:inline">
              {profile.name}
            </span>
          ) : null}

          {isManager ? (
            <button
              onClick={onOpenAdmin}
              className="flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-medium text-ink transition-colors active:bg-surface-2"
            >
              <LayoutDashboard className="size-4" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          ) : null}

          {requiresAuth ? (
            <button
              onClick={() => signOutNow()}
              title="Sign out"
              className="flex size-10 items-center justify-center rounded-md border border-line text-muted transition-colors active:bg-surface-2"
            >
              <LogOut className="size-4" />
            </button>
          ) : null}
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Sell />
      </main>
    </div>
  );
}
