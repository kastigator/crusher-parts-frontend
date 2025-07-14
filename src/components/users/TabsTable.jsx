// components/users/TabsTable.jsx

import React, { useEffect, useState } from 'react'
import {
  Paper, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, TextField, Tooltip, Typography, Autocomplete
} from '@mui/material'
import {
  Save as SaveIcon, Edit as EditIcon, Delete as DeleteIcon,
  Cancel as CancelIcon, Add as AddIcon, DragIndicator as DragHandleIcon
} from '@mui/icons-material'
import * as MuiIcons from '@mui/icons-material'
import axios from '@/api/axiosInstance'
import { useTabs } from '@/context/TabsContext'
import { slugify } from 'transliteration'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { confirmAction } from '@/utils/confirmAction'

const iconOptions = Object.keys(MuiIcons).filter(k => /^[A-Z]/.test(k)).sort()

function DragHandleCell({ id }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.5 : 1
  }
  return (
    <TableCell ref={setNodeRef} {...attributes} {...listeners} sx={{ width: 36 }}>
      <DragHandleIcon fontSize="small" sx={style} />
    </TableCell>
  )
}

export default function TabsTable() {
  const [tabs, setTabs] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [newTab, setNewTab] = useState({ name: '', tab_name: '', path: '', icon: '' })
  const { reloadTabs } = useTabs()
  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    fetchTabs()
  }, [])

  const fetchTabs = async () => {
    try {
      const { data } = await axios.get('/tabs')
      setTabs(data)
    } catch (err) {
      console.error('Ошибка загрузки вкладок:', err)
    }
  }

  const handleChange = (id, field, value) => {
    setTabs(prev => prev.map(tab => tab.id === id ? { ...tab, [field]: value } : tab))
  }

  const saveEdit = async (id) => {
    const tab = tabs.find(t => t.id === id)
    try {
      await axios.put(`/tabs/${id}`, tab)
      setEditingId(null)
      fetchTabs()
      reloadTabs()
    } catch (err) {
      console.error('Ошибка при сохранении:', err)
    }
  }

  const handleDelete = async (id, name) => {
    const confirmed = await confirmAction({
      title: 'Удалить вкладку?',
      text: `Вкладка <b>${name}</b> будет удалена.`,
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
      icon: 'warning'
    })

    if (!confirmed) return

    try {
      await axios.delete(`/tabs/${id}`)
      fetchTabs()
      reloadTabs()
    } catch (err) {
      console.error('Ошибка при удалении:', err)
    }
  }

  const addTab = async () => {
    const name = newTab.name.trim()
    if (!name) return
    const slug = slugify(name).replace(/-/g, '_')
    const auto = {
      tab_name: slug,
      path: '/' + slug.replace(/_/g, '-')
    }
    const tab = { ...newTab, ...auto }
    try {
      await axios.post('/tabs', tab)
      setNewTab({ name: '', tab_name: '', path: '', icon: '' })
      fetchTabs()
      reloadTabs()
    } catch (err) {
      console.error('Ошибка при добавлении:', err)
    }
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tabs.findIndex(t => t.id === active.id)
    const newIndex = tabs.findIndex(t => t.id === over.id)
    const newTabs = [...tabs]
    const [moved] = newTabs.splice(oldIndex, 1)
    newTabs.splice(newIndex, 0, moved)
    setTabs(newTabs)
    try {
      const reordered = newTabs.map((tab, i) => ({ id: tab.id, order: i }))
      await axios.put('/tabs/order', reordered)
      reloadTabs()
    } catch (err) {
      console.error('Ошибка при обновлении порядка:', err)
    }
  }

  const previewSlug = slugify(newTab.name || '').replace(/-/g, '_')

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 4, maxWidth: '100%', overflowX: 'clip' }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Вкладки меню
      </Typography>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tabs.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <Table size="small" sx={{ width: '100%', tableLayout: 'auto' }}>
            <TableHead>
              <TableRow>
                <TableCell />
                {['Название', 'tab_name', 'path', 'Иконка', 'Действия'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell />
                <TableCell>
                  <TextField size="small" value={newTab.name} onChange={e => setNewTab({ ...newTab, name: e.target.value })} />
                </TableCell>
                <TableCell sx={{ minWidth: 160 }}>{previewSlug}</TableCell>
                <TableCell sx={{ minWidth: 160 }}>{'/' + previewSlug.replace(/_/g, '-')}</TableCell>
                <TableCell>
                  <Autocomplete
                    options={iconOptions}
                    value={newTab.icon || null}
                    onChange={(_, val) => setNewTab({ ...newTab, icon: val || '' })}
                    renderOption={(props, option) => {
                      const { key, ...rest } = props
                      return (
                        <li key={key} {...rest} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {MuiIcons[option] && React.createElement(MuiIcons[option], { fontSize: 'small' })}
                          {option}
                        </li>
                      )
                    }}
                    renderInput={(params) => <TextField {...params} size="small" />}
                    isOptionEqualToValue={(opt, val) => opt === val}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Добавить">
                    <IconButton onClick={addTab}><AddIcon /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>

              {tabs.map(tab => {
                const isEditing = editingId === tab.id
                return (
                  <TableRow key={tab.id}>
                    <DragHandleCell id={tab.id} />
                    {['name', 'tab_name', 'path'].map(field => (
                      <TableCell key={field}>
                        {isEditing
                          ? <TextField size="small" value={tab[field]} onChange={e => handleChange(tab.id, field, e.target.value)} />
                          : tab[field]}
                      </TableCell>
                    ))}
                    <TableCell>
                      {isEditing ? (
                        <Autocomplete
                          options={iconOptions}
                          value={tab.icon || null}
                          onChange={(_, val) => handleChange(tab.id, 'icon', val || '')}
                          renderOption={(props, option) => {
                            const { key, ...rest } = props
                            return (
                              <li key={key} {...rest} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {MuiIcons[option] && React.createElement(MuiIcons[option], { fontSize: 'small' })}
                                {option}
                              </li>
                            )
                          }}
                          renderInput={(params) => <TextField {...params} size="small" />}
                          isOptionEqualToValue={(opt, val) => opt === val}
                        />
                      ) : (
                        <Tooltip title={tab.icon || 'Нет иконки'}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {MuiIcons[tab.icon] && React.createElement(MuiIcons[tab.icon], { fontSize: 'small' })}
                            <span style={{ fontSize: 13, opacity: 0.7 }}>{tab.icon}</span>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <>
                          <IconButton onClick={() => saveEdit(tab.id)} color="success"><SaveIcon /></IconButton>
                          <IconButton onClick={() => setEditingId(null)} color="error"><CancelIcon /></IconButton>
                        </>
                      ) : (
                        <>
                          <IconButton onClick={() => setEditingId(tab.id)}><EditIcon /></IconButton>
                          <IconButton onClick={() => handleDelete(tab.id, tab.name)}><DeleteIcon /></IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>
    </Paper>
  )
}
