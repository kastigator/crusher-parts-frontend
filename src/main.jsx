// src/main.jsx
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import { BrowserRouter, HashRouter } from "react-router-dom"
import AuthProvider from "./auth/AuthProvider"
import TabsProvider from "./context/TabsProvider"
import { Toaster } from "react-hot-toast"
import loadYandexMaps from "@/utils/loadYandexMaps"
import { ConfigProvider, App as AntdApp } from "antd"
import ruRU from "antd/locale/ru_RU"
import { antdTheme } from "@/theme/antdTheme"
import AntdAppBridge from "@/components/common/AntdAppBridge"
import { loadRuntimeConfig } from "@/config/runtimeConfig"

import "@fontsource/inter/300.css"
import "@fontsource/inter/400.css"
import "@fontsource/inter/500.css"
import "@fontsource/inter/600.css"
import "./styles/global.css"
import "./styles/tableStyles.css"

const baseUrl = import.meta.env.BASE_URL || "/"
const routerBase = baseUrl === "./" ? "/" : baseUrl
const useHashRouter =
  typeof window !== "undefined" &&
  window.location &&
  window.location.host === "storage.googleapis.com"

const bootstrap = async () => {
  await loadRuntimeConfig()
  await loadYandexMaps()

  const root = document.getElementById("root")
  if (root) {
    ReactDOM.createRoot(root).render(
      useHashRouter ? (
          <HashRouter>
            <AuthProvider>
              <TabsProvider>
                <ConfigProvider theme={antdTheme} locale={ruRU}>
                  <AntdApp>
                    <AntdAppBridge />
                    <App />
                    <Toaster position="bottom-center" />
                  </AntdApp>
                </ConfigProvider>
              </TabsProvider>
            </AuthProvider>
          </HashRouter>
      ) : (
          <BrowserRouter basename={routerBase}>
            <AuthProvider>
              <TabsProvider>
                <ConfigProvider theme={antdTheme} locale={ruRU}>
                  <AntdApp>
                    <AntdAppBridge />
                    <App />
                    <Toaster position="bottom-center" />
                  </AntdApp>
                </ConfigProvider>
              </TabsProvider>
            </AuthProvider>
          </BrowserRouter>
      )
    )
  } else {
    console.error("❌ Не найден элемент root в index.html")
  }
}

bootstrap().catch((error) => {
  console.error("❌ Не удалось запустить приложение:", error)
  const root = document.getElementById("root")
  if (root) {
    root.textContent = "Приложение не запущено: некорректная runtime-конфигурация."
  }
})
