// src/components/users/TabsTable.jsx

import React, { useEffect, useState } from 'react'
import axios from '@/api/axiosInstance'
import BaseTable from '@/components/common/BaseTable'
import { tabsTableColumns } from '@/components/common/tableDefinitions'

export default function TabsTable() {
  const [tabs, setTabs] = useState([])
  const [newTab, setNewTab] = useState({
    name: '', tab_name: '', path: '', icon: '', type: '', config: ''
  })

  const loadTabs = async () => {
    try {
      const res = await axios.get('/tabs')
      setTabs(res.data)
    } catch (err) {
      console.error('Ошибка загрузки вкладок:', err)
    }
  }

  useEffect(() => { loadTabs() }, [])

  const handleAdd = async () => {
    try {
      await axios.post('/tabs', newTab)
      setNewTab({ name: '', tab_name: '', path: '', icon: '', type: '', config: '' })
      loadTabs()
    } catch (err) {
      console.error('Ошибка при добавлении вкладки:', err)
    }
  }

  const handleSave = async (updatedTab) => {
    try {
      await axios.put(`/tabs/${updatedTab.id}`, updatedTab)
      loadTabs()
    } catch (err) {
      console.error('Ошибка при сохранении вкладки:', err)
    }
  }

  const handleDelete = async (tab) => {
    try {
      await axios.delete(`/tabs/${tab.id}`)
      loadTabs()
    } catch (err) {
      console.error('Ошибка при удалении вкладки:', err)
    }
  }

  return (
    <BaseTable
      data={tabs}
      columns={tabsTableColumns}
      newRow={newTab}
      setNewRow={setNewTab}
      onAdd={handleAdd}
      onSave={handleSave}
      onDelete={handleDelete}
    />
  )
}
