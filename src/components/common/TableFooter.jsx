// src/components/common/TableFooter.jsx

import React from "react"
import {
  TableFooter,
  TableRow,
  TableCell,
  TablePagination
} from "@mui/material"

export default function CustomTableFooter({
  page,
  rowsPerPage,
  total,
  onPageChange,
  onRowsPerPageChange
}) {
  return (
    <TableFooter>
      <TableRow>
        <TableCell colSpan={1000}>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            count={total}
            page={page}
            onPageChange={(_, newPage) => onPageChange?.(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) =>
              onRowsPerPageChange?.(parseInt(e.target.value, 10))
            }
          />
        </TableCell>
      </TableRow>
    </TableFooter>
  )
}
