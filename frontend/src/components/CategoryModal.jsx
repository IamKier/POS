import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Modal } from "./ui.jsx";
import { uid } from "../lib/format.js";

const SWATCHES = [
  "#0ea5e9",
  "#f97316",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#eab308",
  "#ec4899",
  "#64748b",
];

export default function CategoryModal({
  categories,
  productCount,
  onClose,
  onSave,
  onRemove,
}) {
  const [newName, setNewName] = useState("");

  return (
    <Modal
      open
      onClose={onClose}
      title="Categories"
      subtitle="Deleting a category leaves its products uncategorized."
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <ul className="space-y-2">
        {categories.map((category) => (
          <li
            key={category.id}
            className="flex items-center gap-2 rounded-card border border-line px-3 py-2"
          >
            <input
              type="color"
              value={category.color}
              onChange={(e) => onSave({ ...category, color: e.target.value })}
              className="size-7 shrink-0 cursor-pointer rounded border border-line-strong bg-surface"
              aria-label={`Color for ${category.name}`}
            />
            <Input
              value={category.name}
              onChange={(e) => onSave({ ...category, name: e.target.value })}
              className="h-8 flex-1"
            />
            <span className="tnum w-20 shrink-0 text-right text-xs text-muted">
              {productCount[category.id] ?? 0} items
            </span>
            <button
              onClick={() => onRemove(category.id)}
              className="rounded p-1.5 text-muted hover:text-bad"
              aria-label={`Delete ${category.name}`}
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      <form
        className="mt-4 flex items-center gap-2 border-t border-line pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          onSave({
            id: uid("cat"),
            name: newName.trim(),
            color: SWATCHES[categories.length % SWATCHES.length],
          });
          setNewName("");
        }}
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          className="flex-1"
        />
        <Button type="submit" variant="outline">
          <Plus className="size-4" />
          Add
        </Button>
      </form>
    </Modal>
  );
}
