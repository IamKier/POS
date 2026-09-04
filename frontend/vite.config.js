import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    /**
     * Firestore's cache keeps the data available offline. This keeps the
     * app itself available: without a service worker, a till with no
     * connection cannot even load the page, so "works offline" would
     * only have meant "works offline as long as you never close the
     * tab". Installed to a home screen, it opens and sells with the
     * router unplugged.
     */
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Tindahan POS",
        short_name: "POS",
        description: "Point of sale for retail and table service.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#f5f6f8",
        theme_color: "#4f46e5",
        categories: ["business", "productivity"],
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        /* The app is one page, so any route falls back to the shell. */
        navigateFallback: "/index.html",
        /* Firestore and Auth traffic must never be served from a cache:
           stale prices and stale sessions are worse than an error. */
        navigateFallbackDenylist: [/^\/__/, /firestore/, /identitytoolkit/],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
