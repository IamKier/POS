import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

/**
 * Firebase is optional. With no config the app runs exactly as before,
 * entirely on localStorage, which keeps a fresh clone working and lets
 * the deploy fall back rather than crash if the env vars go missing.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId);

let db = null;

if (firebaseEnabled) {
  const app = initializeApp(config);

  /**
   * persistentLocalCache is the whole reason Firestore suits a till.
   * Reads are served from IndexedDB, writes are accepted while offline
   * and flushed on reconnect, so a dropped connection does not stop a
   * queue of customers. persistentMultipleTabManager keeps two tabs of
   * the same register sharing one cache instead of fighting over it.
   */
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
}

export { db };
