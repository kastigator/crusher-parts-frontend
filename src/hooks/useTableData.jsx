// src/hooks/useTableData.jsx

import { useEffect, useState } from "react"
import axios from "@/api/axiosInstance"
import { sanitizePayload } from "@/utils/sanitizePayload"

export default function useTableData(endpoint, queryParams = {}, columns = [], options = {}) {
  const [data, setData] = useState([])
  const [newRow, setNewRow] = useState({})
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const { pagination = true } = options

  // 🔹 Генерация шаблона строки
  useEffect(() => {
    if (!columns?.length) return
    const row = {}
    columns.forEach(col => {
      if (!col.field || col.field === "actions") return
      row[col.field] = col.defaultValue ?? ""
    })
    setNewRow(row)
  }, [columns])

  // 🔹 Загрузка данных с сервера
  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams(queryParams).toString()
        const url = params ? `${endpoint}?${params}` : endpoint
        const res = await axios.get(url)
        setData(res.data || [])
      } catch (err) {
        console.error("Ошибка загрузки данных:", err)
      }
    }

    fetchData()
  }, [endpoint, JSON.stringify(queryParams)])

  // 🔹 CRUD-операции
  const onAdd = async (row) => {
    try {
      const cleaned = sanitizePayload(row)
      await axios.post(endpoint, cleaned)
      const res = await axios.get(endpoint)
      setData(res.data || [])
    } catch (err) {
      console.error("Ошибка добавления:", err)
    }
  }

  const onSave = async (row) => {
    try {
      const cleaned = sanitizePayload(row)
      await axios.put(`${endpoint}/${row.id}`, cleaned)
      const res = await axios.get(endpoint)
      setData(res.data || [])
    } catch (err) {
      console.error("Ошибка сохранения:", err)
    }
  }

  const onDelete = async (row) => {
    try {
      await axios.delete(`${endpoint}/${row.id}`)
      const res = await axios.get(endpoint)
      setData(res.data || [])
    } catch (err) {
      console.error("Ошибка удаления:", err)
    }
  }

  // 🔹 Пагинация
  const handlePageChange = (newPage) => setPage(newPage)
  const handleRowsPerPageChange = (rows) => {
    setRowsPerPage(rows)
    setPage(0)
  }

  const paginatedData = pagination
    ? data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : data

  return {
    data,
    paginatedData,
    page,
    rowsPerPage,
    onPageChange: handlePageChange,
    onRowsPerPageChange: handleRowsPerPageChange,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete
  }
}
