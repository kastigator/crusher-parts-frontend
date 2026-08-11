import axios from "@/api/axiosInstance"

export const listClientRequests = (params = {}) =>
  axios.get("/client-requests", { params }).then(({ data }) => Array.isArray(data) ? data : [])

export const getClientRequestRegistry = (params = {}) =>
  axios.get("/client-requests/registry", { params }).then(({ data }) => data)

export const listClients = () =>
  axios.get("/clients", { params: { limit: 500, offset: 0 } }).then(({ data }) => Array.isArray(data) ? data : [])

export const listUsers = () =>
  axios.get("/users").then(({ data }) => Array.isArray(data) ? data : [])

export const createClientRequest = (payload) =>
  axios.post("/client-requests", payload).then(({ data }) => data)

export const validateClientRequestIntake = (payload) =>
  axios.post("/client-requests/intake/validate", payload).then(({ data }) => data)

export const commitClientRequestIntake = (payload) =>
  axios.post("/client-requests/intake/commit", payload).then(({ data }) => data)

export const createClientRequestRevision = (requestId, payload) =>
  axios.post(`/client-requests/${requestId}/revisions`, payload).then(({ data }) => data)

export const addClientRequestItem = (revisionId, payload) =>
  axios.post(`/client-requests/revisions/${revisionId}/items`, payload).then(({ data }) => data)

export const listRevisionItems = (revisionId) =>
  axios.get(`/client-requests/revisions/${revisionId}/items`).then(({ data }) => Array.isArray(data) ? data : [])

export const searchCatalogPositions = (query) =>
  axios.get("/catalog-positions", { params: { q: query, limit: 50 } }).then(({ data }) => Array.isArray(data) ? data : [])

export const getClientRequestWorkspace = (requestId) =>
  axios.get(`/client-requests/${requestId}/domain-workspace`).then(({ data }) => data)

export const getIdentification = (revisionId) =>
  axios.get(`/client-requests/revisions/${revisionId}/identification`).then(({ data }) => data)

export const getReadiness = (revisionId) =>
  axios.get(`/client-requests/revisions/${revisionId}/readiness`).then(({ data }) => data)

export const saveIdentification = (itemId, payload) =>
  axios.put(`/client-requests/items/${itemId}/identification`, payload).then(({ data }) => data)

export const saveRequirements = (itemId, payload) =>
  axios.put(`/client-requests/items/${itemId}/requirements`, payload).then(({ data }) => data)

export const finalizeRevision = (revisionId) =>
  axios.post(`/client-requests/revisions/${revisionId}/finalize`).then(({ data }) => data)

export const createProcurementRelease = (payload) =>
  axios.post("/procurement-releases", payload).then(({ data }) => data)
