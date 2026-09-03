import { useEffect } from "react";
import { X } from "lucide-react";

const VARIANTS = {
  primary: "bg-accent text-white hover:bg-indigo-700 disabled:bg-line-strong",
  outline: "border border-line-strong bg-surface text-ink hover:bg-surface-2",
  subtle: "bg-surface-2 text-ink hover:bg-line",
  ghost: "text-muted hover:bg-surface-2 hover:text-ink",
  danger: "bg-bad text-white hover:bg-red-700",
  good: "bg-good text-white hover:bg-emerald-700",
};

const SIZES = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-card font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}

export function IconButton({ className = "", label, ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink ${className}`}
      {...props}
    />
  );
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const INPUT_BASE =
  "w-full rounded-card border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/20";

export function Input({ className = "", ...props }) {
  return <input className={`${INPUT_BASE} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }) {
  return <select className={`${INPUT_BASE} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }) {
  return <textarea className={`${INPUT_BASE} ${className}`} {...props} />;
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-sm text-ink"
    >
      <span
        className={`relative h-6 w-11 shrink-0 rounded-pill transition-colors ${checked ? "bg-accent" : "bg-line-strong"}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${checked ? "left-5.5" : "left-0.5"}`}
        />
      </span>
      {label}
    </button>
  );
}

export function Badge({ tone = "neutral", children, className = "" }) {
  const tones = {
    neutral: "bg-surface-2 text-muted",
    accent: "bg-accent-soft text-accent",
    good: "bg-good-soft text-good",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Card({ className = "", ...props }) {
  return (
    <div
      className={`rounded-card border border-line bg-surface ${className}`}
      {...props}
    />
  );
}

export function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {Icon ? <Icon className="size-8 text-line-strong" /> : null}
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint ? <p className="max-w-xs text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function Modal({ open, onClose, title, subtitle, children, footer, width = "max-w-lg" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
      <div
        className={`flex max-h-full w-full ${width} flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:rounded-card`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
            ) : null}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </header>
        <div className="scroll-slim flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
