import { useEffect, useMemo, useReducer } from "react";
import { PosContext } from "./context.js";
import { reducer } from "./reducer.js";
import { storage } from "../data/storage.js";
import { computeTotals } from "../lib/cart.js";

/**
 * State lives in one reducer and is persisted through a single adapter
 * (src/data/storage.js). Screens never touch storage themselves, so
 * moving to Firebase or Mongo means writing one adapter, not editing
 * every page.
 */
export default function PosProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => storage.load());

  useEffect(() => {
    storage.save(state);
  }, [state]);

  /* Another tab of the same till, and later the server, pushes changes
     in here. dispatch runs from the callback rather than the effect
     body, so this is a subscription and not a cascading render. */
  useEffect(
    () => storage.subscribe((next) => dispatch({ type: "state/replace", state: next })),
    [],
  );

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
      totals: computeTotals(
        activeCart.items,
        activeCart.discount,
        state.settings,
      ),
      productById: Object.fromEntries(state.products.map((p) => [p.id, p])),
      categoryById: Object.fromEntries(state.categories.map((c) => [c.id, c])),
    };
  }, [state]);

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}
