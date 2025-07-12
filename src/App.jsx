import React from 'react'
import AppRouter from './router/AppRouter'
import { TabsProvider } from './context/TabsContext'

function App() {
  return (
    <TabsProvider>
      <AppRouter />
    </TabsProvider>
  )
}

export default App