import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { db, firebaseEnabled } from "./firebase.js";

/**
 * Firestore sync, layered on top of the local state rather than
 * replacing it.
 *
 * The reducer stays the single source of truth for the screens, which
 * is what keeps the till responsive: a sale lands in local state and
 * renders immediately, and the write goes out afterwards. Firestore's
 * own offline cache queues that write when the connection is down.
 *
 * Two directions:
 *   pushToCloud(prev, next)  diffs two states and writes what changed
 *   startCloudSync(...)      subscribes and merges what other devices wrote
 *
 * Open carts and tabs are deliberately not synced. A cart belongs to
 * the terminal holding it, and two registers should not fight over one
 * customer's basket. Shared table bills across terminals is a separate
 * feature, not a side effect of persistence.
 */

/**
 * Connection status, so the sidebar can tell the truth rather than
 * assume. "error" is usually one of two things: the Firestore database
 * was never created in the console, or security rules rejected the
 * write.
 */
const statusListeners = new Set();
let status = firebaseEnabled ? "connecting" : "off";

export function subscribeStatus(callback) {
  statusListeners.add(callback);
  callback(status);
  return () => statusListeners.delete(callback);
}

function setStatus(next) {
  if (status === next) return;
  status = next;
  for (const callback of statusListeners) callback(status);
}

const COLLECTIONS = [
  { slice: "products", path: "products", sort: byName },
  { slice: "categories", path: "categories", sort: byName },
  { slice: "sales", path: "sales", sort: byNewest },
  { slice: "stockMoves", path: "stockMoves", sort: byNewest },
];

const SETTINGS_PATH = ["config", "settings"];

/* Firestore caps a batch at 500 writes. */
const BATCH_LIMIT = 450;

function byName(a, b) {
  return (a.name ?? "").localeCompare(b.name ?? "");
}

function byNewest(a, b) {
  return String(b.at ?? "").localeCompare(String(a.at ?? ""));
}

function indexById(list = []) {
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function commit(operations) {
  for (let i = 0; i < operations.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const op of operations.slice(i, i + BATCH_LIMIT)) {
      if (op.type === "set") batch.set(doc(db, op.path, op.id), op.data);
      else batch.delete(doc(db, op.path, op.id));
    }
    await batch.commit();
  }
}

/** Writes only what actually changed between two states. */
export async function pushToCloud(prev, next) {
  if (!firebaseEnabled) return;

  const operations = [];

  for (const { slice, path } of COLLECTIONS) {
    const before = indexById(prev[slice]);
    const after = indexById(next[slice]);

    for (const [id, item] of Object.entries(after)) {
      if (!same(before[id], item)) {
        operations.push({ type: "set", path, id, data: item });
      }
    }
    for (const id of Object.keys(before)) {
      if (!after[id]) operations.push({ type: "delete", path, id });
    }
  }

  if (!same(prev.settings, next.settings)) {
    operations.push({
      type: "set",
      path: SETTINGS_PATH[0],
      id: SETTINGS_PATH[1],
      data: next.settings,
    });
  }

  if (!operations.length) return;

  try {
    await commit(operations);
  } catch (error) {
    // Offline writes are queued by the SDK and do not land here. This
    // is a rules rejection or a genuinely broken project config.
    setStatus("error");
    console.warn("[pos] cloud write failed", error);
  }
}

/**
 * Subscribes to every collection. onRemote receives reducer actions.
 * Returns an unsubscribe.
 */
export function startCloudSync({ getState, onRemote }) {
  if (!firebaseEnabled) return () => {};

  const seeded = new Set();
  const unsubscribes = [];

  const seedIfEmpty = (key, path, docs) => {
    if (seeded.has(key) || !docs.length) return;
    seeded.add(key);
    commit(docs.map((item) => ({ type: "set", path, id: item.id, data: item })))
      .then(() => setStatus("synced"))
      .catch((error) => {
        setStatus("error");
        console.warn("[pos] seeding failed", error);
      });
  };

  for (const { slice, path, sort } of COLLECTIONS) {
    unsubscribes.push(
      onSnapshot(
        collection(db, path),
        { includeMetadataChanges: true },
        (snapshot) => {
          /* An empty result from the cache only means "not downloaded
             yet". Wait for the server before deciding the collection is
             genuinely empty and needs seeding from this device. */
          if (snapshot.empty) {
            if (!snapshot.metadata.fromCache) {
              seedIfEmpty(slice, path, getState()[slice]);
            }
            return;
          }
          seeded.add(slice);
          setStatus("synced");
          const docs = snapshot.docs.map((d) => d.data()).sort(sort);
          onRemote({ type: "remote/merge", slice, docs });
        },
        (error) => {
          setStatus("error");
          console.warn(`[pos] ${path} subscription failed`, error);
        },
      ),
    );
  }

  unsubscribes.push(
    onSnapshot(
      doc(db, ...SETTINGS_PATH),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.exists()) {
          if (!snapshot.metadata.fromCache && !seeded.has("settings")) {
            seeded.add("settings");
            commit([
              {
                type: "set",
                path: SETTINGS_PATH[0],
                id: SETTINGS_PATH[1],
                data: getState().settings,
              },
            ]).catch((error) => console.warn("[pos] seeding failed", error));
          }
          return;
        }
        seeded.add("settings");
        onRemote({ type: "remote/settings", settings: snapshot.data() });
      },
      (error) => {
        setStatus("error");
        console.warn("[pos] settings subscription failed", error);
      },
    ),
  );

  return () => unsubscribes.forEach((stop) => stop());
}
