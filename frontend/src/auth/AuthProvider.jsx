import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./context.js";
import { watchUser } from "./authService.js";
import { firebaseEnabled } from "../data/firebase.js";

/**
 * With no Firebase project configured the app has nobody to
 * authenticate against, so it runs open, exactly as it did before auth
 * existed. That keeps a fresh clone and the local-only mode usable
 * instead of locking someone out of their own demo.
 */
const OPEN_MODE = {
  ready: true,
  user: null,
  profile: null,
  role: "manager",
  isManager: true,
  requiresAuth: false,
};

export default function AuthProvider({ children }) {
  const [state, setState] = useState(() =>
    firebaseEnabled
      ? { ready: false, user: null, profile: null }
      : { ready: true, user: null, profile: null },
  );

  useEffect(() => watchUser(setState), []);

  const value = useMemo(() => {
    if (!firebaseEnabled) return OPEN_MODE;
    const role = state.profile?.role ?? "cashier";
    return {
      ready: state.ready,
      user: state.user,
      profile: state.profile,
      role,
      isManager: role === "manager",
      requiresAuth: true,
    };
  }, [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
