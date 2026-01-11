import React, { useEffect, useState } from "react"
import { Tooltip } from "antd"
import * as AntIcons from "@ant-design/icons"
import {
  FaIndustry,
  FaCogs,
  FaTools,
  FaWarehouse,
  FaWrench,
  FaTruck,
  FaTruckMoving,
  FaHammer,
  FaHardHat,
  FaRobot,
} from "react-icons/fa"
import { useNavigate, useLocation } from "react-router-dom"
import { useTabs } from "@/context/TabsContext"

// Набор тех-иконок (react-icons/fa)
const techIcons = {
  FaIndustry,
  FaCogs,
  FaTools,
  FaWarehouse,
  FaWrench,
  FaTruck,
  FaTruckMoving,
  FaHammer,
  FaHardHat,
  FaRobot,
}

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

  const visibleTabs = tabs
    .filter((tab) => permissions.includes(tab.id))
    .sort((a, b) => a.sort_order - b.sort_order)

  const ICON_SIZE = 24

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? "1" : "0")
    } catch {
      // ignore storage failures
    }
  }, [collapsed])

  const renderIcon = (iconNameRaw) => {
    const name = (iconNameRaw || "").trim()
    if (name && AntIcons[name]) {
      const C = AntIcons[name]
      return <C style={{ fontSize: ICON_SIZE }} />
    }
    if (name && techIcons[name]) {
      const C = techIcons[name]
      return <C size={ICON_SIZE} />
    }
    const Q = AntIcons.QuestionOutlined
    return <Q style={{ fontSize: ICON_SIZE }} />
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
              title={collapsed ? tab.name || "Вкладка" : null}
              placement="right"
              mouseEnterDelay={0.2}
            >
              <div
                onClick={() =>
                  navigate(
                    tab.path?.startsWith("/") ? tab.path : `/${tab.path}`,
                  )
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
                  {renderIcon(tab.icon)}
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
              <AntIcons.MenuUnfoldOutlined style={{ fontSize: 18 }} />
            ) : (
              <AntIcons.MenuFoldOutlined style={{ fontSize: 18 }} />
            )}
            {!collapsed && <span style={{ fontSize: 12 }}>Свернуть</span>}
          </div>
        </Tooltip>
      </div>
    </div>
  )
}

export default Sidebar
