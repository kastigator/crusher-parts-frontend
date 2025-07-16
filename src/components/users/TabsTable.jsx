import React, { useEffect, useState } from 'react'
import axios from '@/api/axiosInstance'
import BaseTable from '@/components/common/BaseTable'
import { useTabs } from '@/context/TabsContext'
import { tabsTableColumns } from '@/components/common/tableDefinitions'
import { DndContext, useSensor, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { slugify } from 'transliteration'
import SortableRow from '@/components/common/SortableRow'

const emptyTab = {
  name: '',
  tab_name: '',
  path: '',
  icon: '',
  order: 0,
  _auto: true
}

export default function TabsTable() {
  const [tabs, setTabs] = useState([])
  const [newTab, setNewTab] = useState(emptyTab)
  const { reloadTabs } = useTabs()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    loadTabs()
  }, [])

  const loadTabs = async () => {
    try {
      const res = await axios.get('/tabs')
      const sorted = [...res.data].sort((a, b) => a.order - b.order)
      setTabs(sorted)
    } catch (err) {
      console.error('Ошибка загрузки вкладок:', err)
    }
  }

  const handleNewTabChange = (field, value) => {
    setNewTab(prev => {
      const updated = { ...prev, [field]: value }

      if (field === 'name') {
        const slug = slugify(value, { lowercase: true, separator: '_' })
        return {
          ...updated,
          tab_name: prev._auto ? slug : prev.tab_name,
          path: prev._auto ? `/${slug}` : prev.path,
          _auto: true
        }
      }

      if (['tab_name', 'path'].includes(field)) {
        updated._auto = false
      }

      return updated
    })
  }

  const handleAdd = async () => {
    try {
      const payload = { ...newTab }
      delete payload._auto
      await axios.post('/tabs', payload)
      setNewTab(emptyTab)
      await loadTabs()
      reloadTabs()
    } catch (err) {
      console.error('Ошибка при добавлении вкладки:', err)
    }
  }

  const handleSave = async (tab) => {
    try {
      const payload = { ...tab }
      delete payload._auto
      await axios.put(`/tabs/${tab.id}`, payload)
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
    if (!over || active.id === over.id) return

    const oldIndex = tabs.findIndex(item => item.id === active.id)
    const newIndex = tabs.findIndex(item => item.id === over.id)

    const newData = arrayMove(tabs, oldIndex, newIndex)
      .map((item, index) => ({ ...item, order: index + 1 }))

    setTabs(newData)
    handleOrderChange(newData)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={tabs.map(tab => tab.id).filter(Boolean)}
        strategy={verticalListSortingStrategy}
      >
        <BaseTable
          data={tabs}
          columns={tabsTableColumns}
          newRow={newTab}
          setNewRow={handleNewTabChange}
          onAdd={handleAdd}
          onSave={handleSave}
          onDelete={handleDelete}
          RowWrapper={SortableRow}
        />
      </SortableContext>
    </DndContext>
  )
}
