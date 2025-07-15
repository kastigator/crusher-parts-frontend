// src/api/axiosInstance.js

import axios from 'axios'
import { logout } from '../auth/authService' // ✅ добавлено

const API_BASE = `${import.meta.env.VITE_API_URL}/api`
console.log('🔧 API_BASE =', API_BASE)

const instance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

// ✅ Добавляем access-token в каждый запрос
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ✅ Перехват 401 и автоматическое обновление токена
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => {
    if (error) {
      p.reject(error)
    } else {
      p.resolve(token)
    }
  })
  failedQueue = []
}

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(instance(originalRequest))
            },
            reject: (err) => reject(err)
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        )

        const newToken = data.token
        localStorage.setItem('token', newToken)

        instance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
        processQueue(null, newToken)

        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return instance(originalRequest)
      } catch (err) {
        processQueue(err, null)
        localStorage.removeItem('token')
        logout() // ✅ корректный сброс без перезагрузки
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default instance
