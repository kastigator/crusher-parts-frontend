import React, { useEffect, useState } from 'react'
import {
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
} from '@mui/material'
import axios from '../api/axiosInstance'
import PageWrapper from '../components/common/PageWrapper'

const ClientsPage = () => {
  const [clients, setClients] = useState([])

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await axios.get('/clients')
        setClients(res.data)
      } catch (err) {
        console.error('Ошибка загрузки клиентов:', err)
      }
    }

    fetchClients()
  }, [])

  return (
    <PageWrapper>
      <Typography variant="h5" gutterBottom>
        Клиенты
      </Typography>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>ИНН</TableCell>
              <TableCell>Телефон</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Адрес</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>{client.name}</TableCell>
                <TableCell>{client.inn}</TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.address}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </PageWrapper>
  )
}

export default ClientsPage
