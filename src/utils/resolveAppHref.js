const isStorageHostedApp = () =>
  typeof window !== "undefined" &&
  window.location &&
  window.location.host === "storage.googleapis.com"

const normalizePath = (path) => {
  const raw = String(path || "").trim()
  if (!raw) return "/"
  return raw.startsWith("/") ? raw : `/${raw}`
}

export const resolveAppHref = (path) => {
  const normalizedPath = normalizePath(path)

  if (isStorageHostedApp()) {
    return `/#${normalizedPath}`
  }

  return normalizedPath
}
