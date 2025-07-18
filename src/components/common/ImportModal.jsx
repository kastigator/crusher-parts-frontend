import React, { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, LinearProgress, Box, Snackbar, Alert, IconButton
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import readXlsxFile from 'read-excel-file'
import { entitySchemas } from './entitySchemas'
import axios from '@/api/axiosInstance'

const ImportModal = ({ open, onClose, type, onImportComplete }) => {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState([])
  const [rows, setRows] = useState([])
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' })

  const config = entitySchemas[type]
  const importFields = config?.import?.fields || []
  const requiredFields = config?.import?.requiredFields || []
  const templateUrl = config?.import?.templateUrl
  const displayNames = config?.import?.displayNames || {}
  const validateRow = config?.validateImportRow
  const transformRow = config?.transformBeforeUpload

  useEffect(() => {
    if (!open) {
      setRows([])
      setErrors([])
    }
  }, [open])

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    try {
      const data = await readXlsxFile(file)
      const [header, ...body] = data

      const parsed = body
        .map(row => {
          const obj = {}
          header.forEach((col, i) => {
            obj[col] = row[i]
          })
          return obj
        })
        .filter(row => Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== ''))

      const seenCodes = new Set()
      const validationErrors = []
      const validRows = []

      parsed.forEach((row, index) => {
        const rowNumber = index + 2
        const code = String(row['Код'] || '').trim()

        if (!code) {
          validationErrors.push(`Строка ${rowNumber}: поле "Код" обязательно`)
          return
        }

        if (seenCodes.has(code)) {
          validationErrors.push(`Строка ${rowNumber}: дубликат кода "${code}" в файле`)
          return
        }

        seenCodes.add(code)

        const err = validateRow?.(row)
        if (err) {
          validationErrors.push(`Строка ${rowNumber}: ${err}`)
        } else {
          validRows.push(transformRow ? transformRow(row) : row)
        }
      })

      setRows(validRows)
      setErrors(validationErrors)
    } catch (err) {
      console.error('Ошибка чтения файла:', err)
      setErrors(['Ошибка чтения Excel-файла'])
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    setLoading(true)
    try {
      const endpoint = config?.endpoint
      if (!endpoint) throw new Error('Не указан endpoint в entitySchemas')

      const res = await axios.post(endpoint, rows)
      const result = res.data

      const added = result.inserted?.length || 0
      const failed = result.errors?.length || 0
      const hasDuplicates = result.errors?.some(err =>
        typeof err === 'string' && err.toLowerCase().includes('уже существует')
      )

      if (failed > 0) {
        setErrors(result.errors)
        setSnackbar({
          open: true,
          severity: added > 0 ? 'warning' : 'error',
          message: `Импорт частично завершён. Добавлено: ${added}, ошибок: ${failed}${hasDuplicates ? ' (повторы)' : ''}`
        })
      } else {
        setSnackbar({
          open: true,
          severity: 'success',
          message: `Импорт успешно завершён. Добавлено: ${added}`
        })
        onClose()
      }

      setRows([])
      onImportComplete?.()
    } catch (err) {
      console.error('❌ Ошибка при импорте:', err)
      setErrors([err.message || 'Ошибка при импорте'])
      setSnackbar({
        open: true,
        severity: 'error',
        message: 'Ошибка при импорте: ' + err.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Импорт данных из Excel
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Загрузите Excel-файл. Ожидаются колонки: {importFields.join(', ')}.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button component="label" variant="outlined">
              ВЫБРАТЬ ФАЙЛ EXCEL
              <input type="file" hidden accept=".xlsx" onChange={handleFile} />
            </Button>

            {templateUrl && (
              <Button
                variant="outlined"
                component="a"
                href={templateUrl}
                download
              >
                СКАЧАТЬ ШАБЛОН
              </Button>
            )}
          </Box>

          {loading && <LinearProgress sx={{ mt: 2 }} />}

          {errors.length > 0 && (
            <Box sx={{ mt: 2 }}>
              {errors.map((err, i) => (
                <Typography key={i} color="error" variant="body2">
                  • {err}
                </Typography>
              ))}
            </Box>
          )}

          {rows.length > 0 && (
            <Typography sx={{ mt: 2 }}>
              Готово к импорту: {rows.length} строк
            </Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>ОТМЕНА</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={loading || rows.length === 0}
          >
            ИМПОРТИРОВАТЬ
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default ImportModal
