// src/components/common/CollapseCell.jsx
import React from "react"
import { IconButton } from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"

export default function CollapseCell({ row, expandedId, setExpandedId }) {
  if (!row || !row.id) return null

  const isExpanded = expandedId === row.id

  const toggle = (e) => {
    e.stopPropagation()
    setExpandedId(prev => (prev === row.id ? null : row.id))
  }

  return (
    <IconButton size="small" onClick={toggle}>
      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
    </IconButton>
  )
}
