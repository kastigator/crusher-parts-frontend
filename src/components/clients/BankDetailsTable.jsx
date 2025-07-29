import React, { useEffect, useState } from "react"
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, TextField
} from "@mui/material"
import DeleteIcon from "@mui/icons-material/Delete"
import axios from "@/api/axiosInstance"
import fetchBankByBic from "@/utils/fetchBankByBic"
import { confirmAction } from "@/utils/confirmAction"

export default function BankDetailsTable({ clientId }) {
  const [rows, setRows] = useState([])
  const [newRow, setNewRow] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [backupRow, setBackupRow] = useState(null)

  useEffect(() => {
    if (!clientId || isNaN(+clientId)) return
    axios.get("/client_bank_details", {
      params: { client_id: clientId }
    }).then(res => {
      setRows(res.data || [])
    }).catch(err => {
      console.error("Ошибка при загрузке банковских реквизитов:", err)
    })
  }, [clientId])

  const handleChange = (row, field, value) => {
    if (!row.id) {
      setNewRow(prev => ({ ...prev, [field]: value }))
    } else {
      setRows(prev =>
        prev.map(r => (r.id === row.id ? { ...r, [field]: value } : r))
      )
    }

    if (field === "bic" && value.length === 9) {
      fetchBankByBic(value).then(data => {
        if (!data) return
        const updates = {
          bank_name: data.name?.payment,
          correspondent_account: data.correspondent_account
        }
        if (!row.id) {
          setNewRow(prev => ({ ...prev, ...updates }))
        } else {
          setRows(prev =>
            prev.map(r => (r.id === row.id ? { ...r, ...updates } : r))
          )
        }
      })
    }
  }

  const handleSave = async (row) => {
    try {
      if (!row.bank_name || !row.bic || !row.checking_account) return

      if (!row.id) {
        const res = await axios.post("/client_bank_details", {
          ...row,
          client_id: clientId
        })
        const fullRow = { ...row, id: res.data.id }
        setRows(prev => [fullRow, ...prev])
        setNewRow({})
      } else {
        await axios.put(`/client_bank_details/${row.id}`, row)
        setEditingId(null)
      }
    } catch (err) {
      console.error("Ошибка при сохранении банка:", err)
    }
  }

  const handleKeyDown = (e, row) => {
    if (e.key === "Enter") handleSave(row)
    if (e.key === "Escape") {
      if (!row.id) {
        setNewRow({})
      } else {
        setRows(prev =>
          prev.map(r => (r.id === row.id ? backupRow : r))
        )
        setEditingId(null)
      }
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirmAction("Удалить реквизиты?")
    if (!ok) return
    try {
      await axios.delete(`/client_bank_details/${id}`)
      setRows(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error("Ошибка при удалении банка:", err)
    }
  }

  const renderRow = (row) => {
    const isEditing = editingId === row.id

    return (
      <TableRow
        key={row.id || "new"}
        onDoubleClick={() => {
          if (row.id) {
            setBackupRow({ ...row })
            setEditingId(row.id)
          }
        }}
        sx={isEditing || !row.id ? { backgroundColor: "#f3f6f9" } : {}}
      >
        <TableCell>
          <TextField
            value={row.bank_name || ""}
            onChange={e => handleChange(row, "bank_name", e.target.value)}
            onKeyDown={e => handleKeyDown(e, row)}
            size="small"
            fullWidth
          />
        </TableCell>

        <TableCell>
          <TextField
            value={row.bic || ""}
            onChange={e => handleChange(row, "bic", e.target.value)}
            onKeyDown={e => handleKeyDown(e, row)}
            size="small"
            fullWidth
          />
        </TableCell>

        <TableCell>
          <TextField
            value={row.correspondent_account || ""}
            onChange={e => handleChange(row, "correspondent_account", e.target.value)}
            onKeyDown={e => handleKeyDown(e, row)}
            size="small"
            fullWidth
          />
        </TableCell>

        <TableCell>
          <TextField
            value={row.checking_account || ""}
            onChange={e => handleChange(row, "checking_account", e.target.value)}
            onKeyDown={e => handleKeyDown(e, row)}
            size="small"
            fullWidth
          />
        </TableCell>

        <TableCell sx={{ width: 48 }}>
          {row.id && (
            <Tooltip title="Удалить">
              <IconButton onClick={() => handleDelete(row.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Банк</TableCell>
          <TableCell>BIC</TableCell>
          <TableCell>Кор. счёт</TableCell>
          <TableCell>Расч. счёт</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {Object.keys(newRow).length > 0 && renderRow(newRow)}
        {rows.map(renderRow)}
      </TableBody>
    </Table>
  )
}
