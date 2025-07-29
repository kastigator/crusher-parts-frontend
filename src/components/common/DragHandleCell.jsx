// src/components/common/DragHandleCell.jsx

import React from 'react'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function DragHandleCell(props) {
  const { row } = props
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: row.id
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <DragIndicatorIcon fontSize="small" color="disabled" />
    </div>
  )
}
