import axios from "@/api/axiosInstance"

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
