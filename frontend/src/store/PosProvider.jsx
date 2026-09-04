import { useEffect, useMemo, useReducer, useRef } from "react";
import { PosContext } from "./context.js";
import { reducer } from "./reducer.js";
import { storage } from "../data/storage.js";
import { pushToCloud, startCloudSync } from "../data/cloudSync.js";
import { computeTotals } from "../lib/cart.js";

/**
 * State lives in one reducer. Persistence happens underneath it:
 * localStorage always, Firestore as well when the project is
 * configured. Screens never touch either one, which is what keeps the
 * storage decision reversible.
 */
export default function PosProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => storage.load());

  const latest = useRef(state);
  const previous = useRef(state);
  /* Set just before a remote snapshot is dispatched, so the state it
     produces is not immediately written back to where it came from. */
  const fromCloud = useRef(false);

  useEffect(() => {
    storage.save(state);
    latest.current = state;

    const prev = previous.current;
    previous.current = state;

    if (fromCloud.current) {
      fromCloud.current = false;
      return;
    }
    if (prev !== state) pushToCloud(prev, state);
  }, [state]);

  /* Other tabs on this machine. */
  useEffect(
    () =>
      storage.subscribe((next) =>
        dispatch({ type: "state/replace", state: next }),
      ),
    [],
  );

  /* Other devices, through Firestore. */
  useEffect(
    () =>
      startCloudSync({
        getState: () => latest.current,
        onRemote: (action) => {
          fromCloud.current = true;
          dispatch(action);
        },
      }),
    [],
  );

  const value = useMemo(() => {
    const activeCart = state.carts[state.activeTabId] ?? {
      items: [],
      discount: { type: "percent", value: 0 },
      note: "",
      customer: null,
    };
    return {
      ...state,
      dispatch,
      activeCart,
      totals: computeTotals(
        activeCart.items,
        activeCart.discount,
        state.settings,
        activeCart.customer,
      ),
      productById: Object.fromEntries(state.products.map((p) => [p.id, p])),
      categoryById: Object.fromEntries(state.categories.map((c) => [c.id, c])),
    };
  }, [state]);

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}
