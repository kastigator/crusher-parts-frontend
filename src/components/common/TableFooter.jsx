import React from 'react'
import {
  TableFooter as MuiTableFooter,
  TableRow,
  TablePagination,
  Box,
  Typography
} from '@mui/material'

export default function TableFooter({
  page = 0,
  rowsPerPage = 25,
  total = 0,
  onPageChange,
  onRowsPerPageChange
}) {
  const from = total === 0 ? 0 : page * rowsPerPage + 1
  const to = Math.min((page + 1) * rowsPerPage, total)

  return (
    <MuiTableFooter>
      <TableRow>
        <TablePagination
          count={total}
          page={page}
          onPageChange={(_, newPage) => onPageChange(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Строк на странице:"
          labelDisplayedRows={() => `${from}–${to} из ${total}`}
        />
      </TableRow>
    </MuiTableFooter>
  )
}
