import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button, Field, Input, Modal } from "./ui.jsx";
import PinPad from "./PinPad.jsx";
import { approveAsManager, readableAuthError } from "../auth/authService.js";

/**
 * A manager standing at the till approves the action by entering their
 * own credentials. It runs on a separate auth session, so the cashier
 * is never signed out, and the approving manager is recorded on the
 * action rather than just waved through.
 */
export default function ApprovalModal({ action, onApproved, onClose }) {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event?.preventDefault?.();
    setBusy(true);
    setError("");
    try {
      const manager = await approveAsManager(code, pin);
      onApproved(manager);
    } catch (err) {
      setError(readableAuthError(err));
      setPin("");
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

        <Field label="Manager code">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            className="font-mono lowercase"
            required
            autoFocus
            autoComplete="off"
          />
        </Field>

        <div>
          <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">
            Manager PIN
          </span>
          <PinPad value={pin} onChange={setPin} onSubmit={submit} />
        </div>

        {busy ? (
          <p className="text-center text-sm text-muted">Checking</p>
        ) : null}

        {error ? (
          <p className="rounded-card bg-bad-soft px-3 py-2 text-sm text-bad">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
