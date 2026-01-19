// src/components/Sidebar.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Tooltip } from "antd"
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons"
import { useNavigate, useLocation } from "react-router-dom"
import { useTabs } from "@/context/TabsContext"
import { DEFAULT_ICON_PATH } from "@/constants/sidebarIcons"

const SIDEBAR_COLLAPSE_KEY = "crusher.sidebar.collapsed"

const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { tabs = [], permissions = [], loading } = useTabs()

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1"
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? "1" : "0")
    } catch {
      // ignore
    }
  }, [collapsed])

  const visibleTabs = useMemo(() => {
    return (tabs || [])
      .filter((tab) => tab.is_active !== 0)
      .filter((tab) => permissions.includes(tab.id))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  }, [tabs, permissions])

  const ICON_SIZE = 24

  const toPublicUrl = (p) => {
    const s = (p || "").trim()
    if (!s) return ""

    // если уже абсолютный URL — оставляем
    if (/^https?:\/\//i.test(s)) return s

    // убираем ведущий "/", иначе улетим в https://storage.googleapis.com/icons/...
    const clean = s.startsWith("/") ? s.slice(1) : s

    // важно: строим ссылку относительно текущего URL (index.html),
    // чтобы работало и на storage.googleapis.com/<bucket>/index.html
    // и на <bucket>.storage.googleapis.com/index.html
    return new URL(clean, window.location.href).toString()
  }

  const renderIcon = (iconPathRaw, selected) => {
    const raw = (iconPathRaw || "").trim()
    const iconPath = raw || DEFAULT_ICON_PATH

    const looksLikeSvg =
      iconPath.toLowerCase().endsWith(".svg") ||
      iconPath.includes("icons/") ||
      iconPath.startsWith("/")

    if (!looksLikeSvg) {
      return (
        <img
          src={toPublicUrl(DEFAULT_ICON_PATH)}
          alt=""
          width={ICON_SIZE}
          height={ICON_SIZE}
        />
      )
    }

    const activePath = iconPath.toLowerCase().endsWith(".svg")
      ? iconPath.replace(/\.svg$/i, "-active.svg")
      : iconPath

    const normalUrl = toPublicUrl(iconPath)
    const activeUrl = toPublicUrl(activePath)

    return (
      <img
        src={selected ? activeUrl : normalUrl}
        alt=""
        width={ICON_SIZE}
        height={ICON_SIZE}
        onError={(e) => {
          const fallbackNormal = toPublicUrl(iconPath)
          const fallbackDefault = toPublicUrl(DEFAULT_ICON_PATH)

          if (e.currentTarget.src.includes("-active.svg")) {
            e.currentTarget.src = fallbackNormal
          } else {
            e.currentTarget.src = fallbackDefault
          }
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: collapsed ? 72 : 220,
        minWidth: collapsed ? 72 : 220,
        flexShrink: 0,
        height: "100%",
        backgroundColor: "#f3f4f6",
        borderRight: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        paddingTop: 6,
      }}
    >
      {loading ? (
        <div
          style={{
            fontSize: 12,
            color: "#9ca3af",
            textAlign: "center",
            paddingTop: 12,
          }}
        >
          Загрузка…
        </div>
      ) : visibleTabs.length === 0 ? (
        <Tooltip title="Нет доступных вкладок" placement="right">
          <div
            style={{
              fontSize: 10,
              color: "#9ca3af",
              textAlign: "center",
              padding: 8,
            }}
          >
            Нет вкладок
          </div>
        </Tooltip>
      ) : (
        visibleTabs.map((tab) => {
          const selected =
            location.pathname === tab.path ||
            location.pathname === `/${tab.path}`

          return (
            <Tooltip
              key={tab.id}
              title={tab.tooltip || tab.name || "Вкладка"}
              placement="right"
              mouseEnterDelay={0.2}
            >
              <div
                onClick={() =>
                  navigate(tab.path?.startsWith("/") ? tab.path : `/${tab.path}`)
                }
                style={{
                  height: 56,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: collapsed ? 0 : 10,
                  padding: collapsed ? 0 : "0 12px",
                  position: "relative",
                  cursor: "pointer",
                  color: selected ? "#2563eb" : "#4b5563",
                  background: selected ? "#e5edff" : "transparent",
                  transition:
                    "background 0.15s ease, color 0.15s ease, transform 0.05s ease-in-out",
                }}
                onMouseDown={(e) =>
                  (e.currentTarget.style.transform = "scale(0.98)")
                }
                onMouseUp={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                {selected && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 8,
                      bottom: 8,
                      width: 3,
                      background: "#2563eb",
                      borderRadius: 2,
                    }}
                  />
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    transition: "background 0.15s ease",
                  }}
                >
                  {renderIcon(tab.icon, selected)}
                </div>

                {!collapsed && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: selected ? 600 : 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {tab.name || "Вкладка"}
                  </div>
                )}
              </div>
            </Tooltip>
          )
        })
      )}

      <div
        style={{
          marginTop: "auto",
          padding: 8,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <Tooltip
          title={collapsed ? "Развернуть меню" : "Свернуть меню"}
          placement="right"
        >
          <div
            onClick={() => setCollapsed((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: collapsed ? 0 : 8,
              padding: "8px 10px",
              cursor: "pointer",
              color: "#4b5563",
              borderRadius: 8,
            }}
          >
            {collapsed ? (
              <MenuUnfoldOutlined style={{ fontSize: 18 }} />
            ) : (
              <MenuFoldOutlined style={{ fontSize: 18 }} />
            )}
            {!collapsed && <span style={{ fontSize: 12 }}>Свернуть</span>}
          </div>
        </Tooltip>
      </div>
    </div>
  )
}

export default Sidebar
