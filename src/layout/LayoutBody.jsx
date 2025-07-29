// src/layout/LayoutBody.jsx

import React from 'react'
import { Outlet } from 'react-router-dom'
import { Spin } from 'antd'
import Sidebar from '@/components/Sidebar'
import Header from './Header'
import { useTabs } from '@/context/TabsContext'

const LayoutBody = () => {
  const { loading } = useTabs()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'visible' // ✅ тултипы и т.п.
        }}
      >
        <Header />
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 0
          }}
        >
          {loading ? (
            <div style={{ marginTop: 64, textAlign: 'center' }}>
              <Spin size="large" />
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  )
}

export default LayoutBody
