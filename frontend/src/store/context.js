import { createContext, useContext } from "react";

export const PosContext = createContext(null);

export function usePos() {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error("usePos must be used inside a PosProvider");
  return ctx;
}
