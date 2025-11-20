// src/main.jsx
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import { BrowserRouter } from "react-router-dom"
import { AuthProvider } from "./auth/AuthContext"
import TabsProvider from "./context/TabsContext"
import { Toaster } from "react-hot-toast"
import loadYandexMaps from "@/utils/loadYandexMaps"
import { ConfigProvider, App as AntdApp } from "antd"
import { antdTheme } from "@/theme/antdTheme"

import "@fontsource/inter/300.css"
import "@fontsource/inter/400.css"
import "@fontsource/inter/500.css"
import "@fontsource/inter/600.css"
import "./styles/global.css"
import "./styles/tableStyles.css"

console.log(
  "🔑 VITE_YANDEX_MAPS_API_KEY =",
  import.meta.env.VITE_YANDEX_MAPS_API_KEY
)

loadYandexMaps()
  .then(() => {
    const root = document.getElementById("root")
    if (root) {
      ReactDOM.createRoot(root).render(
        <BrowserRouter>
          <AuthProvider>
            <TabsProvider>
              <ConfigProvider theme={antdTheme}>
                <AntdApp>
                  <App />
                  <Toaster position="bottom-center" />
                </AntdApp>
              </ConfigProvider>
            </TabsProvider>
          </AuthProvider>
        </BrowserRouter>
      )
    } else {
      console.error("❌ Не найден элемент root в index.html")
    }
  })
  .catch((error) => {
    console.error("❌ Не удалось загрузить Yandex Maps:", error)
    alert(
      "Не удалось загрузить Яндекс.Карты. Проверьте API ключ, ограничения и домен."
    )
  })
