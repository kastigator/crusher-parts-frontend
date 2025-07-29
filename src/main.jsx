import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { TabsProvider } from './context/TabsContext'
import { Toaster } from 'react-hot-toast'

import loadGoogleMaps from '@/utils/loadGoogleMaps'

import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'

import './styles/global.css'
import './styles/tableStyles.css' // ✅ подключаем стили для всех таблиц

// Загружаем Google Maps JavaScript API перед стартом
loadGoogleMaps()
  .then(() => {
    console.log('✅ Google Maps API загружен')

    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <BrowserRouter>
          <AuthProvider>
            <TabsProvider>
              <App />
              <Toaster position="bottom-center" />
            </TabsProvider>
          </AuthProvider>
        </BrowserRouter>
      </React.StrictMode>
    )
  })
  .catch((error) => {
    console.error('❌ Ошибка загрузки Google Maps API:', error)
    alert('Не удалось загрузить карты. Проверьте API ключ и настройки.')
  })
