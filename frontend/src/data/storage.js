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
 * localAdapter below is the whole implementation today. A Firestore or
 * Mongo adapter satisfies the same three functions, with two differences
 * worth planning for:
 *
 *   - load() becomes async. PosProvider will need a loading state, and
 *     the reducer gains a "state/replace" action (it already has one)
 *     to swallow the first server snapshot.
 *   - a real backend stores collections, not one blob. products, sales
 *     and stockMoves each become a collection, so save() turns into a
 *     write of what actually changed rather than the entire state. The
 *     blob shape here is a stand-in that keeps the app honest until a
 *     backend is chosen, not a schema to carry over.
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
