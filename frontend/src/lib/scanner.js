/**
 * Camera scanning for barcodes and QR codes.
 *
 * Chrome on Android ships BarcodeDetector, which is fast, native, and
 * costs nothing to download. Safari and Firefox do not, so those fall
 * back to ZXing, imported dynamically the first time a camera actually
 * opens. That keeps roughly 200 KB out of the bundle for the tills that
 * never scan, and because it is a plain JavaScript chunk the service
 * worker precaches it, so scanning still works with no connection.
 * A WebAssembly decoder would have been smaller but fetches its .wasm
 * at runtime, which is exactly the wrong trade for a till.
 *
 * Camera access needs HTTPS. Vercel serves HTTPS, and localhost counts
 * as secure, so development is fine too.
 */

const PRODUCT_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
  "qr_code",
];

export function cameraSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export function nativeDetectorSupported() {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

/**
 * Returns { start, stop }. start() attaches the camera to a video
 * element and calls onResult(text) for each decode.
 */
export async function createScanner({ video, onResult, onError }) {
  const constraints = {
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;
  video.setAttribute("playsinline", "true");
  await video.play();

  const stopStream = () => {
    for (const track of stream.getTracks()) track.stop();
    video.srcObject = null;
  };

  if (nativeDetectorSupported()) {
    const supported = await window.BarcodeDetector.getSupportedFormats();
    const detector = new window.BarcodeDetector({
      formats: PRODUCT_FORMATS.filter((f) => supported.includes(f)),
    });

    let running = true;
    const tick = async () => {
      if (!running) return;
      try {
        const [found] = await detector.detect(video);
        if (found?.rawValue) onResult(found.rawValue, found.format);
      } catch (error) {
        onError?.(error);
      }
      /* A frame every 150ms is plenty for a barcode held still, and
         leaves the main thread free for the rest of the till. */
      if (running) setTimeout(tick, 150);
    };
    tick();

    return {
      stop() {
        running = false;
        stopStream();
      },
    };
  }

  const { BrowserMultiFormatReader } = await import("@zxing/browser");
  const reader = new BrowserMultiFormatReader();
  const controls = await reader.decodeFromVideoElement(video, (result) => {
    if (result) onResult(result.getText(), result.getBarcodeFormat?.());
  });

  return {
    stop() {
      controls?.stop?.();
      stopStream();
    },
  };
}

/** Distinguishes a permission refusal from a missing camera. */
export function readableScannerError(error) {
  const name = error?.name ?? "";
  if (name === "NotAllowedError")
    return "Camera access was blocked. Allow it in the browser address bar, then try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No camera on this device. A USB scanner still works: it types into the search box.";
  if (name === "NotReadableError")
    return "Another app is using the camera. Close it and try again.";
  if (!window.isSecureContext)
    return "Cameras only work over HTTPS.";
  return error?.message ?? "The camera could not be opened.";
}
