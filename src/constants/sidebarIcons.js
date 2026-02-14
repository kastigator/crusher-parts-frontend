const BASE_URL_RAW = import.meta.env.BASE_URL ?? "/"
const normalizeBaseUrl = (value) => {
  const raw = String(value || "").trim()
  if (!raw || raw === "." || raw === "./") return "/"
  return raw.endsWith("/") ? raw : `${raw}/`
}
const ICONS_BASE_URL = normalizeBaseUrl(BASE_URL_RAW)

export const buildIconPath = (name) => `icons/${name}.svg`

export const resolveIconUrl = (value) => {
  const raw = String(value || "").trim()
  if (!raw) return `${ICONS_BASE_URL}${buildIconPath("default")}`
  if (/^https?:\/\//i.test(raw)) return raw
  if (!raw.includes("/") && !raw.toLowerCase().endsWith(".svg")) {
    return `${ICONS_BASE_URL}${buildIconPath(raw)}`
  }
  const cleaned = raw.replace(/^\/+/, "")
  return `${ICONS_BASE_URL}${cleaned}`
}

export const DEFAULT_ICON_PATH = buildIconPath("default")

export const SIDEBAR_ICONS = [
  { key: "client-requests", label: "Заявки клиентов", path: buildIconPath("client-requests") },
  { key: "rfq", label: "Запросы поставщикам", path: buildIconPath("rfq") },
  { key: "supplier-responses", label: "Ответы поставщиков", path: buildIconPath("supplier-responses") },
  { key: "coverage", label: "Покрытие и сравнение", path: buildIconPath("coverage") },
  { key: "scorecard", label: "Оценка поставщиков", path: buildIconPath("scorecard") },
  { key: "economics", label: "Экономика поставки", path: buildIconPath("economics") },
  { key: "selection", label: "Выбор поставщиков", path: buildIconPath("selection") },
  { key: "sales-quotes", label: "Коммерческие предложения", path: buildIconPath("sales-quotes") },
  { key: "contracts", label: "Контракты", path: buildIconPath("contracts") },
  { key: "purchase-orders", label: "Заказы поставщикам", path: buildIconPath("purchase-orders") },
  { key: "catalogs", label: "Каталоги", path: buildIconPath("catalogs") },
  { key: "clients", label: "Клиенты", path: buildIconPath("clients") },
  { key: "suppliers", label: "Поставщики", path: buildIconPath("suppliers") },
  { key: "supplier-parts", label: "Детали поставщиков", path: buildIconPath("supplier-parts") },
  { key: "original-parts", label: "Оригинальные детали", path: buildIconPath("original-parts") },
  { key: "materials", label: "Материалы", path: buildIconPath("materials") },
  { key: "tnved-codes", label: "Коды ТН ВЭД", path: buildIconPath("tnved-codes") },
  { key: "admin", label: "Админ", path: buildIconPath("admin") },
]
