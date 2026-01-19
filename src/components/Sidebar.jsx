// src/components/Sidebar.jsx
import React, { useMemo } from "react"
import { Layout, Menu, Tooltip, Spin } from "antd"
import { useLocation, useNavigate } from "react-router-dom"
import { useTabs } from "@/context/TabsContext"

const { Sider } = Layout

function normalizeIconName(value) {
  if (!value) return "default"
  const v = String(value).trim()
  // если в БД уже лежит "economics.svg" или "/icons/economics.svg" — нормализуем
  return v.replace(/^\/?icons\//, "").replace(/\.svg$/i, "") || "default"
}

function getIconUrl(iconName) {
  const name = normalizeIconName(iconName)
  // BASE_URL важен для корректной работы на GCS и при base:"./"
  const base = import.meta.env.BASE_URL || "/"
  return `${base}icons/${name}.svg`
}

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { tabs, loading } = useTabs()

  const menuItems = useMemo(() => {
    return (tabs || [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((t) => {
        const iconSrc = getIconUrl(t.icon)

        const icon = (
          <img
            src={iconSrc}
            alt=""
            width={18}
            height={18}
            style={{ display: "block" }}
            onError={(e) => {
              // fallback
              const fallback = getIconUrl("default")
              if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback
            }}
          />
        )

        return {
          key: t.path,
          icon: <Tooltip title={t.name}>{icon}</Tooltip>,
          label: <span title={t.name}>{t.name}</span>,
        }
      })
  }, [tabs])

  const selectedKey = useMemo(() => {
    // точное совпадение по path, иначе — ближайший префикс
    const path = location.pathname
    const exact = menuItems.find((i) => i.key === path)?.key
    if (exact) return exact

    const byPrefix = menuItems
      .map((i) => i.key)
      .filter((k) => path.startsWith(k))
      .sort((a, b) => b.length - a.length)[0]

    return byPrefix || menuItems[0]?.key
  }, [location.pathname, menuItems])

  return (
    <Sider width={240} theme="light" style={{ borderRight: "1px solid #f0f0f0" }}>
      <div style={{ padding: 12, display: "flex", justifyContent: "center" }}>
        {loading ? <Spin size="small" /> : null}
      </div>

      <Menu
        mode="inline"
        selectedKeys={selectedKey ? [selectedKey] : []}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ borderRight: 0 }}
      />
    </Sider>
  )
}
