import { useEffect, useState } from "react";
import { Plus, ShieldCheck, Users } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
} from "../components/ui.jsx";
import {
  createStaff,
  listStaff,
  readableAuthError,
  setRole,
} from "../auth/authService.js";
import { useAuth } from "../auth/context.js";
import { formatDate } from "../lib/format.js";

export default function Staff() {
  const { user } = useAuth();
  const [people, setPeople] = useState([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => listStaff(setPeople), []);

  return (
    <>
      <PageHeader
        title="Staff"
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add staff</span>
          </Button>
        }
      >
        <p className="truncate text-sm text-muted">
          Who can open the register, and who can change the catalog
        </p>
      </PageHeader>

      <div className="scroll-slim min-h-0 flex-1 overflow-auto p-4">
        {people.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nobody else yet"
            hint="Add your cashiers so each sale is attributed to the person who rang it up."
          />
        ) : (
          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-2 text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">
                    Email
                  </th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">
                    Added
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {people.map((person) => {
                  const isYou = person.uid === user?.uid;
                  return (
                    <tr key={person.uid} className="hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink">
                            {person.name || "Unnamed"}
                          </span>
                          {isYou ? <Badge tone="accent">You</Badge> : null}
                        </div>
                        <span className="text-xs text-muted sm:hidden">
                          {person.email}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-muted sm:table-cell">
                        {person.email}
                      </td>
                      <td className="hidden px-4 py-3 text-muted md:table-cell">
                        {person.createdAt ? formatDate(person.createdAt) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Select
                          value={person.role}
                          disabled={isYou}
                          title={
                            isYou
                              ? "You cannot change your own role. Another manager can."
                              : undefined
                          }
                          onChange={(e) => setRole(person.uid, e.target.value)}
                          className="ml-auto h-8 w-36 py-0 text-sm"
                        >
                          <option value="cashier">Cashier</option>
                          <option value="manager">Manager</option>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-start gap-3 rounded-card border border-line bg-surface px-4 py-3 text-sm text-muted shadow-card">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
          <p>
            A cashier can sell, and needs a manager standing there to void a
            sale or apply a discount. A manager can do everything, including
            changing prices, stock and these roles.
          </p>
        </div>
      </div>

      {adding ? (
        <AddStaffModal onClose={() => setAdding(false)} />
      ) : null}
    </>
  );
}

function AddStaffModal({ onClose }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "cashier",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createStaff(form);
      onClose();
    } catch (err) {
      setError(readableAuthError(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add staff"
      subtitle="They sign in with this email and password."
      width="max-w-sm"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <Input
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            required
            autoFocus
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            required
            autoComplete="off"
          />
        </Field>
        <Field label="Password" hint="At least six characters. They can keep it.">
          <Input
            type="password"
            value={form.password}
            onChange={(e) => set({ password: e.target.value })}
            required
            autoComplete="new-password"
          />
        </Field>
        <Field label="Role">
          <Select
            value={form.role}
            onChange={(e) => set({ role: e.target.value })}
          >
            <option value="cashier">Cashier</option>
            <option value="manager">Manager</option>
          </Select>
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
            {busy ? "Creating" : "Create account"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
