import React, { useEffect, useState } from "react"
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Collapse, Tooltip, Box, TextField
} from "@mui/material"
import {
  ExpandMore, ExpandLess, Delete, History
} from "@mui/icons-material"
import axios from "@/api/axiosInstance"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import { confirmAction } from "@/utils/confirmAction"

export default function ClientsTable({
  expandedClientId,
  setExpandedClientId,
  setAllClients,
  search,
  setSearch
}) {
  const [rows, setRows] = useState([])
  const [newRow, setNewRow] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [backup, setBackup] = useState({})
  const [logClientId, setLogClientId] = useState(null)

  useEffect(() => {
    axios.get("/clients").then(res => {
      setRows(res.data || [])
      setAllClients?.(res.data || [])
    })
  }, [])

  const filtered = rows.filter(r =>
    r.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.contact_person?.toLowerCase().includes(search.toLowerCase())
  )

  const handleChange = (row, field, value) => {
    const update = row.id ? setRows : setNewRow
    const target = row.id ? [...rows] : { ...newRow }

    if (row.id) {
      const idx = target.findIndex(r => r.id === row.id)
      target[idx] = { ...target[idx], [field]: value }
      update(target)
    } else {
      update({ ...target, [field]: value })
    }
  }

  const handleSave = async (row) => {
    if (!row.company_name) return

    if (!row.id) {
      const res = await axios.post("/clients", row)
      const full = { ...row, id: res.data.id }
      setRows(prev => [full, ...prev])
      setNewRow({})
    } else {
      await axios.put(`/clients/${row.id}`, row)
      setEditingId(null)
    }
  }

  const handleKeyDown = (e, row) => {
    if (e.key === "Enter") handleSave(row)
    if (e.key === "Escape") {
      if (!row.id) {
        setNewRow({})
      } else {
        setRows(prev =>
          prev.map(r => (r.id === row.id ? backup : r))
        )
        setEditingId(null)
      }
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirmAction("Удалить клиента?")
    if (!ok) return
    await axios.delete(`/clients/${id}`)
    setRows(prev => prev.filter(r => r.id !== id))
    if (expandedClientId === id) setExpandedClientId(null)
  }

  const renderRow = (row) => {
    const isEditing = editingId === row.id
    const isExpanded = expandedClientId === row.id

    return (
      <React.Fragment key={row.id}>
        <TableRow
          onDoubleClick={() => {
            if (row.id) {
              setEditingId(row.id)
              setBackup({ ...row })
            }
          }}
          sx={isEditing || !row.id ? { backgroundColor: "#f3f6f9" } : {}}
        >
          <TableCell sx={{ width: 48 }}>
            {row.id && (
              <IconButton onClick={() =>
                setExpandedClientId(isExpanded ? null : row.id)
              }>
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
          </TableCell>

          <TableCell>
            <TextField
              value={row.company_name || ""}
              onChange={e => handleChange(row, "company_name", e.target.value)}
              onKeyDown={e => handleKeyDown(e, row)}
              size="small"
              fullWidth
              autoFocus={!row.id}
            />
          </TableCell>

          <TableCell>
            <TextField
              value={row.contact_person || ""}
              onChange={e => handleChange(row, "contact_person", e.target.value)}
              onKeyDown={e => handleKeyDown(e, row)}
              size="small"
              fullWidth
            />
          </TableCell>

          <TableCell>
            <TextField
              value={row.phone || ""}
              onChange={e => handleChange(row, "phone", e.target.value)}
              onKeyDown={e => handleKeyDown(e, row)}
              size="small"
              fullWidth
            />
          </TableCell>

          <TableCell>
            <TextField
              value={row.email || ""}
              onChange={e => handleChange(row, "email", e.target.value)}
              onKeyDown={e => handleKeyDown(e, row)}
              size="small"
              fullWidth
            />
          </TableCell>

          <TableCell sx={{ width: 48 }}>
            {row.id && (
              <>
                <Tooltip title="Удалить">
                  <IconButton onClick={() => handleDelete(row.id)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="История изменений">
                  <IconButton onClick={() => setLogClientId(row.id)}>
                    <History fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </TableCell>
        </TableRow>

        {row.id && (
          <TableRow>
            <TableCell colSpan={6} sx={{ p: 0 }}>
              <Collapse in={expandedClientId === row.id} timeout="auto" unmountOnExit>
                <Box sx={{ p: 2 }} />
              </Collapse>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    )
  }

  return (
    <Box>
      <TextField
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Поиск по названию или контакту"
        size="small"
        fullWidth
        sx={{ mb: 2 }}
      />

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Компания</TableCell>
            <TableCell>Контакт</TableCell>
            <TableCell>Телефон</TableCell>
            <TableCell>Email</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.keys(newRow).length > 0 && renderRow(newRow)}
          {filtered.map(renderRow)}
        </TableBody>
      </Table>

      <FullHistoryDialog
        open={!!logClientId}
        onClose={() => setLogClientId(null)}
        clientId={logClientId}
      />
    </Box>
  )
}
