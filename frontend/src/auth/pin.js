import { config } from "../data/firebase.js";

/**
 * A PIN pad, backed by Firebase Auth.
 *
 * Firebase has no PIN provider, so each staff member is an
 * email-and-password account whose email nobody ever sees or types. The
 * code they type is turned into a reserved-domain address (.invalid is
 * reserved by RFC 2606 for exactly this, and no mail can ever be sent
 * to it), and the PIN becomes the password. The upshot is a number pad
 * at the till with real Firebase sessions underneath, so the security
 * rules keep working unchanged.
 *
 * The PIN is padded because Firebase requires six characters. That is a
 * format requirement, not added secrecy: a 4-digit PIN is 4 digits of
 * entropy whatever it is wrapped in. Firebase rate limits sign-in
 * attempts, and the real control is that the register is behind a
 * counter. Managers are held to six digits because they approve voids.
 */
const STAFF_DOMAIN = `${config.projectId ?? "pos"}.invalid`;

export function staffEmail(code) {
  return `${normalizeCode(code)}@${STAFF_DOMAIN}`;
}

export function normalizeCode(code) {
  return String(code ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function pinPassword(pin) {
  return `${String(pin).trim()}-pos-pin`;
}

export function pinProblem(pin, role = "cashier") {
  const value = String(pin ?? "").trim();
  if (!/^\d+$/.test(value)) return "A PIN is digits only.";
  if (role === "manager" && value.length < 6) {
    return "A manager PIN needs six digits, since it approves voids.";
  }
  if (value.length < 4) return "A PIN needs at least four digits.";
  if (value.length > 6) return "A PIN is at most six digits.";
  return null;
}

export function codeProblem(code) {
  const value = normalizeCode(code);
  if (value.length < 2) return "A staff code needs at least two characters.";
  if (value.length > 20) return "That staff code is too long.";
  return null;
}

/**
 * Local PIN check, for signing in with no internet.
 *
 * Firebase cannot authenticate offline, so a device remembers the staff
 * who have signed in on it before: their code, name, role, and a hash
 * of their PIN. That is enough to unlock the register and attribute
 * sales, and it deliberately only works for people who have already
 * signed in on this device at least once while online.
 *
 * The hash is salted per device and never leaves it. It is not stored
 * in Firestore, because a shared hash of a 4-digit PIN is a 4-digit
 * secret anyone signed in could crack in seconds.
 */
const CACHE_KEY = "pos.staff.cache.v1";

function readCache() {
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Nothing to do. Offline sign-in simply will not be available.
  }
}

function deviceSalt() {
  const cache = readCache();
  if (cache.__salt) return cache.__salt;
  const salt = crypto.randomUUID();
  writeCache({ ...cache, __salt: salt });
  return salt;
}

async function hashPin(code, pin) {
  const material = `${deviceSalt()}:${normalizeCode(code)}:${String(pin).trim()}`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(material),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Called after a successful online sign-in, so the next one can be offline. */
export async function rememberStaff({ code, pin, uid, name, role }) {
  const cache = readCache();
  cache[normalizeCode(code)] = {
    uid,
    name,
    role,
    code: normalizeCode(code),
    pinHash: await hashPin(code, pin),
    rememberedAt: new Date().toISOString(),
  };
  writeCache(cache);
}

/** Returns the staff member if the PIN matches what this device remembers. */
export async function checkRememberedPin(code, pin) {
  const entry = readCache()[normalizeCode(code)];
  if (!entry) return null;
  const hash = await hashPin(code, pin);
  return hash === entry.pinHash ? entry : null;
}

/** Removes one person from this device, used when they are deactivated. */
export function forgetStaff(code) {
  const cache = readCache();
  delete cache[normalizeCode(code)];
  writeCache(cache);
}

export function hasRememberedStaff() {
  return Object.keys(readCache()).some((key) => key !== "__salt");
}

export function forgetRememberedStaff() {
  writeCache({});
}
