// src/components/users/TabsTable.jsx

import React, { useEffect, useMemo, useState } from 'react'
import {
  Box, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, TextField, Autocomplete, Typography, Tooltip
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CancelIcon,
  DragIndicator as DragHandleIcon
} from '@mui/icons-material'
import * as MuiIcons from '@mui/icons-material'
import { generateTabName } from '@/utils/textUtils'
import { useTabs } from '@/context/TabsContext'
import axios from '@/api/axiosInstance'
import { arrayMoveImmutable } from 'array-move'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { confirmAction } from '@/utils/confirmAction'

function SortableRow({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }
  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      {children.map((cell, index) =>
        index === 0 ? (
          <TableCell key={index} {...listeners} style={{ cursor: 'grab' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DragHandleIcon fontSize="small" />
              {cell}
            </Box>
          </TableCell>
        ) : (
          <TableCell key={index}>{cell}</TableCell>
        )
      )}
    </TableRow>
  )
}

export default function TabsTable() {
  const { reloadTabs } = useTabs()
  const [tabs, setTabs] = useState([])
  const [editId, setEditId] = useState(null)
  const [editRow, setEditRow] = useState({})
  const [newRow, setNewRow] = useState({})

  const iconOptions = useMemo(() =>
    Object.keys(MuiIcons).map(name => ({
      label: name,
      value: name,
      icon: MuiIcons[name]
    }))
  , [])

  const fetchTabs = async () => {
    const res = await axios.get('/tabs')
    setTabs(res.data)
  }

  useEffect(() => { fetchTabs() }, [])

  const handleAdd = async () => {
    await axios.post('/tabs', newRow)
    setNewRow({})
    await fetchTabs()
    reloadTabs()
  }

  const handleSave = async () => {
    await axios.put(`/tabs/${editId}`, editRow)
    setEditId(null)
    await fetchTabs()
    reloadTabs()
  }

  const handleDelete = async (tab) => {
    const confirmed = await confirmAction({
      title: `Удалить вкладку «${tab.name}»?`,
      text: 'Это действие также удалит связанные права доступа.'
    })
    if (!confirmed) return
    await axios.delete(`/tabs/${tab.id}`)
    await fetchTabs()
    reloadTabs()
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tabs.findIndex(tab => tab.id === active.id)
    const newIndex = tabs.findIndex(tab => tab.id === over.id)
    const newTabs = arrayMoveImmutable(tabs, oldIndex, newIndex)
    setTabs(newTabs)

    const payload = newTabs.map((tab, i) => ({
      id: Number(tab.id),
      sort_order: i + 1
    }))

    await axios.put('/tabs/order', payload)
    reloadTabs()
  }

  const renderIconField = (value, onChange) => (
    <Autocomplete
      options={iconOptions}
      value={iconOptions.find(o => o.value === value) || null}
      onChange={(_, newVal) => onChange(newVal?.value || '')}
      getOptionLabel={o => o.label}
      renderOption={(props, option) => (
        <li {...props} key={option.value}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {React.createElement(option.icon, { fontSize: 'small' })}
            {option.label}
          </Box>
        </li>
      )}
      renderInput={(params) => <TextField {...params} size="small" />}
      isOptionEqualToValue={(opt, val) => opt.value === val.value}
      disableClearable
    />
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setEditId(null)
      setEditRow({})
    }
  }

  const autoUpdateSlug = (currentRow, newName) => {
    const generated = generateTabName(newName)
    const wasAuto = currentRow.tab_name === generateTabName(currentRow.name) &&
                    currentRow.path === `/${generateTabName(currentRow.name)}`
    return wasAuto
      ? { ...currentRow, name: newName, tab_name: generated, path: `/${generated}` }
      : { ...currentRow, name: newName }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Управление вкладками</Typography>

      <Table size="small" onKeyDown={handleKeyDown}>
        <TableHead>
          <TableRow>
            <TableCell>Название (RU)</TableCell>
            <TableCell>tab_name</TableCell>
            <TableCell>path</TableCell>
            <TableCell>Иконка</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tabs.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <TableBody>
              {/* строка добавления новой вкладки — СВЕРХУ */}
              <TableRow>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DragHandleIcon fontSize="small" sx={{ visibility: 'hidden' }} />
                    <TextField
                      value={newRow.name || ''}
                      onChange={e => {
                        const name = e.target.value
                        const slug = generateTabName(name)
                        setNewRow({ ...newRow, name, tab_name: slug, path: `/${slug}` })
                      }}
                      size="small"
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <TextField
                    value={newRow.tab_name || ''}
                    onChange={e => setNewRow({ ...newRow, tab_name: e.target.value })}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={newRow.path || ''}
                    onChange={e => setNewRow({ ...newRow, path: e.target.value })}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {renderIconField(newRow.icon, icon => setNewRow({ ...newRow, icon }))}
                </TableCell>
                <TableCell>
                  <IconButton onClick={handleAdd}><SaveIcon /></IconButton>
                </TableCell>
              </TableRow>

              {tabs.map(tab => {
                const isEditing = editId === tab.id
                const cells = isEditing ? [
                  <TextField
                    key="name"
                    value={editRow.name || ''}
                    onChange={e => setEditRow(autoUpdateSlug(editRow, e.target.value))}
                    size="small"
                    autoFocus
                  />,
                  <TextField
                    key="tab_name"
                    value={editRow.tab_name || ''}
                    onChange={e => setEditRow({ ...editRow, tab_name: e.target.value })}
                    size="small"
                  />,
                  <TextField
                    key="path"
                    value={editRow.path || ''}
                    onChange={e => setEditRow({ ...editRow, path: e.target.value })}
                    size="small"
                  />,
                  renderIconField(editRow.icon, icon => setEditRow({ ...editRow, icon })),
                  <Box key="actions" sx={{ display: 'flex', gap: 1 }}>
                    <IconButton onClick={handleSave}><SaveIcon /></IconButton>
                    <IconButton onClick={() => setEditId(null)}><CancelIcon /></IconButton>
                  </Box>
                ] : [
                  tab.name,
                  tab.tab_name,
                  tab.path,
                  <Tooltip key="icon" title={tab.icon}>
                    {tab.icon && React.createElement(MuiIcons[tab.icon] || MuiIcons.Help)}
                  </Tooltip>,
                  <Box key="actions" sx={{ display: 'flex', gap: 1 }}>
                    <IconButton onClick={() => { setEditId(tab.id); setEditRow(tab) }}><EditIcon /></IconButton>
                    <IconButton onClick={() => handleDelete(tab)}><DeleteIcon /></IconButton>
                  </Box>
                ]

                return <SortableRow key={tab.id} id={tab.id}>{cells}</SortableRow>
              })}
            </TableBody>
          </SortableContext>
        </DndContext>
      </Table>
    </Box>
  )
}
