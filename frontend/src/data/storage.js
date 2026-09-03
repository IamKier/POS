import { STORAGE_KEY, hydrate } from "../store/reducer.js";

/**
 * The storage seam.
 *
 * Screens never touch storage. They read through usePos() and write by
 * dispatching an action; PosProvider owns the state and hands it to one
 * adapter that satisfies this contract:
 *
 *   load()            -> state, or null when nothing is stored yet
 *   save(state)       -> persist. Called on every state change.
 *   subscribe(onNext) -> call onNext(state) when the data changes
 *                        somewhere else. Returns an unsubscribe.
 *
 * This adapter stays in place even with Firestore configured. It is the
 * instant, synchronous first paint: the till opens with yesterday's
 * catalog already on screen instead of an empty grid waiting on a
 * network round trip. Firestore then merges in through cloudSync.js and
 * corrects anything another device changed.
 *
 * The blob shape here is deliberately not the cloud schema. Firestore
 * stores products, categories, sales and stockMoves as collections of
 * documents, because that is what lets two registers write at once
 * without clobbering each other's whole state.
 */

export function createLocalAdapter(key = STORAGE_KEY) {
  return {
    load() {
      try {
        return hydrate(window.localStorage.getItem(key));
      } catch {
        return hydrate(null);
      }
    },

    save(state) {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // Storage full, blocked, or private mode. The session keeps
        // working in memory; only persistence is lost.
      }
    },

    /**
     * Fires when another tab on the same machine writes. It is the local
     * stand-in for a server subscription, and it is why two tabs of the
     * till stay in step.
     */
    subscribe(onNext) {
      const handler = (event) => {
        if (event.key !== key || !event.newValue) return;
        onNext(hydrate(event.newValue));
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  };
}

export const storage = createLocalAdapter();
