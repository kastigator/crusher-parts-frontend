import { useEffect, useState, useCallback } from "react"
import axios from "@/api/axiosInstance"

import sanitizePayload from "@/utils/sanitizePayload"

export default function useTableData(baseUrl, queryParams = {}, columns = []) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [newRow, setNewRow] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams(queryParams).toString()
      const response = await axios.get(`${baseUrl}${query ? `?${query}` : ""}`)
      setData(response.data)
    } catch (err) {
      console.error("Ошибка при загрузке данных:", err)
    } finally {
      setLoading(false)
    }
  }, [baseUrl, queryParams])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onAdd = async () => {
    const payload = sanitizePayload(newRow, columns)
    try {
      const res = await axios.post(baseUrl, payload)
      setNewRow(null)
      fetchData()
      return res.data
    } catch (err) {
      console.error("Ошибка при добавлении:", err)
      throw err
    }
  }

  const onSave = async (row) => {
    const id = row.id
    const payload = sanitizePayload(row, columns)
    try {
      await axios.put(`${baseUrl}/${id}`, payload)
      fetchData()
    } catch (err) {
      console.error("Ошибка при сохранении:", err)
      throw err
    }
  }

  const onDelete = async (row) => {
    try {
      await axios.delete(`${baseUrl}/${row.id}`)
      fetchData()
    } catch (err) {
      console.error("Ошибка при удалении:", err)
      throw err
    }
  }

  return {
    data,
    setData,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete,
    loading
  }
}
