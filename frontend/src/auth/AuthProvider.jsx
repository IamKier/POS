import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./context.js";
import { watchUser } from "./authService.js";
import { firebaseEnabled } from "../data/firebase.js";

/**
 * With no Firebase project configured the app has nobody to
 * authenticate against, so it runs open, exactly as it did before auth
 * existed. That keeps a fresh clone and the local-only mode usable
 * rather than locking someone out of their own demo.
 */
const OPEN_MODE = {
  ready: true,
  user: null,
  profile: null,
  role: "manager",
  isManager: true,
  requiresAuth: false,
  offline: false,
};

export default function AuthProvider({ children }) {
  const [state, setState] = useState({
    ready: !firebaseEnabled,
    user: null,
    profile: null,
  });

  /**
   * A session this register unlocked by itself: either the till is
   * offline and recognised a PIN it had cached, or sign-in is not
   * switched on for the project yet. Either way the person is at the
   * counter and the alternative is a shop that cannot sell.
   */
  const [local, setLocal] = useState(null);

  useEffect(() => watchUser(setState), []);

  const unlockLocally = useCallback((identity) => setLocal(identity), []);

  const value = useMemo(() => {
    if (!firebaseEnabled) return { ...OPEN_MODE, unlockLocally };

    if (local) {
      return {
        ready: true,
        user: { uid: local.uid, name: local.name },
        profile: { name: local.name, role: local.role, code: local.code },
        role: local.role,
        isManager: local.role === "manager",
        requiresAuth: true,
        offline: true,
        unlockLocally,
      };
    }

    const role = state.profile?.role ?? "cashier";
    return {
      ready: state.ready,
      user: state.user,
      profile: state.profile,
      role,
      isManager: role === "manager",
      requiresAuth: true,
      offline: false,
      unlockLocally,
    };
  }, [state, local, unlockLocally]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
