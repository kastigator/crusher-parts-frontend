import React from 'react'
import { TabsProvider } from '../context/TabsContext'
import LayoutBody from './LayoutBody'

const MainLayout = () => (
  <TabsProvider>
    <LayoutBody />
  </TabsProvider>
)

export default MainLayout
