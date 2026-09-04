import { useEffect } from "react";
import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Big targets, because this is used with one thumb over a counter, and
 * a hardware keyboard also works for the registers that have one.
 */
export default function PinPad({ value, onChange, onSubmit, max = 6 }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key >= "0" && event.key <= "9") {
        onChange((value + event.key).slice(0, max));
      } else if (event.key === "Backspace") {
        onChange(value.slice(0, -1));
      } else if (event.key === "Enter" && value.length >= 4) {
        onSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value, onChange, onSubmit, max]);

  const press = (digit) => onChange((value + digit).slice(0, max));

  return (
    <div>
      <div className="mb-4 flex h-10 items-center justify-center gap-3">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            className={`size-3 rounded-full transition-colors ${
              i < value.length ? "bg-accent-solid" : "bg-line-strong"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((digit) => (
          <PadButton key={digit} onClick={() => press(digit)}>
            {digit}
          </PadButton>
        ))}
        <PadButton
          onClick={() => onChange(value.slice(0, -1))}
          aria-label="Delete last digit"
        >
          <Delete className="size-5" />
        </PadButton>
        <PadButton onClick={() => press("0")}>0</PadButton>
        <button
          type="submit"
          disabled={value.length < 4}
          onClick={onSubmit}
          className="flex h-14 items-center justify-center rounded-card bg-accent-solid text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:bg-line-strong disabled:text-muted"
        >
          Enter
        </button>
      </div>
    </div>
  );
}

function PadButton({ children, ...props }) {
  return (
    <button
      type="button"
      className="flex h-14 items-center justify-center rounded-card border border-line-strong bg-surface text-xl font-semibold text-ink transition-colors hover:bg-surface-2 active:bg-surface-3"
      {...props}
    >
      {children}
    </button>
  );
}
