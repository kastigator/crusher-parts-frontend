// src/components/users/TabsTable.jsx

import React, { useEffect, useMemo, useState } from 'react'
import * as MuiIcons from '@mui/icons-material'
import { TextField, Autocomplete } from '@mui/material'
import axios from '@/api/axiosInstance'
import { useTabs } from '@/context/TabsContext'
import { generateTabName } from '@/utils/textUtils'
import SortableRow from '@/components/common/SortableRow'
import BaseTable from '@/components/common/BaseTable'
import { arrayMove } from '@dnd-kit/sortable'
import Swal from 'sweetalert2'

const iconOptions = Object.keys(MuiIcons)

const emptyTab = {
  name: '',
  tab_name: '',
  path: '',
  icon: '',
  order: 0,
  enabled: true
}

export default function TabsTable() {
  const { reloadTabs } = useTabs()
  const [tabs, setTabs] = useState([])
  const [newTab, setNewTab] = useState(emptyTab)
  const [manualEdit, setManualEdit] = useState({})

  const loadTabs = async () => {
    try {
      const res = await axios.get('/tabs')
      const sorted = res.data.sort((a, b) => a.order - b.order)
      setTabs(sorted)
    } catch (err) {
      console.error('Ошибка загрузки вкладок:', err)
    }
  }

  useEffect(() => {
    loadTabs()
  }, [])

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

  const handleSave = async (row) => {
    try {
      await axios.put(`/tabs/${row.id}`, row)
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

  const handleDragEnd = async ({ active, over }) => {
    if (!active || !over || active.id === over.id) return

    const oldIndex = tabs.findIndex(t => t.id === active.id)
    const newIndex = tabs.findIndex(t => t.id === over.id)
    const newTabs = arrayMove(tabs, oldIndex, newIndex).map((tab, index) => ({
      ...tab,
      order: index
    }))

    setTabs(newTabs)

    try {
      await axios.patch('/tabs/reorder', newTabs.map(t => ({ id: t.id, order: t.order })))
      reloadTabs()
    } catch (err) {
      console.error('Ошибка сортировки вкладок:', err)
    }
  }

  const columns = useMemo(() => [
    {
      field: 'drag',
      title: '',
      width: 36,
      display: () => (
        <MuiIcons.DragIndicator sx={{ color: '#ccc', cursor: 'grab' }} />
      ),
      disableSort: true,
      disableEdit: true
    },
    {
      field: 'name',
      title: 'Название',
      minWidth: 160
    },
    {
      field: 'tab_name',
      title: 'Ключ',
      minWidth: 140
    },
    {
      field: 'path',
      title: 'Путь',
      minWidth: 140
    },
    {
      field: 'icon',
      title: 'Иконка',
      minWidth: 200,
      editor: (value, onChange) => {
        const [inputValue, setInputValue] = useState(value || '')

        return (
          <Autocomplete
            options={iconOptions}
            value={iconOptions.includes(value) ? value : null}
            inputValue={inputValue}
            onInputChange={(e, newInput) => setInputValue(newInput)}
            onChange={(e, val) => {
              onChange('icon', val)
              setInputValue(val || '')
            }}
            getOptionLabel={(option) => option}
            isOptionEqualToValue={(option, val) => option === val}
            openOnFocus
            disableClearable
            fullWidth
            renderInput={(params) => (
              <TextField {...params} variant="standard" placeholder="Выберите иконку" />
            )}
            renderOption={(props, option) => {
              const IconComponent = MuiIcons[option]
              return (
                <li {...props}>
                  <IconComponent style={{ marginRight: 8 }} />
                  {option}
                </li>
              )
            }}
          />
        )
      },
      display: (value) => {
        const Icon = MuiIcons[value]
        return Icon ? (
          <>
            <Icon style={{ verticalAlign: 'middle', marginRight: 6 }} />
            {value}
          </>
        ) : value
      }
    },
    {
      field: 'enabled',
      title: 'Активна',
      minWidth: 100,
      type: 'boolean'
    }
  ], [])

  const handleFieldChange = (field, value) => {
    if (typeof field === 'object') {
      // Вызов от BaseTable: setNewRow({...}) при Escape
      setNewTab(field)
      return
    }

    const updated = { ...newTab, [field]: value }

    if (field === 'name' && !manualEdit.tab_name && !manualEdit.path) {
      const base = generateTabName(value)
      updated.tab_name = base
      updated.path = `/${base}`
    } else if (field === 'tab_name') {
      setManualEdit(prev => ({ ...prev, tab_name: true }))
    } else if (field === 'path') {
      setManualEdit(prev => ({ ...prev, path: true }))
    }

    setNewTab(updated)
  }

  return (
    <BaseTable
      data={tabs}
      columns={columns}
      newRow={newTab}
      setNewRow={handleFieldChange}
      onAdd={handleAdd}
      onSave={handleSave}
      onDelete={handleDelete}
      onCancelAdd={() => setNewTab(emptyTab)}
      SortableRow={SortableRow}
      onDragEnd={handleDragEnd}
    />
  )
}
