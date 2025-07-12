import React, { useEffect, useState } from 'react'
import SupplierPartsTable from '../components/supplier/SupplierPartsTable'
import { CircularProgress } from '@mui/material'
import axios from '../api/axiosInstance'
import PageWrapper from '../components/common/PageWrapper'

const SupplierPartsPage = () => {
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(false)

  const loadParts = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/supplier-parts')
      setParts(res.data)
    } catch (err) {
      console.error('Ошибка загрузки деталей поставщика:', err)
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
        <SupplierPartsTable parts={parts} reload={loadParts} />
      )}
    </PageWrapper>
  )
}

export default SupplierPartsPage
