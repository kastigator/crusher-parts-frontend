import React, { useEffect, useState } from 'react'
import axios from '../../api/axiosInstance'
import { Box, Typography } from '@mui/material'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale } from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale)

const ChartView = ({ endpoint }) => {
  const [data, setData] = useState(null)

  useEffect(() => {
    axios.get(`/api/${endpoint}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
  }, [endpoint])

  if (!data || !Array.isArray(data)) return <Typography sx={{ p: 2 }}>Нет данных</Typography>

  const labels = data.map(item => item.label || item.name)
  const values = data.map(item => item.value || 0)

  const chartData = {
    labels,
    datasets: [{
      label: 'Значения',
      data: values,
      backgroundColor: '#1976d2'
    }]
  }

  return (
    <Box p={3}>
      <Bar data={chartData} />
    </Box>
  )
}

export default ChartView
