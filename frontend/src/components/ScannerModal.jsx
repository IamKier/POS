import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine } from "lucide-react";
import { Button, Modal } from "./ui.jsx";
import {
  cameraSupported,
  createScanner,
  nativeDetectorSupported,
  readableScannerError,
} from "../lib/scanner.js";

/**
 * The phone camera path. A professional scanner needs none of this: it
 * types and this modal never opens.
 */
export default function ScannerModal({
  title = "Scan",
  subtitle,
  onScan,
  onClose,
  continuous = false,
}) {
  const videoRef = useRef(null);
  /* Whether a camera exists at all is known before the first render, so
     it is the initial state rather than something an effect discovers. */
  const [error, setError] = useState(() =>
    cameraSupported()
      ? ""
      : "This browser cannot open a camera. A USB or Bluetooth scanner works anywhere in the app.",
  );
  const [last, setLast] = useState("");
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!cameraSupported()) return undefined;

    let scanner = null;
    let live = true;
    /* The same code sits in front of the lens for several frames, so
       ignore repeats until something else is seen. */
    let previous = "";

    createScanner({
      video: videoRef.current,
      onResult: (value) => {
        if (!live || !value || value === previous) return;
        previous = value;
        setLast(value);
        setCount((n) => n + 1);
        onScan(value);
        if (!continuous) {
          live = false;
          scanner?.stop();
        } else {
          /* Allow the same item to be scanned again after a moment. */
          setTimeout(() => {
            previous = "";
          }, 1200);
        }
      },
      onError: () => {},
    })
      .then((instance) => {
        scanner = instance;
        if (!live) instance.stop();
      })
      .catch((err) => setError(readableScannerError(err)));

    return () => {
      live = false;
      scanner?.stop();
    };
  }, [onScan, continuous]);

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      width="max-w-md"
      footer={
        <>
          <span className="mr-auto text-xs text-muted">
            {nativeDetectorSupported() ? "Using the built-in scanner" : "Using ZXing"}
          </span>
          <Button variant="outline" onClick={onClose}>
            {continuous && count ? `Done, ${count} scanned` : "Close"}
          </Button>
        </>
      }
    >
      {error ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Camera className="size-8 text-line-strong" />
          <p className="max-w-xs text-sm text-muted">{error}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-card bg-black">
            <video
              ref={videoRef}
              className="aspect-[4/3] w-full object-cover"
              muted
              playsInline
            />
            {/* A window to aim through, rather than a full-frame guess. */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-28 w-4/5 rounded-sm border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                <ScanLine className="absolute inset-x-0 top-1/2 mx-auto size-6 -translate-y-1/2 text-white/90" />
              </div>
            </div>
          </div>

          {last ? (
            <p className="rounded-card bg-good-soft px-3 py-2 text-center font-mono text-sm text-good">
              {last}
            </p>
          ) : (
            <p className="text-center text-sm text-muted">
              Hold the barcode inside the box.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
