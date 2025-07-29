import React, { useEffect, useState } from "react"
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip
} from "@mui/material"
import DeleteIcon from "@mui/icons-material/Delete"
import axios from "@/api/axiosInstance"
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput"
import { confirmAction } from "@/utils/confirmAction"

export default function BillingAddressesTable({ clientId }) {
  const [rows, setRows] = useState([])
  const [newRow, setNewRow] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [backupRow, setBackupRow] = useState(null)

  useEffect(() => {
    if (!clientId || isNaN(+clientId)) return
    axios.get("/client_billing_addresses", {
      params: { client_id: clientId }
    }).then(res => {
      setRows(res.data || [])
    }).catch(err => {
      console.error("Ошибка при загрузке юр. адресов:", err)
    })
  }, [clientId])

  const handleChange = (row, value) => {
    const target = row.id ? rows : [newRow]
    const updater = r => (r.id === row.id ? { ...r, ...value } : r)

    if (row.id) {
      setRows(prev => prev.map(updater))
    } else {
      setNewRow(prev => ({ ...prev, ...value }))
    }
  }

  const handleSave = async (row) => {
    try {
      if (!row.formatted_address) return

      if (!row.id) {
        const res = await axios.post("/client_billing_addresses", {
          ...row,
          client_id: clientId
        })
        const fullRow = { ...row, id: res.data.id }
        setRows(prev => [fullRow, ...prev])
        setNewRow({})
      } else {
        await axios.put(`/client_billing_addresses/${row.id}`, row)
        setEditingId(null)
      }
    } catch (err) {
      console.error("Ошибка при сохранении юр. адреса:", err)
    }
  }

  const handleKeyDown = (e, row) => {
    if (e.key === "Enter") {
      handleSave(row)
    }
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
    const ok = await confirmAction("Удалить адрес?")
    if (!ok) return
    try {
      await axios.delete(`/client_billing_addresses/${id}`)
      setRows(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error("Ошибка при удалении юр. адреса:", err)
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
        <TableCell sx={{ width: "50%" }}>
          <PlaceAddressInput
            value={row.formatted_address || ""}
            onChange={val => handleChange(row, val)}
            onKeyDown={e => handleKeyDown(e, row)}
            autoFocus={!row.id}
          />
        </TableCell>

        <TableCell>
          <input
            type="text"
            value={row.label || ""}
            onChange={e => handleChange(row, { label: e.target.value })}
            onKeyDown={e => handleKeyDown(e, row)}
            style={{ width: "100%" }}
          />
        </TableCell>

        <TableCell>
          <input
            type="text"
            value={row.comment || ""}
            onChange={e => handleChange(row, { comment: e.target.value })}
            onKeyDown={e => handleKeyDown(e, row)}
            style={{ width: "100%" }}
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
          <TableCell>Юридический адрес</TableCell>
          <TableCell>Метка</TableCell>
          <TableCell>Комментарий</TableCell>
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
