import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
} from "firebase/firestore";
import { app, config, db, firebaseEnabled } from "../data/firebase.js";
import {
  checkRememberedPin,
  normalizeCode,
  pinPassword,
  rememberStaff,
  staffEmail,
} from "./pin.js";

export const auth = firebaseEnabled ? getAuth(app) : null;

/**
 * A staff member is a Firebase Auth account plus a users/{uid} document
 * holding their code, name and role. The role lives in Firestore rather
 * than in a custom auth claim, because claims can only be set by the
 * Admin SDK, which needs a server and the paid plan. Security rules
 * read that document, and only a manager can write users, so a cashier
 * cannot promote themselves.
 */
export function watchUser(onChange) {
  if (!auth) return () => {};

  let stopProfile = null;

  const stopAuth = onAuthStateChanged(auth, (user) => {
    stopProfile?.();
    stopProfile = null;

    if (!user) {
      onChange({ user: null, profile: null, ready: true });
      return;
    }

    /* Live, so a role change takes effect without signing out. */
    stopProfile = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        onChange({
          user: { uid: user.uid, name: user.displayName },
          profile: snapshot.exists() ? snapshot.data() : null,
          ready: true,
        });
      },
      () => onChange({ user: { uid: user.uid }, profile: null, ready: true }),
    );
  });

  return () => {
    stopProfile?.();
    stopAuth();
  };
}

/**
 * Online sign-in. On success the device remembers enough to repeat it
 * offline next time.
 */
export async function signInWithPin(code, pin) {
  const credential = await signInWithEmailAndPassword(
    auth,
    staffEmail(code),
    pinPassword(pin),
  );
  const profile = await getDoc(doc(db, "users", credential.user.uid));
  await rememberStaff({
    code,
    pin,
    uid: credential.user.uid,
    name: profile.data()?.name ?? code,
    role: profile.data()?.role ?? "cashier",
  });
  return credential.user;
}

/** The offline path: the PIN is checked against what this device cached. */
export function signInOffline(code, pin) {
  return checkRememberedPin(code, pin);
}

export function signOutNow() {
  return signOut(auth);
}

export async function noStaffYet() {
  const existing = await getDocs(query(collection(db, "users"), limit(1)));
  return existing.empty;
}

function writeProfile(uid, data) {
  return setDoc(doc(db, "users", uid), {
    uid,
    ...data,
    createdAt: new Date().toISOString(),
  });
}

/**
 * The first account is the owner and becomes a manager. Everyone after
 * is created by a manager from the Staff screen, which is why this
 * refuses once anyone exists.
 */
export async function createOwner({ code, name, pin }) {
  if (!(await noStaffYet())) {
    throw new Error("An account already exists. Ask a manager to add you.");
  }
  const credential = await createUserWithEmailAndPassword(
    auth,
    staffEmail(code),
    pinPassword(pin),
  );
  await updateProfile(credential.user, { displayName: name.trim() });
  await writeProfile(credential.user.uid, {
    code: normalizeCode(code),
    name: name.trim(),
    role: "manager",
  });
  await rememberStaff({
    code,
    pin,
    uid: credential.user.uid,
    name: name.trim(),
    role: "manager",
  });
}

/**
 * Creating an account normally signs you in as it, which would throw
 * the manager off their own register mid-shift. A second Firebase app
 * has its own session, so the account is created there and discarded.
 */
async function withSecondaryAuth(work) {
  const secondary = initializeApp(config, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondary);
  try {
    return await work(secondaryAuth);
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondary).catch(() => {});
  }
}

export function createStaff({ code, name, pin, role }) {
  return withSecondaryAuth(async (secondaryAuth) => {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      staffEmail(code),
      pinPassword(pin),
    );
    await updateProfile(credential.user, { displayName: name.trim() });
    await writeProfile(credential.user.uid, {
      code: normalizeCode(code),
      name: name.trim(),
      role,
    });
  });
}

/**
 * A manager approves a void or a discount by entering their own code
 * and PIN at the till. It runs on the secondary session so the cashier
 * stays signed in, and it verifies the role rather than the PIN alone.
 *
 * With no internet it falls back to what this device remembers, so an
 * approval is still possible on a till the manager has used before.
 */
export async function approveAsManager(code, pin) {
  if (!window.navigator.onLine) {
    const remembered = await signInOffline(code, pin);
    if (!remembered || remembered.role !== "manager") {
      throw new Error(
        "No connection, and this register does not recognise that manager PIN.",
      );
    }
    return { uid: remembered.uid, name: remembered.name, offline: true };
  }

  return withSecondaryAuth(async (secondaryAuth) => {
    const credential = await signInWithEmailAndPassword(
      secondaryAuth,
      staffEmail(code),
      pinPassword(pin),
    );
    const profile = await getDoc(doc(db, "users", credential.user.uid));
    if (!profile.exists() || profile.data().role !== "manager") {
      throw new Error("That code is not a manager.");
    }
    return { uid: credential.user.uid, name: profile.data().name };
  });
}

/** Self-service, because resetting someone else's PIN needs the Admin SDK. */
export async function changeMyPin(code, currentPin, newPin) {
  const credential = EmailAuthProvider.credential(
    staffEmail(code),
    pinPassword(currentPin),
  );
  await reauthenticateWithCredential(auth.currentUser, credential);
  await updatePassword(auth.currentUser, pinPassword(newPin));
  const profile = await getDoc(doc(db, "users", auth.currentUser.uid));
  await rememberStaff({
    code,
    pin: newPin,
    uid: auth.currentUser.uid,
    name: profile.data()?.name ?? code,
    role: profile.data()?.role ?? "cashier",
  });
}

export function listStaff(onChange) {
  return onSnapshot(collection(db, "users"), (snapshot) =>
    onChange(snapshot.docs.map((d) => d.data())),
  );
}

export function setRole(uid, role) {
  return setDoc(doc(db, "users", uid), { role }, { merge: true });
}

/** Firebase error codes are not sentences. These are. */
export function readableAuthError(error) {
  const code = error?.code ?? "";
  if (code.includes("configuration-not-found"))
    return "Sign-in is not switched on for this project yet. In the Firebase console, open Authentication, Sign-in method, and enable Email/Password.";
  if (code.includes("invalid-credential") || code.includes("wrong-password"))
    return "That code and PIN do not match.";
  if (code.includes("user-not-found")) return "No staff member with that code.";
  if (code.includes("email-already-in-use"))
    return "That staff code is taken. Pick another.";
  if (code.includes("weak-password"))
    return "That PIN is too short for Firebase to accept.";
  if (code.includes("invalid-email")) return "That staff code cannot be used.";
  if (code.includes("too-many-requests"))
    return "Too many attempts. Wait a moment and try again.";
  if (code.includes("network-request-failed"))
    return "No connection. If you have signed in on this register before, your PIN still works.";
  return error?.message ?? "Something went wrong.";
}

/** True when the project has no sign-in provider switched on. */
export function isAuthUnconfigured(error) {
  return String(error?.code ?? "").includes("configuration-not-found");
}
