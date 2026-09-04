import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button, Field, Input, Modal } from "./ui.jsx";
import { approveAsManager, readableAuthError } from "../auth/authService.js";

/**
 * A manager standing at the till approves the action by entering their
 * own credentials. It runs on a separate auth session, so the cashier
 * is never signed out, and the approving manager is recorded on the
 * action rather than just waved through.
 */
export default function ApprovalModal({ action, onApproved, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const manager = await approveAsManager(email, password);
      onApproved(manager);
    } catch (err) {
      setError(readableAuthError(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Manager approval"
      subtitle={action}
      width="max-w-sm"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-start gap-3 rounded-card bg-accent-soft px-3 py-2.5 text-sm text-accent">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <p>
            A manager needs to sign this off. You stay signed in on this
            register.
          </p>
        </div>

        <Field label="Manager email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="off"
          />
        </Field>

        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="off"
          />
        </Field>

        {error ? (
          <p className="rounded-card bg-bad-soft px-3 py-2 text-sm text-bad">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Checking" : "Approve"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
