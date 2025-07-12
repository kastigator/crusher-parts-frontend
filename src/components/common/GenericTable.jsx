import React, { useEffect, useState } from 'react'
import axios from '@/api/axiosInstance'
import {
  Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Typography, LinearProgress
} from '@mui/material'

const GenericTable = ({ endpoint }) => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`/${endpoint}`)
      .then((res) => setRows(res.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [endpoint])

  if (loading) return <LinearProgress />
  if (!rows.length) return <Typography sx={{ p: 2 }}>Нет данных</Typography>

  const columns = Object.keys(rows[0])

  return (
    <Paper sx={{ mt: 2 }}>
      <Table size="small" sx={{ tableLayout: 'auto', minWidth: 800 }}>
        <TableHead>
          <TableRow>
            {columns.map(col => (
              <TableCell key={col} sx={{ fontWeight: 600 }}>{col}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {columns.map(col => (
                <TableCell key={col}>{row[col] ?? '—'}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  )
}

export default GenericTable
