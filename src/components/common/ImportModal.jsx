// src/components/common/ImportModal.jsx

import React, { useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Alert,
  Link
} from "@mui/material"
import readXlsxFile from "read-excel-file"
import axios from "@/api/axiosInstance"

export default function ImportModal({ open, onClose, type }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState([])
  const [imported, setImported] = useState(0)
  const [templateUrl, setTemplateUrl] = useState("")

  const handleFileChange = async (event) => {
    const file = event.target.files[0]
    if (!file || !type) return

    try {
      setLoading(true)
      setError("")
      setErrors([])
      setImported(0)

      // 🔹 1. Получаем схему с бэкенда
      const { data: schema } = await axios.get(`/import/schema/${type}`)
      const {
        fields,
        requiredFields = [],
        transform,
        templateUrl
      } = schema
      setTemplateUrl(templateUrl || "")

      // 🔹 2. Читаем Excel-файл
      const rows = await readXlsxFile(file)
      const header = rows[0]
      const dataRows = rows.slice(1)

      const missing = requiredFields.filter(field => !header.includes(field))
      if (missing.length) {
        setError(`Отсутствуют обязательные поля: ${missing.join(", ")}`)
        return
      }

      // 🔹 3. Преобразуем строки
      const transformedData = []
      for (let row of dataRows) {
        const obj = {}
        fields.forEach((field, index) => {
          obj[field] = row[index]
        })

        const fn = new Function("row", `return (${transform})(row)`)
        const transformed = fn(obj)
        transformedData.push(transformed)
      }

      // 🔹 4. Отправляем
      const res = await axios.post(`/import/${type}`, transformedData)
      setImported(res.data.inserted?.length || 0)
      setErrors(res.data.errors || [])
    } catch (e) {
      console.error(e)
      setError("Ошибка при импорте файла")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError("")
    setErrors([])
    setImported(0)
    setTemplateUrl("")
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Импорт из Excel</DialogTitle>
      <DialogContent dividers>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {templateUrl && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Link
              href={templateUrl}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              download
            >
              📥 Скачать шаблон Excel
            </Link>
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </Alert>
        )}
        {imported > 0 && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Импортировано записей: {imported}
          </Alert>
        )}
        <input
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  )
}
