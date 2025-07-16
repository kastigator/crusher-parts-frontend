// src/components/users/TabsTable.jsx

import React, { useEffect, useState } from 'react'
import axios from '@/api/axiosInstance'
import { useTabs } from '@/context/TabsContext'
import BaseTable from '@/components/common/BaseTable'
import * as MuiIcons from '@mui/icons-material'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const emptyTab = {
  name: '', tab_name: '', path: '', icon: '', order: 0
}

function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  )
}

export default function TabsTable() {
  const [tabs, setTabs] = useState([])
  const [newTab, setNewTab] = useState(emptyTab)
  const { reloadTabs } = useTabs()

  const iconOptions = Object.keys(MuiIcons)

  const columns = [
    { field: 'name', title: 'Название', type: 'text', required: true },
    { field: 'tab_name', title: 'Кодовое имя', type: 'text', required: true },
    { field: 'path', title: 'Путь (URL)', type: 'text', required: true },
    {
      field: 'icon',
      title: 'Иконка',
      type: 'autocomplete',
      editorProps: {
        options: iconOptions,
        freeSolo: true
      }
    },
    { field: 'order', title: 'Порядок', type: 'number' }
  ]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    loadTabs()
  }, [])

  useEffect(() => {
    if (newTab.name && (!newTab.tab_name || !newTab.path)) {
      const slug = newTab.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\w_]/g, '')

      setNewTab(prev => ({
        ...prev,
        tab_name: prev.tab_name || slug,
        path: prev.path || `/${slug}`
      }))
    }
  }, [newTab.name])

  const loadTabs = async () => {
    try {
      const res = await axios.get('/tabs')
      const sorted = [...res.data].sort((a, b) => a.order - b.order)
      setTabs(sorted)
    } catch (err) {
      console.error('Ошибка загрузки вкладок:', err)
    }
  }

  const handleAdd = async () => {
    try {
      await axios.post('/tabs', newTab)
      setNewTab(emptyTab)
      await loadTabs()
      reloadTabs()
    } catch (err) {
      console.error('Ошибка при добавлении вкладки:', err)
    }
  }

  const handleSave = async (tab) => {
    try {
      await axios.put(`/tabs/${tab.id}`, tab)
      await loadTabs()
      reloadTabs()
    } catch (err) {
      console.error('Ошибка при сохранении вкладки:', err)
    }
  }

  const handleDelete = async (tab) => {
    try {
      await axios.delete(`/tabs/${tab.id}`)
      await loadTabs()
      reloadTabs()
    } catch (err) {
      console.error('Ошибка при удалении вкладки:', err)
    }
  }

  const handleOrderChange = async (updatedTabs) => {
    try {
      for (const tab of updatedTabs) {
        await axios.put(`/tabs/${tab.id}`, { order: tab.order })
      }
      await loadTabs()
      reloadTabs()
    } catch (err) {
      console.error('Ошибка при обновлении порядка вкладок:', err)
    }
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over.id) {
      const oldIndex = tabs.findIndex(item => item.id === active.id)
      const newIndex = tabs.findIndex(item => item.id === over.id)

      const newData = arrayMove(tabs, oldIndex, newIndex)
        .map((item, index) => ({ ...item, order: index + 1 }))

      setTabs(newData)
      handleOrderChange(newData)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={tabs.map(item => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {tabs.map((item) => {
          const Icon = MuiIcons[item.icon] || MuiIcons.HelpOutline
          return (
            <SortableItem key={item.id} id={item.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon fontSize="small" />
                <BaseTable
                  data={[item]}
                  columns={columns}
                  newRow={null}
                  setNewRow={() => {}}
                  onAdd={handleAdd}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  disableToolbar
                />
              </div>
            </SortableItem>
          )
        })}
      </SortableContext>

      <BaseTable
        data={[]}
        columns={columns}
        newRow={newTab}
        setNewRow={setNewTab}
        onAdd={handleAdd}
        disableToolbar
      />
    </DndContext>
  )
}
