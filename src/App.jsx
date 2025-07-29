// src/App.jsx
import React from 'react'
import AppRouter from './router/AppRouter'
import { ConfigProvider } from 'antd'
import { antdTheme } from '@/theme/antdTheme'

function App() {
  return (
    <ConfigProvider theme={antdTheme}>
      <AppRouter />
    </ConfigProvider>
  )
}

export default App
