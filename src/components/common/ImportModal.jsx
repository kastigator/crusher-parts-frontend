// src/components/common/ImportModal.jsx

import React, { useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Alert
} from "@mui/material"
import readXlsxFile from "read-excel-file"
import { entitySchemas } from "./entitySchemas"
import axios from "@/api/axiosInstance"

export default function ImportModal({ open, onClose, type }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [imported, setImported] = useState(0)

  const handleFileChange = async (event) => {
    const file = event.target.files[0]
    if (!file || !type) return

    const schema = entitySchemas[type]
    if (!schema || !schema.import) {
      setError("Схема импорта не найдена")
      return
    }

    const { fields, requiredFields = [], validateImportRow, transformBeforeUpload, endpoint } = schema.import

    try {
      setLoading(true)
      setError("")
      setImported(0)

      const rows = await readXlsxFile(file)
      const header = rows[0]
      const dataRows = rows.slice(1)

      const missingFields = requiredFields.filter(field => !header.includes(field))
      if (missingFields.length > 0) {
        setError(`Отсутствуют обязательные поля: ${missingFields.join(", ")}`)
        return
      }

      const transformedData = []
      for (let row of dataRows) {
        const rowObj = {}
        fields.forEach((field, index) => {
          rowObj[field] = row[index]
        })

        const validationError = validateImportRow?.(rowObj)
        if (validationError) {
          setError(`Ошибка валидации: ${validationError}`)
          return
        }

        const transformed = transformBeforeUpload?.(rowObj) || rowObj
        transformedData.push(transformed)
      }

      const url = endpoint || `/api/${type}/import`
      await axios.post(url, transformedData)

      setImported(transformedData.length)
    } catch (e) {
      setError("Ошибка при импорте файла")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError("")
    setImported(0)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Импорт из Excel</DialogTitle>
      <DialogContent dividers>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="error">{error}</Alert>}
        {imported > 0 && <Alert severity="success">Импортировано записей: {imported}</Alert>}
        <input type="file" accept=".xlsx" onChange={handleFileChange} disabled={loading} />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  )
}
