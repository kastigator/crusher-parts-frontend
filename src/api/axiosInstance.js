// src/api/axiosInstance.js

import axios from 'axios'
import { appMessage as message } from '@/utils/uiFeedback'
import { logout } from '../auth/authService' // ✅ добавлено
import { readPresenceSessionId } from '@/utils/presenceSession'
import { getApiBaseUrl } from '@/config/runtimeConfig'

const getApiUrl = (path = '') => `${getApiBaseUrl()}/api${path}`

const instance = axios.create({
  withCredentials: true,
})

// ✅ Добавляем access-token в каждый запрос
instance.interceptors.request.use((config) => {
  config.baseURL = getApiUrl()
  const token = localStorage.getItem('token')
  let userId = null
  try {
    const rawUser = localStorage.getItem('userData')
    if (rawUser) {
      userId = JSON.parse(rawUser)?.id || null
    }
  } catch {
    userId = null
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const sessionId = readPresenceSessionId(userId)
  if (sessionId) {
    config.headers['x-session-id'] = sessionId
  }
  return config
})

// ===============================================
// ✅ Перехват ответов: 409 (конфликты) + 401 refresh
// ===============================================
let isRefreshing = false
let failedQueue = []
let lastForbiddenMessageAt = 0

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => {
    if (error) p.reject(error)
    else p.resolve(token)
  })
  failedQueue = []
}

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error?.response?.status
    const data = error?.response?.data

    // --- 409: бизнес-конфликты (НЕ трогаем refresh-поток) ---
    if (status === 409) {
      if (data?.type === 'version_conflict') {
        error.isVersionConflict = true
        error.currentRecord = data?.current || null
      }
      if (data?.type === 'duplicate_key') {
        error.isDuplicateKey = true
      }
      return Promise.reject(error)
    }

    // --- 401: пробуем refresh-токена (как было) ---
    if (status === 401 && !originalRequest?._retry) {
      const refreshToken = localStorage.getItem('refreshToken')
      const requestUrl = String(originalRequest?.url || '')

      if (!refreshToken || requestUrl.includes('/auth/refresh')) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        logout()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(instance(originalRequest))
            },
            reject: (err) => reject(err),
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data: refreshData } = await axios.post(
          getApiUrl('/auth/refresh'),
          { refreshToken },
          { withCredentials: true }
        )

        const newToken = refreshData.token
        const newRefreshToken = refreshData.refreshToken

        if (!newToken || !newRefreshToken) {
          throw new Error('Некорректный ответ refresh-token')
        }

        localStorage.setItem('token', newToken)
        localStorage.setItem('refreshToken', newRefreshToken)
        if (refreshData.user) {
          localStorage.setItem('userData', JSON.stringify(refreshData.user))
        }

        instance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
        processQueue(null, newToken)

        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return instance(originalRequest)
      } catch (err) {
        processQueue(err, null)
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        logout() // ✅ корректный сброс без перезагрузки
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    if (status === 403) {
      const now = Date.now()
      if (now - lastForbiddenMessageAt > 2500) {
        lastForbiddenMessageAt = now
        message.warning(data?.message || 'Недостаточно прав для этого действия')
      }
    }

    return Promise.reject(error)
  }
)

export default instance
