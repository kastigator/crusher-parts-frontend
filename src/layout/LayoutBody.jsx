import React from "react"
import { Outlet } from "react-router-dom"
import { Spin } from "antd"
import Sidebar from "@/components/Sidebar"
import Header from "./Header"
import { useTabs } from "@/context/TabsContext"

const LayoutBody = () => {
  const { loading } = useTabs()

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden", // одна область прокрутки
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden", // 🚫 не прокручиваем тут
        }}
      >
        <Header />

        {/* Главная область контента */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",       // ✅ только здесь скролл
            overflowX: "hidden",
            minHeight: 0,
            background: "#f9fafb",
            scrollbarGutter: "stable both-edges", // ✅ предотвращает сдвиги при появлении скролла
          }}
        >
          {loading ? (
            <div style={{ marginTop: 64, textAlign: "center" }}>
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
