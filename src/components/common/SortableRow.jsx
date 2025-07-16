import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function SortableRow({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <tr ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </tr>
  )
}
