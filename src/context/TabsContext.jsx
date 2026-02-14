import { createContext, useContext } from "react"

export const TabsContext = createContext(null)

export function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error("useTabs must be used within <TabsProvider>")
  return ctx
}
