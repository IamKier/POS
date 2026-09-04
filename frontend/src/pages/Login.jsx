import { useEffect, useState } from "react";
import { Store, WifiOff } from "lucide-react";
import { Button, Field, Input } from "../components/ui.jsx";
import PinPad from "../components/PinPad.jsx";
import {
  createOwner,
  noStaffYet,
  readableAuthError,
  signInOffline,
  signInWithPin,
} from "../auth/authService.js";
import { codeProblem, pinProblem } from "../auth/pin.js";

export default function Login({ onOfflineUnlock }) {
  const [mode, setMode] = useState("signin"); // or "owner"
  const [firstRun, setFirstRun] = useState(false);
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(true);

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

  /* A brand new store has nobody to sign in as, so offer to create the
     owner rather than ask for a PIN that cannot exist yet. */
  useEffect(() => {
    let live = true;
    noStaffYet()
      .then((empty) => {
        if (!live || !empty) return;
        setFirstRun(true);
        setMode("owner");
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  async function submit(event) {
    event?.preventDefault?.();
    setBusy(true);
    setError("");

    const badCode = codeProblem(code);
    const badPin = pinProblem(pin, mode === "owner" ? "manager" : "cashier");
    if (badCode || badPin) {
      setError(badCode ?? badPin);
      setBusy(false);
      return;
    }

    try {
      if (mode === "owner") {
        await createOwner({ code, name, pin });
      } else if (!window.navigator.onLine) {
        /* Offline: this register can only recognise staff who have
           signed in on it before, which is exactly the regular crew. */
        const remembered = await signInOffline(code, pin);
        if (!remembered) {
          setError(
            "No connection, and this register has not seen that code and PIN before. It works once you are back online.",
          );
          setBusy(false);
          return;
        }
        onOfflineUnlock(remembered);
      } else {
        await signInWithPin(code, pin);
      }
    } catch (err) {
      setError(readableAuthError(err));
      setPin("");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-xs rounded-card border border-line bg-surface p-6 shadow-raised"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-card bg-accent-solid text-white">
            <Store className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-ink">Tindahan POS</h1>
            <p className="truncate text-sm text-muted">
              {mode === "owner" ? "Set up the owner" : "Enter your code and PIN"}
            </p>
          </div>
        </div>

        {!online ? (
          <p className="mb-4 flex items-start gap-2 rounded-card bg-warn-soft px-3 py-2 text-xs text-warn">
            <WifiOff className="mt-0.5 size-3.5 shrink-0" />
            No connection. Staff who have signed in on this register before can
            still open it.
          </p>
        ) : null}

        <div className="space-y-4">
          {mode === "owner" ? (
            <Field label="Your name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan dela Cruz"
                required
                autoFocus
              />
            </Field>
          ) : null}

          <Field
            label="Staff code"
            hint={mode === "owner" ? "Short and memorable, like kier." : undefined}
          >
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="kier"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              className="font-mono lowercase"
              autoFocus={mode !== "owner"}
            />
          </Field>

          <div>
            <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">
              PIN
              {mode === "owner" ? " (six digits)" : ""}
            </span>
            <PinPad
              value={pin}
              onChange={setPin}
              onSubmit={submit}
              max={mode === "owner" ? 6 : 6}
            />
          </div>

          {error ? (
            <p className="rounded-card bg-bad-soft px-3 py-2 text-sm text-bad">
              {error}
            </p>
          ) : null}

          {busy ? (
            <p className="text-center text-sm text-muted">Working</p>
          ) : null}

          {mode === "owner" ? (
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              Create the owner and open the till
            </Button>
          ) : null}

          {firstRun ? (
            <button
              type="button"
              onClick={() => {
                setMode(mode === "owner" ? "signin" : "owner");
                setError("");
                setPin("");
              }}
              className="w-full text-center text-sm text-muted hover:text-accent"
            >
              {mode === "owner"
                ? "I already have a code"
                : "Set up the first account"}
            </button>
          ) : (
            <p className="text-center text-xs text-muted">
              Forgot your PIN? A manager adds you a new code in Admin, Staff.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
