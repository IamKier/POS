import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Modal } from "./ui.jsx";
import { uid } from "../lib/format.js";


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
              className="rounded-sm p-1.5 text-muted hover:text-bad"
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
          onSave({ id: uid("cat"), name: newName.trim() });
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
