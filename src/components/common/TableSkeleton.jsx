import React from 'react'
import { TableRow, TableCell, Skeleton } from '@mui/material'

export default function TableSkeleton({ columns = 5, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <TableRow key={rowIdx}>
          {Array.from({ length: columns }).map((_, colIdx) => (
            <TableCell key={colIdx}>
              <Skeleton variant="text" width={`${60 + Math.random() * 30}%`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
