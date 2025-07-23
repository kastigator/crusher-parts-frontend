// src/components/users/TabsTable.jsx

import React, { useEffect, useState, useRef } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Select, MenuItem, IconButton, Box, Tooltip
} from "@mui/material"
import { Save, Delete, DragIndicator, Edit } from "@mui/icons-material"
import * as MuiIcons from "@mui/icons-material"
import axios from "@/api/axiosInstance.js"
import { confirmAction } from "@/utils/confirmAction.js"
import { transliterate as tr } from "transliteration"
import { useTabs } from "@/context/TabsContext"

// Выбираемые иконки (добавь по необходимости)
const ICON_OPTIONS = [
  "Dashboard", "Inventory", "People", "ShoppingCart", "Settings",
  "LocalShipping", "Category", "Assignment", "Build", "BarChart"
]

const ICONS_MAP = Object.fromEntries(
  ICON_OPTIONS.map(name => [
    name,
    MuiIcons[name] ? React.createElement(MuiIcons[name], { fontSize: "small" }) : null
  ])
)

export default function TabsTable() {
  const [tabs, setTabs] = useState([])
  const [newTab, setNewTab] = useState({ name: "", tab_name: "", path: "", icon: "" })
  const [editIndex, setEditIndex] = useState(null)
  const [editTab, setEditTab] = useState({})
  const draggingIndex = useRef(null)
  const { reloadTabs } = useTabs()

  useEffect(() => { fetchTabs() }, [])

  const fetchTabs = async () => {
    const res = await axios.get("/tabs")
    setTabs(Array.isArray(res.data) ? res.data.sort((a, b) => a.sort_order - b.sort_order) : [])
  }

  // --- CRUD ---

  const handleAdd = async () => {
    const { name, tab_name, path } = newTab
    if (!name || !tab_name || !path) return
    await axios.post("/tabs", newTab)
    setNewTab({ name: "", tab_name: "", path: "", icon: "" })
    await fetchTabs()
    reloadTabs?.()
  }

  const handleEditStart = (i) => {
    setEditIndex(i)
    setEditTab({ ...tabs[i] })
  }

  const handleEditCancel = () => {
    setEditIndex(null)
    setEditTab({})
  }

  const handleEditChange = (field, value) => {
    setEditTab((prev) => ({ ...prev, [field]: value }))
  }

  const handleEditSave = async () => {
    await axios.put(`/tabs/${editTab.id}`, editTab)
    setEditIndex(null)
    setEditTab({})
    await fetchTabs()
    reloadTabs?.()
  }

  const handleDelete = async (tab) => {
    const confirmed = await confirmAction(`Удалить вкладку "${tab.name}"?`)
    if (!confirmed) return
    await axios.delete(`/tabs/${tab.id}`)
    await fetchTabs()
    reloadTabs?.()
  }

  // --- Drag & drop ---
  const handleReorder = async (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return
    const updated = [...tabs]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    const reordered = updated.map((t, i) => ({ ...t, sort_order: i }))
    setTabs(reordered)
    await axios.put("/tabs/order", reordered.map(t => ({ id: Number(t.id), sort_order: t.sort_order })))
    await fetchTabs()
    reloadTabs?.()
  }

  const handleDragStart = (index) => { draggingIndex.current = index }
  const handleDragOver = (index, e) => {
    e.preventDefault()
    const from = draggingIndex.current
    if (from === null || from === index) return
    handleReorder(from, index)
    draggingIndex.current = index
  }

  // --- Автоматическая генерация tab_name и path ---
  const handleNameInput = (e) => {
    const name = e.target.value
    setNewTab((prev) => ({
      ...prev,
      name,
      tab_name: prev.tab_name || tr(name).toLowerCase().replace(/\s+/g, "_"),
      path: prev.path || "/" + tr(name).toLowerCase().replace(/\s+/g, "-")
    }))
  }

  // --- Keyboard for add row ---
  const handleNewTabKeyDown = (e) => {
    if (e.key === "Enter") handleAdd()
    if (e.key === "Escape") setNewTab({ name: "", tab_name: "", path: "", icon: "" })
  }

  return (
    <Box>
      {/* Строка для добавления новой вкладки */}
      <Box display="flex" gap={2} mb={2}>
        <TextField
          label="Название"
          size="small"
          value={newTab.name}
          onChange={handleNameInput}
          onKeyDown={handleNewTabKeyDown}
        />
        <TextField
          label="Системное имя"
          size="small"
          value={newTab.tab_name}
          onChange={e => setNewTab({ ...newTab, tab_name: e.target.value })}
          onKeyDown={handleNewTabKeyDown}
        />
        <TextField
          label="Путь"
          size="small"
          value={newTab.path}
          onChange={e => setNewTab({ ...newTab, path: e.target.value })}
          onKeyDown={handleNewTabKeyDown}
        />
        <Select
          size="small"
          value={newTab.icon}
          displayEmpty
          onChange={e => setNewTab({ ...newTab, icon: e.target.value })}
          renderValue={selected => (selected ? ICONS_MAP[selected] : "— выбрать иконку —")}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">— выбрать иконку —</MenuItem>
          {ICON_OPTIONS.map(icon => (
            <MenuItem key={icon} value={icon}>
              <Box display="flex" alignItems="center" gap={1}>
                {ICONS_MAP[icon]}
                <span style={{ fontSize: 13 }}>{icon}</span>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Название</TableCell>
            <TableCell>Системное имя</TableCell>
            <TableCell>Путь</TableCell>
            <TableCell>Иконка</TableCell>
            <TableCell align="center">Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tabs.map((tab, index) => {
            const isEditing = editIndex === index
            return (
              <TableRow
                key={tab.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={e => handleDragOver(index, e)}
                sx={{ cursor: "grab" }}
                onDoubleClick={() => !isEditing && handleEditStart(index)}
              >
                {/* Drag handle */}
                <TableCell width={36}>
                  <DragIndicator fontSize="small" sx={{ color: "#bbb" }} />
                </TableCell>

                {/* Название */}
                <TableCell>
                  {isEditing ? (
                    <TextField
                      size="small"
                      value={editTab.name}
                      onChange={e => handleEditChange("name", e.target.value)}
                      autoFocus
                      fullWidth
                      onKeyDown={e => {
                        if (e.key === "Enter") handleEditSave()
                        if (e.key === "Escape") handleEditCancel()
                      }}
                    />
                  ) : (
                    tab.name
                  )}
                </TableCell>

                {/* Системное имя */}
                <TableCell>
                  {isEditing ? (
                    <TextField
                      size="small"
                      value={editTab.tab_name}
                      onChange={e => handleEditChange("tab_name", e.target.value)}
                      fullWidth
                      onKeyDown={e => {
                        if (e.key === "Enter") handleEditSave()
                        if (e.key === "Escape") handleEditCancel()
                      }}
                    />
                  ) : (
                    tab.tab_name
                  )}
                </TableCell>

                {/* Путь */}
                <TableCell>
                  {isEditing ? (
                    <TextField
                      size="small"
                      value={editTab.path}
                      onChange={e => handleEditChange("path", e.target.value)}
                      fullWidth
                      onKeyDown={e => {
                        if (e.key === "Enter") handleEditSave()
                        if (e.key === "Escape") handleEditCancel()
                      }}
                    />
                  ) : (
                    tab.path
                  )}
                </TableCell>

                {/* Иконка */}
                <TableCell align="center">
                  {isEditing ? (
                    <Select
                      size="small"
                      value={editTab.icon || ""}
                      onChange={e => handleEditChange("icon", e.target.value)}
                      renderValue={selected => ICONS_MAP[selected] || ""}
                      sx={{ width: 48 }}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleEditSave()
                        if (e.key === "Escape") handleEditCancel()
                      }}
                    >
                      {ICON_OPTIONS.map(icon => (
                        <MenuItem key={icon} value={icon}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {ICONS_MAP[icon]}
                            <span style={{ fontSize: 13 }}>{icon}</span>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  ) : (
                    tab.icon && ICONS_MAP[tab.icon]
                  )}
                </TableCell>

                {/* Действия */}
                <TableCell align="center">
                  {isEditing ? (
                    <>
                      <IconButton onClick={handleEditSave} size="small" title="Сохранить"><Save /></IconButton>
                      <IconButton onClick={handleEditCancel} size="small" title="Отмена"><Delete /></IconButton>
                    </>
                  ) : (
                    <>
                      <Tooltip title="Редактировать">
                        <IconButton onClick={() => handleEditStart(index)} size="small"><Edit /></IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton onClick={() => handleDelete(tab)} size="small"><Delete /></IconButton>
                      </Tooltip>
                    </>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Box>
  )
}
