/**
 * Professional scanners, the USB and Bluetooth kind.
 *
 * Almost every laser and imaging scanner sold for retail is an HID
 * keyboard: it types the barcode and presses Enter. Nothing needs
 * installing, and it works on the shop tablet over Bluetooth the same
 * way it works on a desktop over USB.
 *
 * The catch is that a keyboard types into whatever has focus, so a scan
 * lands in the search box only if the cashier remembered to click it
 * first. This listens globally instead, and tells a scan apart from a
 * person typing by speed: a scanner emits characters a few milliseconds
 * apart, a human cannot do better than about 60ms. Anything that
 * arrives as a fast burst and ends with Enter is a scan, wherever the
 * focus happens to be.
 *
 * Scanners that send a prefix or suffix (many can be configured with
 * one) still work: the buffer only keeps characters that arrived inside
 * the burst window, and a stray leading character is dropped by the
 * length check.
 */

const DEFAULTS = {
  /* A scanner is typically 5 to 20ms between characters. A fast typist
     is 80 to 150ms. 45ms sits well clear of both. */
  maxGapMs: 45,
  minLength: 4,
};

export function listenForScans({ onScan, ...options }) {
  const { maxGapMs, minLength } = { ...DEFAULTS, ...options };

  let buffer = "";
  let lastAt = 0;

  const onKeyDown = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const now = performance.now();
    const gap = now - lastAt;
    lastAt = now;

    if (event.key === "Enter") {
      const candidate = buffer;
      buffer = "";
      if (candidate.length >= minLength && gap < maxGapMs * 4) {
        /* Stop the Enter from also submitting whatever form is open. */
        event.preventDefault();
        onScan(candidate);
      }
      return;
    }

    if (event.key.length !== 1) return;

    /* Too slow to be a scanner: this is a person typing, so start over
       and let the keystroke reach whatever they are typing into. */
    buffer = gap > maxGapMs ? event.key : buffer + event.key;
  };

  window.addEventListener("keydown", onKeyDown, true);
  return () => window.removeEventListener("keydown", onKeyDown, true);
}
