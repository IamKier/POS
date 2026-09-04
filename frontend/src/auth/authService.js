import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
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

export const auth = firebaseEnabled ? getAuth(app) : null;

/**
 * A staff member is a Firebase Auth account plus a users/{uid}
 * document holding their role. The role lives in Firestore rather than
 * in a custom claim because claims can only be set by the Admin SDK,
 * which needs a server and the paid plan. Security rules read this
 * document directly, so a cashier cannot promote themselves: the rules
 * only let a manager write to users.
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
          user: { uid: user.uid, email: user.email, name: user.displayName },
          profile: snapshot.exists() ? snapshot.data() : null,
          ready: true,
        });
      },
      () => onChange({ user: null, profile: null, ready: true }),
    );
  });

  return () => {
    stopProfile?.();
    stopAuth();
  };
}

export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export function signOutNow() {
  return signOut(auth);
}

/** True while nobody has an account yet, which is what opens the owner form. */
export async function noStaffYet() {
  const existing = await getDocs(query(collection(db, "users"), limit(1)));
  return existing.empty;
}

/**
 * The first account is the owner and becomes a manager. Everyone after
 * that is created by a manager from the Staff screen, which is why this
 * refuses to run once anyone exists.
 */
export async function createOwner(email, password, name) {
  if (!(await noStaffYet())) {
    throw new Error("An account already exists. Ask a manager to add you.");
  }
  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  await updateProfile(credential.user, { displayName: name.trim() });
  await writeProfile(credential.user.uid, {
    email: email.trim(),
    name: name.trim(),
    role: "manager",
  });
}

function writeProfile(uid, data) {
  return setDoc(doc(db, "users", uid), {
    uid,
    ...data,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Creating an account normally signs you in as it, which would kick the
 * manager out of their own register mid-shift. A second Firebase app
 * has its own auth session, so the new account is created there and
 * discarded, leaving the manager exactly where they were.
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

export function createStaff({ email, password, name, role }) {
  return withSecondaryAuth(async (secondaryAuth) => {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email.trim(),
      password,
    );
    await updateProfile(credential.user, { displayName: name.trim() });
    await writeProfile(credential.user.uid, {
      email: email.trim(),
      name: name.trim(),
      role,
    });
  });
}

/**
 * A cashier voids a sale or applies a discount, and a manager approves
 * it at the till by entering their own credentials. The approval runs
 * on the secondary app so the cashier stays signed in, and it verifies
 * the role rather than just the password.
 */
export function approveAsManager(email, password) {
  return withSecondaryAuth(async (secondaryAuth) => {
    const credential = await signInWithEmailAndPassword(
      secondaryAuth,
      email.trim(),
      password,
    );
    const profile = await getDoc(doc(db, "users", credential.user.uid));
    if (!profile.exists() || profile.data().role !== "manager") {
      throw new Error("That account is not a manager.");
    }
    return {
      uid: credential.user.uid,
      name: profile.data().name,
      email: profile.data().email,
    };
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
  if (code.includes("invalid-credential") || code.includes("wrong-password"))
    return "That email and password do not match.";
  if (code.includes("user-not-found")) return "No account with that email.";
  if (code.includes("email-already-in-use"))
    return "That email already has an account.";
  if (code.includes("weak-password"))
    return "Use at least six characters for the password.";
  if (code.includes("invalid-email")) return "That email does not look right.";
  if (code.includes("too-many-requests"))
    return "Too many attempts. Wait a moment and try again.";
  if (code.includes("network-request-failed"))
    return "No connection, so signing in is not possible right now.";
  return error?.message ?? "Something went wrong.";
}
