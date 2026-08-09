// src/components/Sidebar.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Layout, Menu, Tooltip, Spin, Button } from "antd"
import { useLocation, useNavigate } from "react-router-dom"
import { useTabs } from "@/context/TabsContext"
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons"
import { buildIconPath, resolveIconUrl } from "@/constants/sidebarIcons"
import useCapabilities from "@/hooks/useCapabilities"

const { Sider } = Layout

const CATALOG_ROOT_PATH = "/catalogs"
const HIDDEN_LEGACY_PATHS = new Set([
  "/original-parts",
  "/oem-parts",
  "/standard-parts",
  "/tnved-origin-rules",
  "/logistics-routes",
  "/country-risk-profiles",
  "/supplier-responses",
  "/coverage",
  "/scorecard",
  "/economics",
  "/selection",
  "/sales-quotes",
  "/rfq-workspace",
  "/rfq",
])
const CATALOG_CHILD_PATHS = new Set([
  "/supplier-parts",
  "/materials",
  "/tnved-codes",
  "/logistics-route-templates",
  "/glossary",
])

const ADMIN_PATH = "/admin"
const TRASH_PATH = "/trash"
const WORKSPACE_NAV_GROUPS = [
  {
    paths: ["/client-request-workspace", "/client-requests"],
    label: "Заявки клиентов",
  },
  {
    paths: ["/clients"],
    label: "Клиенты",
  },
  {
    paths: ["/sourcing"],
    label: "Закупочная проработка",
  },
  {
    paths: ["/pricing"],
    label: "Расчёт цены",
  },
  {
    paths: ["/commercial-offers"],
    label: "Коммерческие предложения",
  },
  {
    paths: ["/contracts"],
    label: "Договоры",
  },
  {
    paths: ["/purchase-orders"],
    label: "Исполнение закупки",
  },
  {
    paths: ["/financial-operations"],
    label: "Финансовые операции",
  },
  {
    paths: ["/suppliers"],
    label: "Поставщики",
  },
  {
    paths: ["/warehouse"],
    label: "Склад",
  },
  {
    paths: ["/dispatch-delivery"],
    label: "Отгрузка и доставка",
  },
  {
    paths: ["/completion-lifecycle"],
    label: "Завершение заказа",
  },
  {
    paths: ["/after-sales"],
    label: "Рекламации",
  },
]
const MASTER_DATA_NAV_PATHS = ["/equipment-classifier"]
const CATALOG_NAV_PATHS = [
  CATALOG_ROOT_PATH,
  "/supplier-parts",
  "/materials",
  "/tnved-codes",
  "/logistics-route-templates",
  "/glossary",
]
const CONTROL_NAV_PATHS = ["/kpi"]
const SETTINGS_NAV_PATHS = ["/users", "/measurement-units"]
const ICON_BY_PATH = {
  "/client-request-workspace": "client-request-workspace",
  "/client-requests": "client-requests",
  "/rfq": "rfq",
  "/sourcing": "rfq-workspace",
  "/pricing": "economics",
  "/commercial-offers": "sales-quotes",
  "/contracts": "contracts",
  "/purchase-orders": "purchase-orders",
  "/financial-operations": "economics",
  "/kpi": "kpi",
  "/catalogs": "catalog-health",
  "/clients": "clients",
  "/suppliers": "suppliers",
  "/supplier-parts": "supplier-parts",
  "/equipment-classifier": "equipment-classifier",
  "/glossary": "catalogs",
  "/materials": "materials",
  "/tnved-codes": "tnved-codes",
  "/warehouse": "warehouse",
  "/dispatch-delivery": "warehouse",
  "/completion-lifecycle": "contracts",
  "/after-sales": "contracts",
  "/logistics-route-templates": "logistics-route-templates",
  "/users": "users",
  "/measurement-units": "measurement-units",
  [ADMIN_PATH]: "admin",
  [TRASH_PATH]: "trash",
}
const LABEL_BY_PATH = {
  "/client-request-workspace": "Заявки клиентов",
  "/client-requests": "Заявки клиентов",
  "/rfq": "RFQ закупка",
  "/sourcing": "Закупочная проработка",
  "/pricing": "Расчёт цены",
  "/commercial-offers": "Коммерческие предложения",
  "/contracts": "Договоры",
  "/purchase-orders": "Исполнение закупки",
  "/financial-operations": "Финансовые операции",
  "/dispatch-delivery": "Отгрузка и доставка",
  "/after-sales": "Рекламации",
  "/completion-lifecycle": "Завершение заказа",
  "/kpi": "Показатели",
  "/equipment-classifier": "Классификатор",
  "/warehouse": "Склад",
  "/clients": "Клиенты",
  "/suppliers": "Поставщики",
  "/supplier-parts": "Детали поставщиков",
  "/materials": "Материалы",
  "/tnved-codes": "Коды ТН ВЭД",
  "/users": "Пользователи и роли",
  "/measurement-units": "Единицы измерения",
  "/catalogs": "Обзор и качество",
  "/glossary": "Глоссарий",
  "/logistics-route-templates": "Шаблоны доставки",
  [ADMIN_PATH]: "Администрирование",
  [TRASH_PATH]: "Корзина",
}
const GLOSSARY_TAB = {
  path: "/glossary",
  name: "Глоссарий",
  icon: "catalogs",
  sort_order: 999,
}

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

function buildMenuItem(
  tab,
  { withIcon = true, labelOverride, tooltipOverride, iconOverride } = {}
) {
  const labelText = labelOverride ?? LABEL_BY_PATH[tab?.path] ?? tab?.name ?? ""
  const tooltipText = tooltipOverride ?? labelText
  const iconName = iconOverride || ICON_BY_PATH[tab?.path] || tab?.icon
  const iconSrc = getIconUrl(iconName)

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

function buildSection(key, label, children) {
  if (!children.length) return null
  return {
    type: "group",
    key,
    label: <span className="sidebar-section-label">{label}</span>,
    children,
  }
}

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { tabs, loading } = useTabs()
  const { can } = useCapabilities()
  const [collapsed, setCollapsed] = useState(false)

  const { menuItems, parentByKey } = useMemo(() => {
    const navigationTabs = [...(tabs || [])]
    if (can("administration.access") && !navigationTabs.some((tab) => tab?.path === "/users")) {
      navigationTabs.push({
        id: "capability-administration",
        tab_name: "users",
        path: "/users",
        name: "Администрирование",
        icon: "users",
        sort_order: 10000,
      })
    }
    if (can("client_requests.access") && !navigationTabs.some((tab) => ["/client-requests", "/client-request-workspace"].includes(tab?.path))) {
      navigationTabs.push({
        id: "capability-client-requests",
        tab_name: "client_requests",
        path: "/client-requests",
        name: "Заявки клиентов",
        icon: "client-requests",
        sort_order: 100,
      })
    }
    if (can("sourcing.access") && !navigationTabs.some((tab) => tab?.path === "/sourcing")) {
      navigationTabs.push({
        id: "capability-sourcing",
        tab_name: "sourcing",
        path: "/sourcing",
        name: "Закупочная проработка",
        icon: "rfq-workspace",
        sort_order: 110,
      })
    }
    if (can("pricing.access") && !navigationTabs.some((tab) => tab?.path === "/pricing")) {
      navigationTabs.push({
        id: "capability-pricing",
        tab_name: "pricing",
        path: "/pricing",
        name: "Расчёт цены",
        icon: "economics",
        sort_order: 120,
      })
    }
    if (can("commercial_offers.access") && !navigationTabs.some((tab) => tab?.path === "/commercial-offers")) {
      navigationTabs.push({
        id: "capability-commercial-offers",
        tab_name: "commercial_offers",
        path: "/commercial-offers",
        name: "Коммерческие предложения",
        icon: "sales-quotes",
        sort_order: 130,
      })
    }
    if (can("contracts.access") && !navigationTabs.some((tab) => tab?.path === "/contracts")) {
      navigationTabs.push({
        id: "capability-contracts",
        tab_name: "contracts",
        path: "/contracts",
        name: "Договоры",
        icon: "contracts",
        sort_order: 140,
      })
    }
    if (can("procurement_execution.access") && !navigationTabs.some((tab) => tab?.path === "/purchase-orders")) {
      navigationTabs.push({
        id: "capability-procurement-execution",
        tab_name: "procurement_execution",
        path: "/purchase-orders",
        name: "Исполнение закупки",
        icon: "purchase-orders",
        sort_order: 150,
      })
    }
    if (can("financial_operations.access") && !navigationTabs.some((tab) => tab?.path === "/financial-operations")) {
      navigationTabs.push({
        id: "capability-financial-operations",
        tab_name: "financial_operations",
        path: "/financial-operations",
        name: "Финансовые операции",
        icon: "economics",
        sort_order: 160,
      })
    }
    if (can("warehouse_inventory.access") && !navigationTabs.some((tab) => tab?.path === "/warehouse")) {
      navigationTabs.push({
        id: "capability-warehouse-inventory",
        tab_name: "warehouse_inventory",
        path: "/warehouse",
        name: "Склад",
        icon: "warehouse",
        sort_order: 170,
      })
    }
    if (can("dispatch_delivery.access") && !navigationTabs.some((tab) => tab?.path === "/dispatch-delivery")) {
      navigationTabs.push({
        id: "capability-dispatch-delivery",
        tab_name: "dispatch_delivery",
        path: "/dispatch-delivery",
        name: "Отгрузка и доставка",
        icon: "warehouse",
        sort_order: 180,
      })
    }
    if (can("completion.access") && !navigationTabs.some((tab) => tab?.path === "/completion-lifecycle")) {
      navigationTabs.push({
        id: "capability-completion-lifecycle",
        tab_name: "completion_lifecycle",
        path: "/completion-lifecycle",
        name: "Завершение заказа",
        icon: "contracts",
        sort_order: 190,
      })
    }
    if (can("after_sales.access") && !navigationTabs.some((tab) => tab?.path === "/after-sales")) {
      navigationTabs.push({
        id: "capability-after-sales",
        tab_name: "after_sales",
        path: "/after-sales",
        name: "Рекламации",
        icon: "contracts",
        sort_order: 200,
      })
    }

    const sorted = navigationTabs
      .slice()
      .filter((tab) => tab?.path && !HIDDEN_LEGACY_PATHS.has(tab.path))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    const byPath = new Map()
    sorted.forEach((tab) => {
      if (!byPath.has(tab.path)) byPath.set(tab.path, tab)
    })

    const consumed = new Set()
    const parentMap = new Map()

    const takePath = (path) => {
      const tab = byPath.get(path)
      if (!tab) return null
      consumed.add(path)
      return tab
    }

    const takeFirst = (paths) => {
      const tab = paths.map((path) => byPath.get(path)).find(Boolean) || null
      paths.forEach((path) => {
        if (byPath.has(path)) consumed.add(path)
      })
      return tab
    }

    const workspaceItems = WORKSPACE_NAV_GROUPS.map(({ paths, label }) => {
      const tab = takeFirst(paths)
      return tab
        ? buildMenuItem(tab, { labelOverride: label, tooltipOverride: label })
        : null
    }).filter(Boolean)

    const masterDataItems = MASTER_DATA_NAV_PATHS.map((path) => {
      const tab = takePath(path)
      return tab ? buildMenuItem(tab) : null
    }).filter(Boolean)

    const catalogTabs = CATALOG_NAV_PATHS.map((path) => takePath(path)).filter(Boolean)
    if (catalogTabs.length) {
      const catalogRoot = catalogTabs.find((t) => t.path === CATALOG_ROOT_PATH) || null
      const catalogChildren = catalogTabs.filter((t) => t.path !== CATALOG_ROOT_PATH)

      const childItems = []
      if (catalogRoot) {
        childItems.push(
          buildMenuItem(catalogRoot, {
            withIcon: true,
            labelOverride: LABEL_BY_PATH[CATALOG_ROOT_PATH],
            tooltipOverride: LABEL_BY_PATH[CATALOG_ROOT_PATH],
          })
        )
      }
      catalogChildren.forEach((tab) => {
        childItems.push(
          buildMenuItem(tab, {
            withIcon: true,
            labelOverride: LABEL_BY_PATH[tab.path] || tab.name,
            tooltipOverride: LABEL_BY_PATH[tab.path] || tab.name,
          })
        )
      })
      if (!catalogChildren.some((tab) => tab.path === GLOSSARY_TAB.path)) {
        childItems.push(buildMenuItem(GLOSSARY_TAB, { withIcon: true }))
      }

      const catalogLabel = catalogRoot?.name ?? "Каталоги"
      const catalogIconTab = catalogRoot ?? { path: "catalogs-group", name: catalogLabel }

      const groupItem = {
        key: "catalogs-group",
        icon: buildMenuItem(catalogIconTab, { iconOverride: "catalogs" }).icon,
        label: <span title={catalogLabel}>{catalogLabel}</span>,
        popupClassName: "sidebar-catalog-popup",
        children: childItems,
      }

      childItems.forEach((child) => {
        if (child?.key) parentMap.set(child.key, groupItem.key)
      })

      masterDataItems.push(groupItem)
    }

    const controlItems = CONTROL_NAV_PATHS.map((path) => {
      const tab = takePath(path)
      return tab ? buildMenuItem(tab) : null
    }).filter(Boolean)

    const settingsItems = SETTINGS_NAV_PATHS.map((path) => {
      const tab = takePath(path)
      return tab ? buildMenuItem(tab) : null
    }).filter(Boolean)

    const trashItem = buildMenuItem({
      path: TRASH_PATH,
      icon: "trash",
      name: "Корзина",
    })
    consumed.add(TRASH_PATH)
    settingsItems.push(trashItem)

    const adminTab = takePath(ADMIN_PATH)
    const usersTab = byPath.get("/users")
    if (adminTab && !usersTab) {
      settingsItems.push(buildMenuItem(adminTab))
    }

    const fallbackItems = sorted
      .filter((tab) => tab?.path && !consumed.has(tab.path) && !CATALOG_CHILD_PATHS.has(tab.path))
      .map((tab) => buildMenuItem(tab))

    const items = [
      buildSection("sidebar-workspaces", "Работа", workspaceItems),
      buildSection("sidebar-master-data", "Данные", masterDataItems),
      buildSection("sidebar-control", "Контроль", [...controlItems, ...fallbackItems]),
      buildSection("sidebar-settings", "Настройки", settingsItems),
    ].filter(Boolean)

    return { menuItems: items, parentByKey: parentMap }
  }, [tabs, can])

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
      className="app-sidebar"
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
