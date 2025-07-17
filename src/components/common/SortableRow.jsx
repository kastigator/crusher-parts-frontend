import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function SortableRow({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  // Ищем вложенный <tr> и модифицируем его
  if (React.isValidElement(children)) {
    return React.cloneElement(children, {
      innerRef: setNodeRef, // для TableRow
      style,
      ...attributes,
      ...listeners
    })
  }

  return <>{children}</>
}
