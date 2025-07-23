// src/hooks/useTableData.jsx

import { useEffect, useMemo, useState, useCallback } from "react"
import axios from "@/api/axiosInstance"
import { sanitizePayload } from "@/utils/sanitizePayload"

export default function useTableData(endpoint, queryParams = {}, columns = [], options = {}) {
  const [data, setData] = useState([])
  const [newRow, setNewRow] = useState({})
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const { pagination = true } = options

  // 🔹 Генерация шаблона новой строки
  useEffect(() => {
    if (!columns?.length) return
    const row = {}
    columns.forEach(col => {
      if (!col.field || col.field === "actions") return
      row[col.field] = col.defaultValue ?? ""
    })
    setNewRow(row)
  }, [columns])

  // 🔹 Построение URL
  const url = useMemo(() => {
    const params = new URLSearchParams(queryParams).toString()
    return params ? `${endpoint}?${params}` : endpoint
  }, [endpoint, ...Object.entries(queryParams).flat()])

  // 🔄 Загрузка данных
  const reloadData = useCallback(async () => {
    try {
      const res = await axios.get(url)
      setData(res.data || [])
    } catch (err) {
      console.error("Ошибка загрузки данных:", err)
    }
  }, [url])

  useEffect(() => {
    reloadData()
  }, [reloadData])

  // ➕ Добавление
  const onAdd = async (row) => {
    try {
      const cleaned = sanitizePayload(row)
      await axios.post(endpoint, cleaned)
      await reloadData()
    } catch (err) {
      console.error("Ошибка добавления:", err)
    }
  }

  // 💾 Сохранение
  const onSave = async (row) => {
    try {
      const cleaned = sanitizePayload(row)
      await axios.put(`${endpoint}/${row.id}`, cleaned)
      await reloadData()
    } catch (err) {
      console.error("Ошибка сохранения:", err)
    }
  }

  // 🗑 Удаление
  const onDelete = async (row) => {
    try {
      await axios.delete(`${endpoint}/${row.id}`)
      await reloadData()
    } catch (err) {
      console.error("Ошибка удаления:", err)
    }
  }

  // 📄 Пагинация
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
    setData, // ✅ ← добавлено
    paginatedData,
    page,
    rowsPerPage,
    onPageChange: handlePageChange,
    onRowsPerPageChange: handleRowsPerPageChange,
    newRow,
    setNewRow,
    onAdd,
    onSave,
    onDelete,
    reloadData
  }
}
