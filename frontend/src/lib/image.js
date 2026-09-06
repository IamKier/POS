/**
 * Images are stored as data URLs on the record itself rather than in a
 * bucket. That keeps a photo available offline with the product it
 * belongs to, and avoids a second service to configure and secure.
 *
 * The price is size, so everything is downscaled hard before it is
 * stored: a Firestore document cannot exceed 1MB, and the localStorage
 * mirror holds the whole catalog at once. A 4000px phone photo pasted
 * in raw would break both. If the catalog ever grows past a few hundred
 * photographed items, Firebase Storage is the next step.
 */
const DEFAULTS = { maxEdge: 320, quality: 0.72, maxBytes: 60 * 1024 };

export function downscaleImage(file, options = {}) {
  const { maxEdge, quality, maxBytes } = { ...DEFAULTS, ...options };

  return new Promise((resolve, reject) => {
    if (!file.type?.startsWith("image/")) {
      reject(new Error("That file is not an image."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("That image could not be opened."));
      image.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const ctx = canvas.getContext("2d");
        /* White behind it: a transparent PNG on a white card is fine,
           but as a JPEG the transparency turns black. */
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (dataUrl.length > maxBytes) {
          dataUrl = canvas.toDataURL("image/jpeg", 0.55);
        }
        if (dataUrl.length > maxBytes) {
          reject(new Error("That image is too large even after resizing."));
          return;
        }
        resolve(dataUrl);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
