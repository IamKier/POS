import { Ban, Printer } from "lucide-react";
import { Button, Modal } from "./ui.jsx";
import Receipt from "./Receipt.jsx";

export default function ReceiptModal({ sale, settings, onClose, onVoid }) {
  return (
    <Modal
      open
      onClose={onClose}
      title={`Receipt ${sale.number}`}
      subtitle={sale.status === "voided" ? "This sale was voided" : "Sale completed"}
      width="max-w-md"
      footer={
        <>
          {onVoid && sale.status !== "voided" ? (
            <Button variant="ghost" className="mr-auto text-bad" onClick={onVoid}>
              <Ban className="size-4" />
              Void sale
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
