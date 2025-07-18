import React, { useState, useEffect } from 'react'
import axios from '@/api/axiosInstance'
import Swal from 'sweetalert2'
import BaseTable from '@/components/common/BaseTable'
import TableToolbar from '@/components/common/TableToolbar'
import ImportModal from '@/components/common/ImportModal'
import { tnvedTableColumns } from '@/components/common/tableDefinitions'
import TnvedHistoryDialog from './TnvedHistoryDialog'
import { Button, IconButton, Tooltip, Box } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import HistoryIcon from '@mui/icons-material/History'
import { confirmAction } from '@/utils/confirmAction'

export default function TnvedCodesTable() {
  const [data, setData] = useState([])
  const [search, setSearch] = useState('')
  const [newRow, setNewRow] = useState({})
  const [logs, setLogs] = useState([])
  const [logOpen, setLogOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [importOpen, setImportOpen] = useState(false)
  const [uniqueDutyRates, setUniqueDutyRates] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await axios.get('/tnved-codes')
      setData(res.data)

      const uniqueRates = [...new Set(
        res.data.map(item => item.duty_rate).filter(r => r !== null && r !== '')
      )]
      setUniqueDutyRates(uniqueRates)
    } catch (err) {
      console.error('Ошибка при загрузке кодов ТН ВЭД:', err)
    }
  }

  const handleAdd = async () => {
    try {
      const cleaned = {
        code: newRow.code?.trim(),
        description: newRow.description?.trim() || null,
        duty_rate: newRow.duty_rate || null,
        notes: newRow.notes?.trim() || null
      }

      await axios.post('/tnved-codes', cleaned)
      setNewRow({})
      await loadData()
    } catch (err) {
      console.error('Ошибка при добавлении:', err)
      Swal.fire('Ошибка', 'Не удалось добавить код', 'error')
    }
  }

  const handleSave = async (row) => {
    try {
      await axios.put(`/tnved-codes/${row.id}`, row)
      await loadData()
    } catch (err) {
      console.error('Ошибка при сохранении:', err)
      Swal.fire('Ошибка', 'Не удалось сохранить изменения', 'error')
    }
  }

  const handleDelete = async (row) => {
    try {
      await axios.delete(`/tnved-codes/${row.id}`)
      await loadData()
    } catch (err) {
      console.error('Ошибка при удалении:', err)
      Swal.fire('Ошибка', 'Не удалось удалить код', 'error')
    }
  }

  const handleShowLogs = async (row) => {
    try {
      const res = await axios.get(`/tnved-codes/${row.id}/logs`)
      setLogs(res.data)
      setLogOpen(true)
    } catch (err) {
      console.error(err)
      Swal.fire('Ошибка', 'Не удалось загрузить историю', 'error')
    }
  }

  const filteredData = data.filter((row) =>
    row.code?.toLowerCase().includes(search.toLowerCase()) ||
    row.description?.toLowerCase().includes(search.toLowerCase())
  )

  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  const finalColumns = [
    ...tnvedTableColumns.map(col => {
      if (col.field === 'duty_rate') {
        return {
          ...col,
          type: 'autocomplete',
          editorProps: {
            options: uniqueDutyRates,
            freeSolo: true,
            getOptionLabel: (opt) => String(opt ?? ''),
            renderOption: (props, option) => (
              <li {...props} key={option}>
                {option}
              </li>
            )
          }
        }
      }
      return col
    }),
    {
      field: 'actions',
      title: 'Действия',
      width: 120,
      renderCell: (row, onDelete, onShowLogs) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="История изменений">
            <IconButton size="small" onClick={() => onShowLogs?.(row)}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Удалить">
            <IconButton
              size="small"
              onClick={async () => {
                const confirmed = await confirmAction({
                  text: `Удалить код <b>${row.code}</b>${row.description ? ` – ${row.description}` : ''}?`
                })
                if (confirmed) onDelete?.(row)
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <TableToolbar
          filterValue={search}
          onFilterChange={setSearch}
          actionsRight={
            <>
              <Button
                variant="contained"
                color="primary"
                href="https://www.alta.ru/tnved/"
                target="_blank"
                sx={{ mr: 1 }}
              >
                ТН ВЭД (РОССИЯ)
              </Button>
              <Button
                variant="contained"
                color="primary"
                href="https://ec.europa.eu/taxation_customs/dds2/taric/taric_consultation.jsp"
                target="_blank"
                sx={{ mr: 1 }}
              >
                TARIC (ЕС)
              </Button>
              <Button variant="outlined" onClick={() => setImportOpen(true)}>
                Импорт
              </Button>
            </>
          }
        />
      </div>

      <BaseTable
        data={paginatedData}
        columns={finalColumns}
        newRow={newRow}
        setNewRow={setNewRow}
        onAdd={handleAdd}
        onSave={handleSave}
        onDelete={handleDelete}
        onShowLogs={handleShowLogs}
      />

      <TnvedHistoryDialog
        open={logOpen}
        onClose={() => setLogOpen(false)}
        logs={logs}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        type="tnved_codes"
        onImportComplete={loadData}
      />

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <label style={{ marginRight: 8 }}>Строк на странице:</label>
        <select
          value={rowsPerPage}
          onChange={(e) => {
            setPage(0)
            setRowsPerPage(parseInt(e.target.value, 10))
          }}
        >
          {[10, 25, 50, 100].map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <span style={{ marginLeft: 16 }}>
          Показано {filteredData.length === 0 ? 0 : page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, filteredData.length)} из {filteredData.length}
        </span>
      </div>
    </>
  )
}
