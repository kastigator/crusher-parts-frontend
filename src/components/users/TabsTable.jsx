import React, { useEffect, useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Select, MenuItem, IconButton, Box, Tooltip, InputLabel
} from "@mui/material"
import { Save, Delete, Edit } from "@mui/icons-material"
import * as MuiIcons from "@mui/icons-material"
import axios from "@/api/axiosInstance"
import { confirmAction } from "@/utils/confirmAction"
import { transliterate as tr } from "transliteration"
import { useTabs } from "@/context/TabsContext"
import TableWrapper from "@/components/common/TableWrapper"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core"

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"

import { CSS } from "@dnd-kit/utilities"

const ICON_OPTIONS = Object.keys(MuiIcons).filter(name => /^[A-Z]/.test(name))

export default function TabsTable() {
  const [tabs, setTabs] = useState([])
  const [newTab, setNewTab] = useState({ name: "", tab_name: "", path: "", icon: "" })
  const [editIndex, setEditIndex] = useState(null)
  const [editTab, setEditTab] = useState({})
  const [iconSearch, setIconSearch] = useState("")
  const { reloadTabs } = useTabs()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  useEffect(() => { fetchTabs() }, [])

  const fetchTabs = async () => {
    const res = await axios.get("/tabs")
    const data = Array.isArray(res.data) ? res.data.sort((a, b) => a.sort_order - b.sort_order) : []
    setTabs(data)
  }

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
    await axios.put(`/tabs/${editTab.id}`, {
      ...editTab,
      sort_order: editIndex,
    })
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

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tabs.findIndex(t => t.id === active.id)
    const newIndex = tabs.findIndex(t => t.id === over.id)
    const newTabs = arrayMove(tabs, oldIndex, newIndex)
      .map((t, i) => ({ ...t, sort_order: i }))
    setTabs(newTabs)

    await axios.put("/tabs/order", newTabs.map(t => ({ id: Number(t.id), sort_order: t.sort_order })))
    reloadTabs?.()
  }

  const handleNameInput = (e) => {
    const name = e.target.value
    setNewTab((prev) => ({
      ...prev,
      name,
      tab_name: prev.tab_name || tr(name).toLowerCase().replace(/\s+/g, "_"),
      path: prev.path || "/" + tr(name).toLowerCase().replace(/\s+/g, "-")
    }))
  }

  const handleNewTabKeyDown = (e) => {
    if (e.key === "Enter") handleAdd()
    if (e.key === "Escape") setNewTab({ name: "", tab_name: "", path: "", icon: "" })
  }

  const filteredIcons = ICON_OPTIONS.filter(icon => icon.toLowerCase().includes(iconSearch.toLowerCase()))

  return (
    <TableWrapper title="Управление вкладками">
      <Box display="flex" gap={2} mb={2}>
        <TextField label="Название" size="small" value={newTab.name} onChange={handleNameInput} onKeyDown={handleNewTabKeyDown} />
        <TextField label="Системное имя" size="small" value={newTab.tab_name} onChange={e => setNewTab({ ...newTab, tab_name: e.target.value })} onKeyDown={handleNewTabKeyDown} />
        <TextField label="Путь" size="small" value={newTab.path} onChange={e => setNewTab({ ...newTab, path: e.target.value })} onKeyDown={handleNewTabKeyDown} />
        <Box display="flex" flexDirection="column" minWidth={180}>
          <TextField size="small" placeholder="Поиск иконки" value={iconSearch} onChange={e => setIconSearch(e.target.value)} />
          <Select
            size="small"
            value={newTab.icon}
            displayEmpty
            onChange={e => setNewTab({ ...newTab, icon: e.target.value })}
            renderValue={selected => (
              selected ? React.createElement(MuiIcons[selected], { fontSize: "small" }) : "— выбрать иконку —"
            )}
          >
            <MenuItem value="">— выбрать иконку —</MenuItem>
            {filteredIcons.map(icon => (
              <MenuItem key={icon} value={icon}>
                <Box display="flex" alignItems="center" gap={1}>
                  {React.createElement(MuiIcons[icon], { fontSize: "small" })}
                  <span style={{ fontSize: 13 }}>{icon}</span>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Box>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tabs.map(t => t.id)} strategy={verticalListSortingStrategy}>
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
              {tabs.map((tab, index) => (
                <SortableRow
                  key={tab.id}
                  tab={tab}
                  index={index}
                  isEditing={editIndex === index}
                  editTab={editTab}
                  onEditStart={() => handleEditStart(index)}
                  onEditChange={handleEditChange}
                  onEditCancel={handleEditCancel}
                  onEditSave={handleEditSave}
                  onDelete={() => handleDelete(tab)}
                />
              ))}
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>
    </TableWrapper>
  )
}

function SortableRow({ tab, index, isEditing, editTab, onEditStart, onEditChange, onEditCancel, onEditSave, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: tab.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const Icon = tab.icon && MuiIcons[tab.icon]

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes} {...listeners} sx={{ cursor: "grab" }} onDoubleClick={onEditStart}>
      <TableCell width={36}>::</TableCell>

      <TableCell>
        {isEditing ? (
          <TextField
            size="small"
            value={editTab.name}
            onChange={e => onEditChange("name", e.target.value)}
            autoFocus
            fullWidth
            onKeyDown={e => {
              if (e.key === "Enter") onEditSave()
              if (e.key === "Escape") onEditCancel()
            }}
          />
        ) : tab.name}
      </TableCell>

      <TableCell>
        {isEditing ? (
          <TextField
            size="small"
            value={editTab.tab_name}
            onChange={e => onEditChange("tab_name", e.target.value)}
            fullWidth
          />
        ) : tab.tab_name}
      </TableCell>

      <TableCell>
        {isEditing ? (
          <TextField
            size="small"
            value={editTab.path}
            onChange={e => onEditChange("path", e.target.value)}
            fullWidth
          />
        ) : tab.path}
      </TableCell>

      <TableCell align="center">
        {isEditing ? (
          <Select
            size="small"
            value={editTab.icon || ""}
            onChange={e => onEditChange("icon", e.target.value)}
            renderValue={selected =>
              selected ? React.createElement(MuiIcons[selected], { fontSize: "small" }) : ""
            }
            sx={{ width: 48 }}
          >
            {ICON_OPTIONS.map(icon => (
              <MenuItem key={icon} value={icon}>
                <Box display="flex" alignItems="center" gap={1}>
                  {React.createElement(MuiIcons[icon], { fontSize: "small" })}
                  <span style={{ fontSize: 13 }}>{icon}</span>
                </Box>
              </MenuItem>
            ))}
          </Select>
        ) : (
          Icon ? <Icon fontSize="small" /> : null
        )}
      </TableCell>

      <TableCell align="center">
        {isEditing ? (
          <>
            <IconButton onClick={onEditSave} size="small" title="Сохранить"><Save /></IconButton>
            <IconButton onClick={onEditCancel} size="small" title="Отмена"><Delete /></IconButton>
          </>
        ) : (
          <>
            <Tooltip title="Редактировать">
              <IconButton onClick={onEditStart} size="small"><Edit /></IconButton>
            </Tooltip>
            <Tooltip title="Удалить">
              <IconButton onClick={onDelete} size="small"><Delete /></IconButton>
            </Tooltip>
          </>
        )}
      </TableCell>
    </TableRow>
  )
}
