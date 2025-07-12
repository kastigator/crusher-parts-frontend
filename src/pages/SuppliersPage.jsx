import React, { useEffect, useState } from 'react'
import { CircularProgress } from '@mui/material'
import SuppliersTable from '../components/supplier/SuppliersTable'
import axios from '../api/axiosInstance'
import PageWrapper from '../components/common/PageWrapper'

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)

  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/suppliers')
      setSuppliers(res.data)
    } catch (err) {
      console.error('Ошибка загрузки поставщиков:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  return (
    <PageWrapper>
      {loading ? (
        <CircularProgress />
      ) : (
        <SuppliersTable suppliers={suppliers} reload={loadSuppliers} />
      )}
    </PageWrapper>
  )
}

export default SuppliersPage
