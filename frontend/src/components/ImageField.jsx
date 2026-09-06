import { useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "./ui.jsx";
import { downscaleImage } from "../lib/image.js";

/**
 * Picks an image and hands back a downscaled data URL. On a tablet the
 * file picker offers the camera, which is how a shop actually gets
 * product photos: point at the shelf, done.
 */
export default function ImageField({
  value,
  onChange,
  hint,
  shape = "square",
  options,
}) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function pick(file) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      onChange(await downscaleImage(file, options));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-start gap-4">
        <div
          className={`flex size-28 shrink-0 items-center justify-center overflow-hidden border border-line bg-surface-2 ${
            shape === "round" ? "rounded-full" : "rounded-sm"
          }`}
        >
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-7 text-line-strong" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {hint ? <p className="text-sm text-muted">{hint}</p> : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="size-4" />
              {busy ? "Working" : value ? "Replace" : "Add photo"}
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
        capture="environment"
        hidden
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
