const isStorageHostedApp = () =>
  typeof window !== "undefined" &&
  window.location &&
  window.location.host === "storage.googleapis.com"

const resolveStorageAppBasePath = () => {
  if (typeof window === "undefined" || !window.location) return "/"

  const pathname = String(window.location.pathname || "")
  const marker = "/index.html"
  const markerIndex = pathname.indexOf(marker)

  if (markerIndex >= 0) {
    return pathname.slice(0, markerIndex + marker.length)
  }

  return pathname || "/"
}

const normalizePath = (path) => {
  const raw = String(path || "").trim()
  if (!raw) return "/"
  return raw.startsWith("/") ? raw : `/${raw}`
}

export const resolveAppHref = (path) => {
  const normalizedPath = normalizePath(path)

  if (isStorageHostedApp()) {
    return `${resolveStorageAppBasePath()}#${normalizedPath}`
  }

  return normalizedPath
}
