import React, { useEffect, useState } from 'react'
import { CircularProgress } from '@mui/material'
import OriginalPartsTable from '../components/original/OriginalPartsTable'
import axios from '../api/axiosInstance'
import PageWrapper from '../components/common/PageWrapper'

const OriginalPartsPage = () => {
  const [originalParts, setOriginalParts] = useState([])
  const [loading, setLoading] = useState(false)

  const loadParts = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/original-parts')
      setOriginalParts(res.data)
    } catch (err) {
      console.error('Ошибка загрузки оригинальных деталей:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadParts()
  }, [])

  return (
    <PageWrapper>
      {loading ? (
        <CircularProgress />
      ) : (
        <OriginalPartsTable parts={originalParts} reload={loadParts} />
      )}
    </PageWrapper>
  )
}

export default OriginalPartsPage
