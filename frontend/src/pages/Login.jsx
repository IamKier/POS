import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { Button, Field, Input } from "../components/ui.jsx";
import {
  createOwner,
  noStaffYet,
  readableAuthError,
  signIn,
} from "../auth/authService.js";

export default function Login() {
  const [mode, setMode] = useState("signin"); // or "owner"
  const [firstRun, setFirstRun] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /* Nobody has an account on a brand new store, so offer to create the
     owner instead of asking for a password that cannot exist yet. */
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
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "owner") await createOwner(email, password, name);
      else await signIn(email, password);
    } catch (err) {
      setError(readableAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-raised"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-card bg-accent-solid text-white">
            <Store className="size-5" />
          </span>
          <div>
            <h1 className="text-base font-semibold text-ink">Tindahan POS</h1>
            <p className="text-sm text-muted">
              {mode === "owner" ? "Create the owner account" : "Sign in to the register"}
            </p>
          </div>
        </div>

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

          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@store.ph"
              required
              autoFocus={mode !== "owner"}
              autoComplete="username"
            />
          </Field>

          <Field
            label="Password"
            hint={mode === "owner" ? "At least six characters." : undefined}
          >
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "owner" ? "new-password" : "current-password"}
            />
          </Field>

          {error ? (
            <p className="rounded-card bg-bad-soft px-3 py-2 text-sm text-bad">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy
              ? "Working"
              : mode === "owner"
                ? "Create account and open the till"
                : "Sign in"}
          </Button>

          {firstRun ? (
            <button
              type="button"
              onClick={() => setMode(mode === "owner" ? "signin" : "owner")}
              className="w-full text-center text-sm text-muted hover:text-accent"
            >
              {mode === "owner"
                ? "I already have an account"
                : "Set up the first account"}
            </button>
          ) : (
            <p className="text-center text-sm text-muted">
              No account? A manager creates one for you in Admin, Staff.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
