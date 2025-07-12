import React, { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, LinearProgress, Box, Snackbar, Alert, IconButton
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import readXlsxFile from 'read-excel-file'
import { validateRows } from './importHelpers'
import { importConfigs } from './importConfigs'

const ImportModal = ({ open, onClose, type, onImportComplete, columns, templateUrl }) => {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState([])
  const [rows, setRows] = useState([])
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' })

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

      const parsed = body.map((row) => {
        const obj = {}
        header.forEach((col, i) => {
          obj[col] = row[i]
        })
        return obj
      })

      const config = importConfigs[type]
      const mapped = parsed.map(row => {
        const result = {}
        config.fields.forEach(({ label, field }) => {
          result[field] = row[label]
        })
        return result
      })

      const validated = await validateRows(mapped, type)
      setRows(validated.rows)
      setErrors(validated.errors)
    } catch (err) {
      console.error('Ошибка чтения файла:', err)
      setErrors(['Ошибка чтения файла'])
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    setLoading(true)
    try {
      const config = importConfigs[type]
      if (!config || !config.endpoint) {
        throw new Error('Неверный тип импорта или не указан endpoint')
      }

      const token = localStorage.getItem('token')

      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(rows)
      })

      const result = await res.json()

      if (!res.ok && !result.errors?.length) {
        throw new Error(result.message || 'Ошибка при импорте')
      }

      const added = result.inserted?.length || 0
      const failed = result.errors?.length || 0

      if (failed > 0) {
        setErrors(result.errors)
        setSnackbar({
          open: true,
          severity: added > 0 ? 'warning' : 'error',
          message: `Импорт завершён с ошибками. Добавлено: ${added}, ошибок: ${failed}`
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
      onImportComplete && onImportComplete()
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
            Загрузите Excel-файл. Ожидаются колонки: {columns.join(', ')}.<br />
            Используйте шаблон, чтобы избежать ошибок.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button component="label" variant="outlined">
              ВЫБРАТЬ ФАЙЛ EXCEL
              <input type="file" hidden accept=".xlsx" onChange={handleFile} />
            </Button>

            {templateUrl && (
              <Button
                variant="outlined"
                href={templateUrl}
                target="_blank"
                rel="noopener"
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
