import React, { useEffect, useMemo, useState } from 'react'
import {
  Paper, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, TextField, Tooltip, Typography, Box, Button, Stack
} from '@mui/material'
import {
  Save as SaveIcon, Delete as DeleteIcon, Cancel as CancelIcon,
  Add as AddIcon, History as HistoryIcon, FileUpload as ImportIcon
} from '@mui/icons-material'
import axios from '@/api/axiosInstance'
import { confirmAction } from '@/utils/confirmAction'
import TnvedHistoryDialog from '../tnved/TnvedHistoryDialog'
import ImportModal from './ImportModal'
import tableDefinitions from './tableDefinitions'

export default function EditableTable({ type, filters = {}, reloadFlag, page = 0, rowsPerPage = 50, setTotal = () => {} }) {
  const def = tableDefinitions[type]
  const { endpoint, columns, rowTemplate = {}, import: importConf, filters: filterDefs = [], features = {} } = def || {}

  const [rows, setRows] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [newRow, setNewRow] = useState({ ...rowTemplate })
  const [savedRowId, setSavedRowId] = useState(null)
  const [cancelledRowId, setCancelledRowId] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLogs, setHistoryLogs] = useState([])
  const [showImport, setShowImport] = useState(false)

  const loadData = async () => {
    try {
      const res = await axios.get(`/${endpoint}`)
      setRows(res.data)
    } catch (err) {
      console.error('Ошибка загрузки:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [reloadFlag])

  const handleChange = (id, field, value) => {
    setRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row))
  }

  const handleSave = async (id) => {
    const row = rows.find(r => r.id === id)
    try {
      await axios.put(`/${endpoint}/${id}`, row)
      setEditingId(null)
      setSavedRowId(id)
      setTimeout(() => setSavedRowId(null), 1500)
      loadData()
    } catch (err) {
      console.error('Ошибка при сохранении:', err)
    }
  }

  const handleDelete = async (id, label) => {
    const confirmed = await confirmAction({
      title: 'Удалить?',
      text: `Запись <b>${label}</b> будет удалена.`,
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
      icon: 'warning'
    })
    if (!confirmed) return

    try {
      await axios.delete(`/${endpoint}/${id}`)
      loadData()
    } catch (err) {
      console.error('Ошибка при удалении:', err)
    }
  }

  const handleAdd = async () => {
    const mainField = columns.find(col => col.required)?.field
    if (!mainField || !newRow[mainField]?.trim()) return

    try {
      const res = await axios.post(`/${endpoint}`, newRow)
      setNewRow({ ...rowTemplate })
      setSavedRowId(res.data?.id || 'new')
      setTimeout(() => setSavedRowId(null), 1500)
      loadData()
    } catch (err) {
      console.error('Ошибка при добавлении:', err)
    }
  }

  const openHistory = async (id) => {
    try {
      const res = await axios.get(`/${endpoint}/${id}/logs`)
      setHistoryLogs(Array.isArray(res.data) ? res.data : [])
      setHistoryOpen(true)
    } catch (err) {
      console.error('Ошибка истории:', err)
    }
  }

  const filteredRows = useMemo(() => {
    let result = rows
    const q = filters?.search?.trim()?.toLowerCase() || ''
    if (q) {
      result = result.filter(r =>
        columns.some(col =>
          String(r[col.field] || '').toLowerCase().includes(q)
        )
      )
    }

    const min = parseFloat(filters?.duty_rate_min)
    const max = parseFloat(filters?.duty_rate_max)
    if (!isNaN(min) || !isNaN(max)) {
      result = result.filter(r => {
        const rate = parseFloat(r.duty_rate)
        if (isNaN(rate)) return false
        if (!isNaN(min) && rate < min) return false
        if (!isNaN(max) && rate > max) return false
        return true
      })
    }

    return result
  }, [rows, filters, columns])

  useEffect(() => {
    setTotal(filteredRows.length)
  }, [filteredRows, setTotal])

  const paginated = useMemo(() => {
    const start = page * rowsPerPage
    return filteredRows.slice(start, start + rowsPerPage)
  }, [filteredRows, page, rowsPerPage])

  const getRowStyle = (id) => {
    if (id === savedRowId) return { backgroundColor: '#e6ffe6' }
    if (id === cancelledRowId) return { backgroundColor: '#f5f5f5' }
    return {}
  }

  if (!def) return <Typography sx={{ p: 2 }}>Конфигурация не найдена для: {type}</Typography>

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {def.title || type} ({filteredRows.length})
        </Typography>
        {importConf?.templateUrl && (
          <Button startIcon={<ImportIcon />} onClick={() => setShowImport(true)}>
            Импорт из Excel
          </Button>
        )}
      </Stack>

      {filterDefs.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {filterDefs.map(filter => (
            <TextField
              key={filter.field}
              label={filter.label}
              size="small"
              type={filter.type || 'text'}
              value={filters[filter.field] || ''}
              onChange={(e) => filters[filter.field + '_onChange']?.(e.target.value)}
              sx={{ minWidth: filter.type === 'number' ? 100 : 200 }}
            />
          ))}
        </Box>
      )}

      <Box sx={{ overflowX: 'auto', mt: 2 }}>
        <Table
          size="small"
          sx={{
            minWidth: 1200,
            tableLayout: 'fixed',
            '& .MuiTableCell-root': { py: 0.5, px: 1 },
            '& thead th': {
              position: 'sticky',
              top: 0,
              zIndex: 1,
              backgroundColor: '#fafafa',
              borderBottom: '2px solid #ddd'
            }
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map(col => (
                <Tooltip key={col.field} title={col.tooltip || col.label}>
                  <TableCell sx={{ width: col.width || 150 }}>{col.label}</TableCell>
                </Tooltip>
              ))}
              <TableCell align="center" sx={{ width: 130 }}>Действия</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            <TableRow onKeyDown={(e) => e.key === 'Enter' && handleAdd()}>
              {columns.map(col => (
                <TableCell key={col.field}>
                  <TextField
                    size="small"
                    type={col.type === 'number' ? 'number' : 'text'}
                    value={newRow[col.field] || ''}
                    onChange={e => setNewRow({ ...newRow, [col.field]: e.target.value })}
                    error={col.required && !newRow[col.field]?.trim()}
                    helperText={col.required && !newRow[col.field]?.trim() ? 'Обязательное' : ''}
                    fullWidth
                  />
                </TableCell>
              ))}
              <TableCell align="center">
                <Tooltip title="Добавить">
                  <IconButton onClick={handleAdd}><AddIcon /></IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>

            {paginated.map(row => {
              const isEditing = editingId === row.id
              return (
                <TableRow
                  key={row.id}
                  onDoubleClick={() => setEditingId(row.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave(row.id)
                    if (e.key === 'Escape') {
                      setCancelledRowId(row.id)
                      setTimeout(() => setCancelledRowId(null), 1000)
                      setEditingId(null)
                    }
                  }}
                  sx={{
                    ...(isEditing ? { borderLeft: '4px solid #fbc02d', backgroundColor: '#fff' } : {}),
                    ...getRowStyle(row.id)
                  }}
                >
                  {columns.map(col => (
                    <TableCell key={col.field}>
                      {isEditing ? (
                        <TextField
                          size="small"
                          type={col.type === 'number' ? 'number' : 'text'}
                          value={row[col.field] ?? ''}
                          onChange={e => handleChange(row.id, col.field, e.target.value)}
                          fullWidth
                        />
                      ) : (
                        row[col.field] || '—'
                      )}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    {isEditing ? (
                      <>
                        <IconButton onClick={() => handleSave(row.id)} color="success"><SaveIcon /></IconButton>
                        <IconButton onClick={() => {
                          setCancelledRowId(row.id)
                          setTimeout(() => setCancelledRowId(null), 1000)
                          setEditingId(null)
                        }} color="error"><CancelIcon /></IconButton>
                      </>
                    ) : (
                      <>
                        {features.enableDelete && (
                          <IconButton onClick={() => handleDelete(row.id, row[columns[0].field])}><DeleteIcon /></IconButton>
                        )}
                        {features.enableHistory && (
                          <IconButton onClick={() => openHistory(row.id)}><HistoryIcon /></IconButton>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Box>

      <TnvedHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        logs={historyLogs}
      />

      {importConf?.templateUrl && (
        <ImportModal
          open={showImport}
          onClose={() => setShowImport(false)}
          type={type}
          onImportComplete={loadData}
          columns={importConf.fields}
          templateUrl={importConf.templateUrl}
        />
      )}
    </Paper>
  )
}
