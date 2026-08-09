import dayjs from "dayjs"

export const formatDateTime = (value) => {
  if (!value) return "—"
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : String(value)
}

export const formatDuration = (seconds) => {
  const total = Number(seconds || 0)
  if (!Number.isFinite(total) || total <= 0) return "0 мин"
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours && minutes) return `${hours} ч ${minutes} мин`
  if (hours) return `${hours} ч`
  return `${minutes} мин`
}

const ROUTE_PATTERNS = [
  { pattern: /^\/$/, label: "Главная", section: "Обзор", key: "/" },
  { pattern: /^\/users$/, label: "Пользователи и роли", section: "Администрирование", key: "/users" },
  { pattern: /^\/clients$/, label: "Клиенты", section: "Клиенты", key: "/clients" },
  { pattern: /^\/clients\/\d+$/, label: "Карточка клиента", section: "Клиенты", key: "/clients/:id" },
  { pattern: /^\/suppliers$/, label: "Поставщики", section: "Поставщики", key: "/suppliers" },
  { pattern: /^\/suppliers\/\d+$/, label: "Карточка поставщика", section: "Поставщики", key: "/suppliers/:id" },
  { pattern: /^\/catalogs$/, label: "Каталоги", section: "Каталоги", key: "/catalogs" },
  { pattern: /^\/supplier-parts$/, label: "Детали поставщиков", section: "Каталоги", key: "/supplier-parts" },
  { pattern: /^\/supplier-parts\/\d+$/, label: "Карточка детали поставщика", section: "Каталоги", key: "/supplier-parts/:id" },
  { pattern: /^\/equipment-classifier$/, label: "Классификатор", section: "Каталоги", key: "/equipment-classifier" },
  { pattern: /^\/materials$/, label: "Материалы", section: "Каталоги", key: "/materials" },
  { pattern: /^\/tnved-codes$/, label: "Коды ТН ВЭД", section: "Каталоги", key: "/tnved-codes" },
  { pattern: /^\/logistics-route-templates$/, label: "Шаблоны доставки", section: "Каталоги", key: "/logistics-route-templates" },
  { pattern: /^\/admin$/, label: "Администрирование", section: "Система", key: "/admin" },
  { pattern: /^\/client-requests$/, label: "Заявки клиентов", section: "Продажи", key: "/client-requests" },
  { pattern: /^\/client-request-workspace$/, label: "Рабочая область заявок клиентов", section: "Продажи", key: "/client-request-workspace" },
  { pattern: /^\/sourcing$/, label: "Закупочная проработка", section: "Закупка", key: "/sourcing" },
  { pattern: /^\/pricing$/, label: "Расчёт цены", section: "Коммерческий контур", key: "/pricing" },
  { pattern: /^\/commercial-offers$/, label: "Коммерческие предложения", section: "Продажи", key: "/commercial-offers" },
  { pattern: /^\/contracts$/, label: "Договоры", section: "Продажи", key: "/contracts" },
  { pattern: /^\/purchase-orders$/, label: "Исполнение закупки", section: "Закупка", key: "/purchase-orders" },
  { pattern: /^\/financial-operations$/, label: "Финансовые операции", section: "Финансы", key: "/financial-operations" },
  { pattern: /^\/warehouse$/, label: "Склад", section: "Склад", key: "/warehouse" },
  { pattern: /^\/dispatch-delivery$/, label: "Отгрузка и доставка", section: "Логистика", key: "/dispatch-delivery" },
  { pattern: /^\/completion-lifecycle$/, label: "Завершение обязательств", section: "Контроль", key: "/completion-lifecycle" },
  { pattern: /^\/after-sales$/, label: "Послепродажное обслуживание", section: "Сервис", key: "/after-sales" },
  { pattern: /^\/kpi$/, label: "Показатели", section: "Аналитика", key: "/kpi" },
  { pattern: /^\/trash$/, label: "Корзина", section: "Система", key: "/trash" },
]

const ENTITY_LABELS = {
  clients: "клиента",
  suppliers: "поставщика",
  part_suppliers: "поставщика",
  supplier_parts: "деталь поставщика",
  tnved_codes: "код ТН ВЭД",
  materials: "материал",
  equipment_classifier_nodes: "узел классификатора",
  logistics_route_templates: "шаблон доставки",
  client_request: "заявку клиента",
  client_requests: "заявку клиента",
  client_orders: "заявку клиента",
  client_order_items: "позицию заявки",
  rfq: "RFQ",
  rfqs: "RFQ",
  sales_quote: "коммерческое предложение",
  sales_quotes: "коммерческое предложение",
  sales_quote_lines: "строку коммерческого предложения",
  client_contract: "контракт",
  client_contracts: "контракт",
  client_order_contracts: "контракт",
  supplier_purchase_order: "заказ поставщику",
  supplier_purchase_orders: "заказ поставщику",
  supplier_purchase_order_lines: "строку заказа поставщику",
  client_billing_addresses: "платежный адрес клиента",
  client_shipping_addresses: "адрес доставки клиента",
  client_bank_details: "банковские реквизиты клиента",
  client_equipment_units: "единицу оборудования клиента",
  supplier_part_catalog_positions: "связь детали поставщика с позицией каталога",
  catalog_positions: "позицию каталога",
  equipment_model_bom_items: "строку BOM",
  equipment_models: "модель оборудования",
  equipment_manufacturers: "производителя оборудования",
  user: "пользователя",
  users: "пользователя",
}

const ACTION_VERBS = {
  create: "Создал",
  update: "Изменил",
  delete: "Удалил",
}

export function resolveScreenInfo(path) {
  const normalizedPath = String(path || "").trim() || "/"
  const matched = ROUTE_PATTERNS.find((item) => item.pattern.test(normalizedPath))
  if (matched) {
    return {
      key: matched.key,
      label: matched.label,
      section: matched.section,
      path: normalizedPath,
    }
  }

  return {
    key: normalizedPath,
    label: normalizedPath,
    section: "Прочее",
    path: normalizedPath,
  }
}

function safeMeta(metaJson) {
  if (!metaJson) return null
  if (typeof metaJson === "object") return metaJson
  try {
    return JSON.parse(metaJson)
  } catch {
    return null
  }
}

function humanizeWriteAction(event) {
  const meta = safeMeta(event.meta_json)
  const action = String(meta?.action || "").toLowerCase()
  const verb = ACTION_VERBS[action] || "Изменил"
  const entity = ENTITY_LABELS[String(event.entity_type || "").toLowerCase()] || "данные"
  const suffix = event?.entity_label ? `: ${event.entity_label}` : ""
  return `${verb} ${entity}${suffix}`
}

export function humanizeActivityEvent(event) {
  const type = String(event?.event_type || "").toLowerCase()
  if (type === "login") {
    return { label: "Вошел в систему", secondary: "Начало сессии", tone: "green" }
  }
  if (type === "logout") {
    return { label: "Вышел из системы", secondary: "Завершение сессии", tone: "default" }
  }
  if (type === "route_change") {
    const screen = resolveScreenInfo(event?.path)
    return {
      label: `Открыл раздел «${screen.label}»`,
      secondary: screen.section,
      tone: "blue",
    }
  }
  if (type === "write_action") {
    const screen = resolveScreenInfo(event?.path)
    return {
      label: humanizeWriteAction(event),
      secondary: screen.section,
      tone: "gold",
    }
  }
  if (type === "focus") {
    const screen = resolveScreenInfo(event?.path)
    return { label: "Окно снова активно", secondary: screen.label, tone: "default" }
  }
  if (type === "blur") {
    const screen = resolveScreenInfo(event?.path)
    return { label: "Окно ушло в фон", secondary: screen.label, tone: "default" }
  }
  return {
    label: event?.event_type || "Событие",
    secondary: resolveScreenInfo(event?.path).label,
    tone: "default",
  }
}

export function buildMeaningfulTimeline(events) {
  return (events || [])
    .filter((event) => ["login", "logout", "route_change", "write_action"].includes(String(event?.event_type || "").toLowerCase()))
    .map((event) => ({
      id: event.id,
      event_type: event.event_type,
      event_time: event.event_time,
      ...humanizeActivityEvent(event),
    }))
}

export function buildScreenSummary(overview, events) {
  const routeVisits = new Map()
  for (const event of events || []) {
    if (String(event?.event_type || "").toLowerCase() !== "route_change") continue
    const screen = resolveScreenInfo(event.path)
    const current = routeVisits.get(screen.key) || {
      screen_key: screen.key,
      screen_label: screen.label,
      section_label: screen.section,
      duration_sec: 0,
      visits_count: 0,
      last_visit_at: null,
    }
    current.visits_count += 1
    current.last_visit_at = event.event_time
    routeVisits.set(screen.key, current)
  }

  for (const route of overview?.top_routes || []) {
    const screen = resolveScreenInfo(route.path)
    const current = routeVisits.get(screen.key) || {
      screen_key: screen.key,
      screen_label: screen.label,
      section_label: screen.section,
      duration_sec: 0,
      visits_count: 0,
      last_visit_at: null,
    }
    current.duration_sec += Number(route.duration_sec || 0)
    routeVisits.set(screen.key, current)
  }

  if (overview?.current_path) {
    const screen = resolveScreenInfo(overview.current_path)
    const current = routeVisits.get(screen.key) || {
      screen_key: screen.key,
      screen_label: screen.label,
      section_label: screen.section,
      duration_sec: 0,
      visits_count: 0,
      last_visit_at: overview.last_seen_at || null,
    }
    current.last_visit_at = current.last_visit_at || overview.last_seen_at || null
    routeVisits.set(screen.key, current)
  }

  return Array.from(routeVisits.values()).sort((a, b) => {
    const durationDiff = Number(b.duration_sec || 0) - Number(a.duration_sec || 0)
    if (durationDiff !== 0) return durationDiff
    return new Date(b.last_visit_at || 0) - new Date(a.last_visit_at || 0)
  })
}

export function buildTechnicalEvents(events) {
  return (events || []).map((event) => ({
    ...event,
    screen_label: resolveScreenInfo(event.path).label,
    event_label: humanizeActivityEvent(event).label,
  }))
}

export function getActivityVerdict(overview) {
  const sessionSeconds = Number(overview?.session_duration_sec || 0)
  const engagedSeconds = Number(overview?.engaged_duration_sec || 0)
  const actionsCount = Number(overview?.actions_count || 0)

  if (engagedSeconds >= 20 * 60 || actionsCount >= 3) {
    return {
      label: "Работал активно",
      color: "green",
      note: "Есть заметное время работы или несколько осмысленных действий.",
    }
  }

  if (sessionSeconds >= 30 * 60 && engagedSeconds < 10 * 60 && actionsCount === 0) {
    return {
      label: "Был в системе, но действий мало",
      color: "gold",
      note: "Похоже на присутствие без выраженной рабочей активности.",
    }
  }

  return {
    label: "Активность не подтверждена",
    color: "default",
    note: "Сессия зафиксирована, но признаков активной работы мало.",
  }
}

export function formatSessionStatus(session) {
  const status = String(session?.status || "").toLowerCase()
  const reason = String(session?.closed_reason || "").toLowerCase()

  if (status === "active") {
    return { label: "Сессия активна", color: "green" }
  }

  if (reason === "logout") {
    return { label: "Вышел из системы", color: "blue" }
  }

  return { label: "Завершилась без logout", color: "default" }
}
