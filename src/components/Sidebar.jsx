// src/components/Sidebar.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Layout, Menu, Tooltip, Spin, Button } from "antd"
import { useLocation, useNavigate } from "react-router-dom"
import { useTabs } from "@/context/TabsContext"
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons"
import { buildIconPath, resolveIconUrl } from "@/constants/sidebarIcons"

const { Sider } = Layout

const CATALOG_ROOT_PATH = "/catalogs"
const HIDDEN_LEGACY_PATHS = new Set([
  "/tnved-origin-rules",
  "/logistics-routes",
  "/country-risk-profiles",
])
const CATALOG_CHILD_PATHS = new Set([
  "/clients",
  "/suppliers",
  "/supplier-parts",
  "/original-parts",
  "/standard-parts",
  "/equipment-classifier",
  "/materials",
  "/tnved-codes",
  "/logistics-corridors",
])

const ADMIN_PATH = "/admin"
const CATALOG_ICON_BY_PATH = {
  "/clients": "clients",
  "/suppliers": "suppliers",
  "/supplier-parts": "supplier-parts",
  "/original-parts": "original-parts",
  "/standard-parts": "materials",
  "/equipment-classifier": "catalogs",
  "/materials": "materials",
  "/tnved-codes": "tnved-codes",
  "/logistics-corridors": "coverage",
}
const CATALOG_LABEL_BY_PATH = {
  "/original-parts": "OEM детали",
}
const CATALOG_FALLBACK_ITEMS = [
  { path: "/equipment-classifier", name: "Классификатор оборудования", icon: "catalogs" },
  { path: "/standard-parts", name: "Стандартные детали", icon: "materials" },
  { path: "/logistics-corridors", name: "Логистические коридоры", icon: "coverage" },
]

function normalizeIconName(value) {
  if (!value) return "default"
  const v = String(value).trim()
  // если в БД уже лежит "economics.svg" или "/icons/economics.svg" - нормализуем
  return v.replace(/^\/?icons\//, "").replace(/\.svg$/i, "") || "default"
}

function getIconUrl(iconName) {
  const name = normalizeIconName(iconName)
  return resolveIconUrl(buildIconPath(name))
}

function buildMenuItem(tab, { withIcon = true, labelOverride, tooltipOverride } = {}) {
  const labelText = labelOverride ?? tab?.name ?? ""
  const tooltipText = tooltipOverride ?? tab?.name ?? ""
  const iconSrc = getIconUrl(tab?.icon)

  const icon = withIcon ? (
    <img
      src={iconSrc}
      alt=""
      width={18}
      height={18}
      style={{ display: "block" }}
      onError={(e) => {
        const fallback = getIconUrl("default")
        if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback
      }}
    />
  ) : null

  return {
    key: tab?.path,
    icon: withIcon ? <Tooltip title={tooltipText}>{icon}</Tooltip> : null,
    label: <span title={labelText}>{labelText}</span>,
  }
}

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { tabs, loading } = useTabs()
  const [collapsed, setCollapsed] = useState(false)

  const { menuItems, parentByKey } = useMemo(() => {
    const sorted = (tabs || [])
      .slice()
      .filter((tab) => tab?.path && !HIDDEN_LEGACY_PATHS.has(tab.path))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    const otherTabs = []
    const catalogTabs = []
    let adminTab = null
    let usersTab = null
    let catalogInsertIndex = null

    sorted.forEach((tab) => {
      if (!tab?.path) return
      if (tab.path === "/users") {
        usersTab = tab
      }

      if (tab.path === ADMIN_PATH) {
        adminTab = tab
        return
      }

      const isCatalog =
        tab.path === CATALOG_ROOT_PATH || CATALOG_CHILD_PATHS.has(tab.path)

      if (isCatalog) {
        if (catalogInsertIndex === null) catalogInsertIndex = otherTabs.length
        catalogTabs.push(tab)
        return
      }

      otherTabs.push(tab)
    })

    const items = otherTabs.map((tab) => buildMenuItem(tab))
    const parentMap = new Map()

    if (catalogTabs.length) {
      const catalogRoot = catalogTabs.find((t) => t.path === CATALOG_ROOT_PATH) || null
      const catalogChildren = catalogTabs.filter((t) => t.path !== CATALOG_ROOT_PATH)
      const existingCatalogPaths = new Set(catalogChildren.map((t) => t.path))
      CATALOG_FALLBACK_ITEMS.forEach((fallback) => {
        if (!existingCatalogPaths.has(fallback.path)) {
          catalogChildren.push(fallback)
        }
      })

      const childItems = []
      catalogChildren.forEach((tab) => {
        const withFallbackIcon = {
          ...tab,
          icon: tab.icon || CATALOG_ICON_BY_PATH[tab.path] || "catalogs",
          name: CATALOG_LABEL_BY_PATH[tab.path] || tab.name,
        }
        childItems.push(buildMenuItem(withFallbackIcon, { withIcon: true }))
      })

      const catalogLabel = catalogRoot?.name ?? "Каталоги"
      const catalogIconTab = catalogRoot ?? { icon: "catalogs", name: catalogLabel }

      const groupItem = {
        key: "catalogs-group",
        icon: buildMenuItem(catalogIconTab).icon,
        label: <span title={catalogLabel}>{catalogLabel}</span>,
        children: childItems,
      }

      childItems.forEach((child) => {
        if (child?.key) parentMap.set(child.key, groupItem.key)
      })

      const insertAt = catalogInsertIndex ?? items.length
      items.splice(insertAt, 0, groupItem)
    }

    if (adminTab && !usersTab) {
      items.push({ type: "divider" })
      items.push(buildMenuItem(adminTab))
    }

    return { menuItems: items, parentByKey: parentMap }
  }, [tabs])

  const routeKeys = useMemo(() => {
    const keys = []
    const walk = (item) => {
      if (!item) return
      if (typeof item.key === "string" && item.key.startsWith("/")) keys.push(item.key)
      if (Array.isArray(item.children)) item.children.forEach(walk)
    }
    menuItems.forEach(walk)
    return keys
  }, [menuItems])

  const selectedKey = useMemo(() => {
    // точное совпадение по path, иначе - ближайший префикс
    const path = location.pathname
    const exact = routeKeys.find((k) => k === path)
    if (exact) return exact

    const byPrefix = routeKeys
      .filter((k) => path.startsWith(k))
      .sort((a, b) => b.length - a.length)[0]

    return byPrefix || routeKeys[0]
  }, [location.pathname, routeKeys])

  const [openKeys, setOpenKeys] = useState([])

  useEffect(() => {
    if (collapsed) {
      setOpenKeys([])
      return
    }
    const parentKey = parentByKey.get(selectedKey)
    if (parentKey) {
      setOpenKeys((prev) => (prev.includes(parentKey) ? prev : [parentKey]))
      return
    }
    setOpenKeys([])
  }, [collapsed, parentByKey, selectedKey])

  return (
    <Sider
      width={240}
      collapsedWidth={64}
      collapsed={collapsed}
      theme="light"
      style={{ borderRight: "1px solid #f0f0f0" }}
    >
      <div
        style={{
          padding: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 8,
        }}
      >
        {loading ? <Spin size="small" /> : <span />}
        <Button
          size="small"
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed((prev) => !prev)}
        />
      </div>

      <Menu
        mode="inline"
        inlineCollapsed={collapsed}
        selectedKeys={selectedKey ? [selectedKey] : []}
        openKeys={openKeys}
        onOpenChange={setOpenKeys}
        items={menuItems}
        onClick={({ key }) => {
          if (typeof key === "string" && key.startsWith("/")) navigate(key)
        }}
        style={{ borderRight: 0 }}
      />
    </Sider>
  )
}
