import { useEffect, useState } from "react";
import PosProvider from "./store/PosProvider.jsx";
import AuthProvider from "./auth/AuthProvider.jsx";
import { useAuth } from "./auth/context.js";
import { usePos } from "./store/context.js";
import Login from "./pages/Login.jsx";
import RegisterShell from "./shells/RegisterShell.jsx";
import AdminShell from "./shells/AdminShell.jsx";

/**
 * Two panels, deliberately separate.
 *
 * The register is one screen with no navigation on it, because a
 * cashier with a queue should not be one mis-tap away from the price
 * list. The admin panel is everything else, and a cashier never reaches
 * it: the switch is only rendered for a manager, and the Firestore
 * rules reject their writes even if they somehow did.
 *
 * No router, so the URL stays free. Which panel is open is a piece of
 * state, and the register is what opens.
 */
function Panels() {
  const { isManager } = useAuth();
  const { settings } = usePos();
  const [panel, setPanel] = useState("register");

  /* Applied here rather than in the admin sidebar, so the register
     honours the theme without depending on that screen being visited. */
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      settings.theme === "dark" ? "dark" : "light",
    );
  }, [settings.theme]);

  if (panel === "admin" && isManager) {
    return <AdminShell onOpenRegister={() => setPanel("register")} />;
  }

  return <RegisterShell onOpenAdmin={() => setPanel("admin")} />;
}

function Gate() {
  const { ready, user, requiresAuth, unlockLocally } = useAuth();

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <p className="text-sm text-muted">Opening the register</p>
      </div>
    );
  }

  if (requiresAuth && !user) return <Login onOfflineUnlock={unlockLocally} />;

  return (
    <PosProvider>
      <Panels />
    </PosProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
