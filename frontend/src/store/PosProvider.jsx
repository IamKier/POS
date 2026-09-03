import { useEffect, useMemo, useReducer } from "react";
import { PosContext } from "./context.js";
import { reducer, hydrate, STORAGE_KEY } from "./reducer.js";
import { computeTotals } from "../lib/cart.js";

function readStored() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * There is no backend yet. State lives in a reducer and is mirrored to
 * localStorage so a refresh does not wipe an open cart or the day's
 * sales. Swapping in Supabase or IndexedDB later means replacing this
 * file, not the screens.
 */
export default function PosProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () =>
    hydrate(readStored()),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked. The session still works in memory.
    }
  }, [state]);

  const value = useMemo(() => {
    const activeCart = state.carts[state.activeTabId] ?? {
      items: [],
      discount: { type: "percent", value: 0 },
      note: "",
    };
    return {
      ...state,
      dispatch,
      activeCart,
      totals: computeTotals(activeCart.items, activeCart.discount, state.settings),
      productById: Object.fromEntries(state.products.map((p) => [p.id, p])),
      categoryById: Object.fromEntries(state.categories.map((c) => [c.id, c])),
    };
  }, [state]);

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}
