// src/components/common/BaseMatrix.jsx

import React, { useEffect, useState } from 'react'
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, CircularProgress
} from '@mui/material'
import { Save, Delete } from '@mui/icons-material'
import axios from '@/api/axiosInstance'

export default function BaseMatrix({ definition, endpoint }) {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    try {
      const res = await axios.get(endpoint)
      setData(res.data)
    } catch (err) {
      console.error('Ошибка загрузки матрицы:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleToggle = async (item) => {
    const updatedItem = {
      ...item,
      [definition.valueField]: !item[definition.valueField]
    }
    try {
      await axios.put(`${endpoint}/${item.id}`, updatedItem)
      setData(prev =>
        prev.map(i => (i.id === item.id ? updatedItem : i))
      )
    } catch (err) {
      console.error('Ошибка при сохранении:', err)
    }
  }

  const rowKey = definition.rows.field.split('.').pop()
  const colKey = definition.columns.field.split('.').pop()

  const rows = Array.from(new Set(data.map(item => item[definition.rows.field.split('.')[0]])))
  const columns = Array.from(new Set(data.map(item => item[definition.columns.field.split('.')[0]])))

  if (isLoading) return <CircularProgress />

  return (
    <Table size="small" sx={{ minWidth: 800 }}>
      <TableHead>
        <TableRow>
          <TableCell>{definition.rows.label}</TableCell>
          {columns.map(col => (
            <TableCell key={col.id}>{col.name}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.id}>
            <TableCell>{row.name}</TableCell>
            {columns.map(col => {
              const cell = data.find(d =>
                d[definition.rows.field.split('.')[0]]?.id === row.id &&
                d[definition.columns.field.split('.')[0]]?.id === col.id
              )
              return (
                <TableCell key={col.id}>
                  {cell ? (
                    <Checkbox
                      checked={!!cell[definition.valueField]}
                      onChange={() => handleToggle(cell)}
                    />
                  ) : null}
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
