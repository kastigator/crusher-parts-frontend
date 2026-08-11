import axios from "@/api/axiosInstance"

export const listTechnicalIdentificationTasks = (params = {}) =>
  axios.get("/technical-identification/tasks", { params }).then(({ data }) => data)

export const getTechnicalIdentificationTask = (taskId) =>
  axios.get(`/technical-identification/tasks/${taskId}`).then(({ data }) => data)

export const listTechnicalIdentificationAssignees = () =>
  axios.get("/technical-identification/assignees").then(({ data }) => Array.isArray(data) ? data : [])

export const claimTechnicalIdentificationTask = (taskId, payload) =>
  axios.post(`/technical-identification/tasks/${taskId}/claim`, payload).then(({ data }) => data)

export const assignTechnicalIdentificationTask = (taskId, payload) =>
  axios.post(`/technical-identification/tasks/${taskId}/assign`, payload).then(({ data }) => data)

export const waitTechnicalIdentificationTask = (taskId, payload) =>
  axios.post(`/technical-identification/tasks/${taskId}/wait-for-client`, payload).then(({ data }) => data)

export const resumeTechnicalIdentificationTask = (taskId, payload) =>
  axios.post(`/technical-identification/tasks/${taskId}/resume`, payload).then(({ data }) => data)

export const resolveTechnicalIdentificationTask = (taskId, payload) =>
  axios.post(`/technical-identification/tasks/${taskId}/resolve`, payload).then(({ data }) => data)

export const closeTechnicalIdentificationTask = (taskId, payload) =>
  axios.post(`/technical-identification/tasks/${taskId}/close`, payload).then(({ data }) => data)

export const reopenTechnicalIdentificationTask = (taskId, payload) =>
  axios.post(`/technical-identification/tasks/${taskId}/reopen`, payload).then(({ data }) => data)
