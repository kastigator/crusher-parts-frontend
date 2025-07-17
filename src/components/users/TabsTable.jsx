import React, { useEffect, useState } from 'react'
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  Paper, TextField, IconButton, Tooltip, Autocomplete
} from '@mui/material'
import * as MuiIcons from '@mui/icons-material'
import AddIcon from '@mui/icons-material/AddRounded'
import SaveIcon from '@mui/icons-material/SaveRounded'
import CancelIcon from '@mui/icons-material/CancelRounded'
import DeleteIcon from '@mui/icons-material/DeleteRounded'
import EditIcon from '@mui/icons-material/EditRounded'
import { useTabs } from '@/context/TabsContext'
import { generateTabName } from '@/utils/textUtils'
import axios from '@/api/axiosInstance'
import Swal from 'sweetalert2'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const iconOptions = Object.keys(MuiIcons)

const emptyTab = {
  name: '',
  tab_name: '',
  path: '',
  icon: '',
  sort_order: 0
}

function SortableRow({ id, children, onDoubleClick }) {
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={onDoubleClick}
      sx={{ cursor: 'pointer' }}
    >
      {children}
    </TableRow>
  )
}

export default function TabsTable() {
  const { reloadTabs } = useTabs()
  const [tabs, setTabs] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [newTab, setNewTab] = useState(emptyTab)
  const [manualEdit, setManualEdit] = useState({})
  const [editedRow, setEditedRow] = useState({})

  useEffect(() => {
    loadTabs()
  }, [])

  const loadTabs = async () => {
    try {
      const res = await axios.get('/tabs')
      const sorted = res.data.sort((a, b) => a.sort_order - b.sort_order)
      setTabs(sorted)
    } catch (err) {
      console.error('Ошибка загрузки вкладок:', err)
    }
  }

  const handleEdit = (row) => {
    setEditingId(row.id)
    setEditedRow(row)
    setManualEdit({})
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditedRow({})
  }

  const handleChange = (field, value) => {
    const updated = { ...editedRow, [field]: value }

    if (field === 'name' && !manualEdit.tab_name && !manualEdit.path) {
      const base = generateTabName(value)
      updated.tab_name = base
      updated.path = `/${base}`
    }

    if (field === 'tab_name') setManualEdit(prev => ({ ...prev, tab_name: true }))
    if (field === 'path') setManualEdit(prev => ({ ...prev, path: true }))

    setEditedRow(updated)
  }

  const handleSave = async () => {
    try {
      await axios.put(`/tabs/${editedRow.id}`, editedRow)
      setEditingId(null)
      await loadTabs()
      reloadTabs()
    } catch (err) {
      console.error('Ошибка сохранения вкладки:', err)
    }
  }

  const handleDelete = async (row) => {
    const confirm = await Swal.fire({
      title: 'Удалить вкладку?',
      text: `Вы действительно хотите удалить "${row.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена'
    })
    if (!confirm.isConfirmed) return

    try {
      await axios.delete(`/tabs/${row.id}`)
      await loadTabs()
      reloadTabs()
    } catch (err) {
      console.error('Ошибка удаления вкладки:', err)
    }
  }

  const handleNewChange = (field, value) => {
    const updated = { ...newTab, [field]: value }

    if (field === 'name' && !manualEdit.tab_name && !manualEdit.path) {
      const base = generateTabName(value)
      updated.tab_name = base
      updated.path = `/${base}`
    }

    if (field === 'tab_name') setManualEdit(prev => ({ ...prev, tab_name: true }))
    if (field === 'path') setManualEdit(prev => ({ ...prev, path: true }))

    setNewTab(updated)
  }

  const handleAdd = async () => {
    try {
      await axios.post('/tabs', newTab)
      setNewTab(emptyTab)
      await loadTabs()
      reloadTabs()
    } catch (err) {
      console.error('Ошибка добавления вкладки:', err)
    }
  }

  const handleDragEnd = async ({ active, over }) => {
    if (!active || !over || active.id === over.id) return

    const oldIndex = tabs.findIndex(t => t.id === active.id)
    const newIndex = tabs.findIndex(t => t.id === over.id)

    const newTabs = arrayMove(tabs, oldIndex, newIndex).map((tab, index) => ({
      ...tab,
      id: Number(tab.id),
      sort_order: index
    }))

    setTabs(newTabs)

    const payload = newTabs.map(t => ({
      id: Number(t.id),
      sort_order: Number(t.sort_order)
    }))

    try {
      await axios.put('/tabs/order', payload)
      await loadTabs()
      reloadTabs()
    } catch (err) {
      console.error('Ошибка сортировки вкладок:', err)
    }
  }

  const cellSx = {
    minWidth: 100,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  }

  const renderRow = (row, isEdit, isNew = false) => {
    const data = isEdit ? editedRow : row
    const onChange = isNew ? handleNewChange : handleChange

    return (
      <>
        <TableCell sx={{ width: 36, textAlign: 'center' }}>
          <MuiIcons.DragIndicator sx={{ color: '#ccc' }} />
        </TableCell>

        <TableCell sx={cellSx}>
          <TextField
            value={data.name || ''}
            onChange={e => onChange('name', e.target.value)}
            size="small"
            fullWidth
            variant="standard"
          />
        </TableCell>

        <TableCell sx={cellSx}>
          <TextField
            value={data.tab_name || ''}
            onChange={e => onChange('tab_name', e.target.value)}
            size="small"
            fullWidth
            variant="standard"
          />
        </TableCell>

        <TableCell sx={cellSx}>
          <TextField
            value={data.path || ''}
            onChange={e => onChange('path', e.target.value)}
            size="small"
            fullWidth
            variant="standard"
          />
        </TableCell>

        <TableCell sx={cellSx}>
          <Autocomplete
            value={iconOptions.find(i => i === data.icon) || ''}
            onChange={(e, val) => onChange('icon', val)}
            options={iconOptions}
            getOptionLabel={(option) => option}
            isOptionEqualToValue={(option, value) => option === value}
            freeSolo
            fullWidth
            renderOption={(props, option) => {
              const Icon = MuiIcons[option]
              return (
                <li {...props} key={option}>
                  {Icon ? <Icon style={{ marginRight: 8 }} /> : null}
                  {option}
                </li>
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                variant="standard"
              />
            )}
          />
        </TableCell>

        <TableCell sx={{ width: 140 }}>
          {isNew ? (
            <Tooltip title="Добавить">
              <IconButton onClick={handleAdd}><AddIcon /></IconButton>
            </Tooltip>
          ) : isEdit ? (
            <>
              <Tooltip title="Сохранить">
                <IconButton onClick={handleSave}><SaveIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Отмена">
                <IconButton onClick={handleCancel}><CancelIcon /></IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="Редактировать">
                <IconButton onClick={() => handleEdit(row)}><EditIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Удалить">
                <IconButton onClick={() => handleDelete(row)}><DeleteIcon /></IconButton>
              </Tooltip>
            </>
          )}
        </TableCell>
      </>
    )
  }

  return (
    <Paper sx={{ p: 2, mt: 2, borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f3f6fa' }}>
            <TableCell />
            <TableCell>Название</TableCell>
            <TableCell>Ключ</TableCell>
            <TableCell>Путь</TableCell>
            <TableCell>Иконка</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tabs.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <TableBody>
              <TableRow>{renderRow(newTab, false, true)}</TableRow>
              {tabs.map(row => (
                <SortableRow
                  key={row.id}
                  id={row.id}
                  onDoubleClick={() => handleEdit(row)}
                >
                  {renderRow(row, editingId === row.id)}
                </SortableRow>
              ))}
            </TableBody>
          </SortableContext>
        </DndContext>
      </Table>
    </Paper>
  )
}
