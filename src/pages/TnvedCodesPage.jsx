import React, { useState } from 'react'
import {
  Button, Stack, TextField, TablePagination, Box, Typography, Paper
} from '@mui/material'
import ImportModal from '../components/common/ImportModal'
import EditableTable from '../components/common/EditableTable'
import PageWrapper from '../components/common/PageWrapper'

export default function TnvedCodesPage() {
  const [filters, setFilters] = useState({
    search: '',
    duty_rate_min: '',
    duty_rate_max: ''
  })

  const [showImport, setShowImport] = useState(false)
  const [reloadFlag, setReloadFlag] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [total, setTotal] = useState(0)

  return (
    <PageWrapper>
      <Paper elevation={2} sx={{ px: 2, py: 2, mb: 2, borderRadius: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Фильтры
            </Typography>
            <TextField
              label="Поиск по коду или описанию"
              size="small"
              placeholder="например: насос"
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              sx={{ minWidth: 280 }}
            />
            <TextField
              label="Пошлина от (%)"
              size="small"
              type="number"
              value={filters.duty_rate_min}
              onChange={e => setFilters({ ...filters, duty_rate_min: e.target.value })}
              sx={{ width: 130 }}
            />
            <TextField
              label="до (%)"
              size="small"
              type="number"
              value={filters.duty_rate_max}
              onChange={e => setFilters({ ...filters, duty_rate_max: e.target.value })}
              sx={{ width: 100 }}
            />
          </Box>

          <Button variant="outlined" onClick={() => setShowImport(true)}>
            Импорт из Excel
          </Button>
        </Stack>
      </Paper>

      <EditableTable
        title="Коды ТН ВЭД"
        endpoint="tnved-codes"
        filters={filters}
        reloadFlag={reloadFlag}
        page={page}
        rowsPerPage={rowsPerPage}
        setTotal={setTotal}
        rowTemplate={{ code: '', description: '', duty_rate: '', notes: '' }}
        columns={[
          { field: 'code', label: 'Код', width: 100, required: true, tooltip: 'Код ТН ВЭД' },
          { field: 'description', label: 'Описание', width: 250, tooltip: 'Описание товара' },
          { field: 'duty_rate', label: 'Пошлина (%)', width: 120, type: 'number', tooltip: 'Ставка пошлины в %' },
          { field: 'notes', label: 'Примечания', width: 200, tooltip: 'Дополнительные условия' }
        ]}
      />

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={e => {
          setRowsPerPage(parseInt(e.target.value, 10))
          setPage(0)
        }}
        labelRowsPerPage="Строк на странице:"
        sx={{ mt: 2 }}
      />

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        type="tnved_codes"
        onImportComplete={() => setReloadFlag(prev => prev + 1)}
        columns={['Код', 'Описание', 'Ставка пошлины (%)', 'Примечания']}
        templateUrl={`${import.meta.env.VITE_API_URL}/static/tnved_codes_template.xlsx`}
      />
    </PageWrapper>
  )
}
