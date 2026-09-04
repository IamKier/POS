import { useRef, useState } from "react";
import { QrCode, Trash2, Upload } from "lucide-react";
import { Button } from "./ui.jsx";

const MAX_EDGE = 700;
const MAX_BYTES = 300 * 1024;

/**
 * The store's own payment QR: a screenshot of the GCash, Maya or QR Ph
 * code, shown full size at checkout for the customer to scan.
 *
 * It is downscaled before being stored, for a boring but real reason:
 * settings sync to Firestore, and a Firestore document cannot exceed
 * 1MB. A phone screenshot pasted in raw would take the whole settings
 * document over the limit and silently break every settings write.
 */
export default function PaymentQrField({ value, onChange }) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");

  function pick(file) {
    if (!file) return;
    setError("");

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext("2d");
        /* White behind it: a QR with a transparent background prints
           and scans badly. */
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        if (dataUrl.length > MAX_BYTES) {
          setError("That image is too large even after resizing. Try a screenshot.");
          return;
        }
        onChange(dataUrl);
      };
      image.onerror = () => setError("That file is not an image.");
      image.src = reader.result;
    };
    reader.onerror = () => setError("That file could not be read.");
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <div className="flex items-start gap-4">
        <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-card border border-line bg-white">
          {value ? (
            <img src={value} alt="Store payment QR" className="size-full object-contain" />
          ) : (
            <QrCode className="size-8 text-line-strong" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            A screenshot of your GCash, Maya or QR Ph code. It appears full size
            at checkout when one of those is selected, for the customer to scan.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-4" />
              {value ? "Replace" : "Upload"}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                className="text-bad"
                onClick={() => onChange("")}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            ) : null}
          </div>
          {error ? <p className="mt-2 text-sm text-bad">{error}</p> : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
