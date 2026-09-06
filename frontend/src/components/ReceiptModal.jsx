import { Ban, Printer, Undo2 } from "lucide-react";
import { Button, Modal } from "./ui.jsx";
import Receipt from "./Receipt.jsx";

export default function ReceiptModal({ sale, settings, onClose, onVoid, onReturn }) {
  return (
    <Modal
      open
      onClose={onClose}
      title={`${sale.type === "return" ? "Return" : "Receipt"} ${sale.number}`}
      subtitle={
        sale.type === "return"
          ? `Refund against ${sale.originalNumber}`
          : sale.status === "voided"
            ? "This sale was voided"
            : "Sale completed"
      }
      width="max-w-md"
      footer={
        <>
          {onReturn ? (
            <Button variant="outline" className="mr-auto" onClick={onReturn}>
              <Undo2 className="size-4" />
              Return items
            </Button>
          ) : null}
          {onVoid && sale.status !== "voided" && sale.type !== "return" ? (
            <Button
              variant="ghost"
              className={onReturn ? "text-bad" : "mr-auto text-bad"}
              onClick={onVoid}
            >
              <Ban className="size-4" />
              Void
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      <div className="bg-surface-2 py-4">
        <div className="mx-auto w-fit shadow-sm">
          <Receipt sale={sale} settings={settings} />
        </div>
      </div>
    </Modal>
  );
}
