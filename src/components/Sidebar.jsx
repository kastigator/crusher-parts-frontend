// src/components/Sidebar.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Layout, Menu, Tooltip, Spin } from "antd"
import { useLocation, useNavigate } from "react-router-dom"
import { useTabs } from "@/context/TabsContext"

const { Sider } = Layout

const CATALOG_ROOT_PATH = "/catalogs"
const CATALOG_CHILD_PATHS = new Set([
  "/clients",
  "/suppliers",
  "/supplier-parts",
  "/original-parts",
  "/materials",
  "/tnved-codes",
])

const ADMIN_PATH = "/admin"

function normalizeIconName(value) {
  if (!value) return "default"
  const v = String(value).trim()
  // если в БД уже лежит "economics.svg" или "/icons/economics.svg" - нормализуем
  return v.replace(/^\/?icons\//, "").replace(/\.svg$/i, "") || "default"
}

let iconsBaseUrlCache

function resolveIconsBaseUrl() {
  if (iconsBaseUrlCache) return iconsBaseUrlCache

  const rawBase = import.meta.env.BASE_URL ?? "/"
  const safeBase = rawBase === "/" ? "./" : rawBase

  if (typeof window === "undefined") {
    iconsBaseUrlCache = `${safeBase}icons/`
    return iconsBaseUrlCache
  }

  const pathname = window.location.pathname
  const lastSegment = pathname.split("/").filter(Boolean).slice(-1)[0] || ""
  const looksLikeFile = lastSegment.includes(".")
  const directory = pathname.endsWith("/")
    ? pathname
    : looksLikeFile
      ? pathname.replace(/[^/]+$/, "")
      : `${pathname}/`
  const fallbackOrigin = `${window.location.origin}${directory}`

  let resolvedBase = fallbackOrigin

  try {
    resolvedBase = new URL(safeBase, fallbackOrigin).href
  } catch {
    resolvedBase = fallbackOrigin
  }

  iconsBaseUrlCache = new URL("icons/", resolvedBase).href
  return iconsBaseUrlCache
}

function getIconUrl(iconName) {
  const name = normalizeIconName(iconName)
  return `${resolveIconsBaseUrl()}${name}.svg`
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

  const { menuItems, parentByKey } = useMemo(() => {
    const sorted = (tabs || [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    const otherTabs = []
    const catalogTabs = []
    let catalogInsertIndex = null

    sorted.forEach((tab) => {
      if (!tab?.path) return
      if (tab.path === ADMIN_PATH) return

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

      const childItems = []
      catalogChildren.forEach((tab) => {
        childItems.push(buildMenuItem(tab, { withIcon: false }))
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
    const parentKey = parentByKey.get(selectedKey)
    if (parentKey) {
      setOpenKeys((prev) => (prev.includes(parentKey) ? prev : [parentKey]))
      return
    }
    setOpenKeys([])
  }, [parentByKey, selectedKey])

  return (
    <Sider width={240} theme="light" style={{ borderRight: "1px solid #f0f0f0" }}>
      <div style={{ padding: 12, display: "flex", justifyContent: "center" }}>
        {loading ? <Spin size="small" /> : null}
      </div>

      <Menu
        mode="inline"
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
