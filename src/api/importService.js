// src/api/importService.js

import axios from './axiosInstance'

export const uploadImportData = async (endpoint, rows) => {
  const response = await axios.post(endpoint, rows)
  return response.data
}
