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
        overflow: "hidden", // одна область прокрутки — внутри контент-зоны
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Header />

        {/* Главная зона прокрутки */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            minHeight: 0,
            background: "#f9fafb",
            scrollbarGutter: "stable both-edges",
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
