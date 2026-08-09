const RUNTIME_CONFIG_SCHEMA_VERSION = 1
const RUNTIME_CONFIG_FILE = "config.json"
const INTEGRATION_MODES = new Set(["live", "disabled"])

const readBuildEnvironment = () => import.meta.env || {}

const buildFallbackConfig = (env = readBuildEnvironment()) => ({
  schemaVersion: RUNTIME_CONFIG_SCHEMA_VERSION,
  apiBaseUrl: env.VITE_API_URL || "",
  integrations: {
    dadata: {
      mode: env.VITE_DADATA_API_KEY ? "live" : "disabled",
      apiKey: env.VITE_DADATA_API_KEY || "",
    },
    yandexMaps: {
      mode: env.VITE_YANDEX_MAPS_API_KEY ? "live" : "disabled",
      apiKey: env.VITE_YANDEX_MAPS_API_KEY || "",
    },
  },
})

const normalizeOptionalString = (value, field, { maxLength = 512 } = {}) => {
  if (value === undefined || value === null) return ""
  if (typeof value !== "string") throw new Error(`${field} must be a string`)
  const normalized = value.trim()
  const hasUnsafeControl = [...normalized].some((character) => {
    const code = character.charCodeAt(0)
    return code <= 31 || code === 127
  })
  if (normalized.length > maxLength || hasUnsafeControl) {
    throw new Error(`${field} contains unsafe characters`)
  }
  return normalized
}

export const normalizeApiBaseUrl = (value, { allowEmpty = false } = {}) => {
  const normalized = normalizeOptionalString(value, "apiBaseUrl", { maxLength: 2048 })
  if (!normalized && allowEmpty) return ""
  if (!normalized) throw new Error("apiBaseUrl is required")

  let url
  try {
    url = new URL(normalized)
  } catch {
    throw new Error("apiBaseUrl must be an absolute URL")
  }

  const isLocalHttp =
    url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new Error("apiBaseUrl must use https (http is allowed only for localhost)")
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("apiBaseUrl must not contain credentials, query parameters, or fragments")
  }
  if (url.pathname && url.pathname !== "/") {
    throw new Error("apiBaseUrl must be an origin without a path")
  }
  return url.origin
}

const normalizeIntegration = (name, candidate = {}, fallback = {}) => {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error(`integrations.${name} must be an object`)
  }

  const rawMode = normalizeOptionalString(candidate.mode, `integrations.${name}.mode`, {
    maxLength: 32,
  })
  const mode = rawMode || fallback.mode || "disabled"
  if (!INTEGRATION_MODES.has(mode)) {
    throw new Error(`integrations.${name}.mode must be live or disabled`)
  }

  const runtimeKey = normalizeOptionalString(
    candidate.apiKey,
    `integrations.${name}.apiKey`,
    { maxLength: 512 },
  )
  const hasExplicitMode = candidate.mode !== undefined && candidate.mode !== null
  const apiKey = runtimeKey || (!hasExplicitMode ? fallback.apiKey : "") || ""
  if (mode === "live" && !apiKey) {
    throw new Error(`integrations.${name}.apiKey is required in live mode`)
  }

  return { mode, apiKey: mode === "live" ? apiKey : "" }
}

export const normalizeRuntimeConfig = (candidate = {}, fallback = buildFallbackConfig()) => {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("runtime config must be a JSON object")
  }

  const schemaVersion = candidate.schemaVersion ?? RUNTIME_CONFIG_SCHEMA_VERSION
  if (schemaVersion !== RUNTIME_CONFIG_SCHEMA_VERSION) {
    throw new Error(`unsupported runtime config schemaVersion: ${schemaVersion}`)
  }

  const rawApiBaseUrl = normalizeOptionalString(candidate.apiBaseUrl, "apiBaseUrl", {
    maxLength: 2048,
  })
  const apiBaseUrl = normalizeApiBaseUrl(rawApiBaseUrl || fallback.apiBaseUrl)
  const integrations = candidate.integrations ?? {}
  if (integrations === null || typeof integrations !== "object" || Array.isArray(integrations)) {
    throw new Error("integrations must be an object")
  }

  return Object.freeze({
    schemaVersion: RUNTIME_CONFIG_SCHEMA_VERSION,
    apiBaseUrl,
    integrations: Object.freeze({
      dadata: Object.freeze(
        normalizeIntegration("dadata", integrations.dadata, fallback.integrations?.dadata),
      ),
      yandexMaps: Object.freeze(
        normalizeIntegration(
          "yandexMaps",
          integrations.yandexMaps,
          fallback.integrations?.yandexMaps,
        ),
      ),
    }),
  })
}

export const resolveRuntimeConfigUrl = (documentBase = globalThis.document?.baseURI) => {
  if (!documentBase) return `/${RUNTIME_CONFIG_FILE}`
  return new URL(RUNTIME_CONFIG_FILE, documentBase).toString()
}

let currentConfig
try {
  currentConfig = normalizeRuntimeConfig({}, buildFallbackConfig())
} catch {
  currentConfig = Object.freeze({
    schemaVersion: RUNTIME_CONFIG_SCHEMA_VERSION,
    apiBaseUrl: "",
    integrations: Object.freeze({
      dadata: Object.freeze({ mode: "disabled", apiKey: "" }),
      yandexMaps: Object.freeze({ mode: "disabled", apiKey: "" }),
    }),
  })
}

export const loadRuntimeConfig = async ({
  fetchImpl = globalThis.fetch,
  documentBase = globalThis.document?.baseURI,
  fallback = buildFallbackConfig(),
} = {}) => {
  if (typeof fetchImpl !== "function") {
    currentConfig = normalizeRuntimeConfig({}, fallback)
    return currentConfig
  }

  const response = await fetchImpl(resolveRuntimeConfigUrl(documentBase), {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  }).catch(() => null)

  if (!response || response.status === 404) {
    currentConfig = normalizeRuntimeConfig({}, fallback)
    return currentConfig
  }
  if (!response.ok) {
    throw new Error(`runtime config request failed with status ${response.status}`)
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error("runtime config is not valid JSON")
  }
  currentConfig = normalizeRuntimeConfig(payload, fallback)
  return currentConfig
}

export const getRuntimeConfig = () => currentConfig
export const getApiBaseUrl = () => currentConfig.apiBaseUrl
export const getBrowserIntegration = (name) => {
  const integration = currentConfig.integrations?.[name]
  if (!integration) throw new Error(`unknown browser integration: ${name}`)
  return integration
}

export const __setRuntimeConfigForTests = (config, fallback = buildFallbackConfig()) => {
  currentConfig = normalizeRuntimeConfig(config, fallback)
  return currentConfig
}

export const __buildFallbackConfigForTests = buildFallbackConfig
