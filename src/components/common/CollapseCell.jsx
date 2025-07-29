import React from "react"
import { Button } from "antd"
import { DownOutlined, RightOutlined } from "@ant-design/icons"

export default function CollapseCell({ row, expandedId, setExpandedId }) {
  if (!row || !row.id) return null

  const isExpanded = expandedId === row.id

  const toggle = (e) => {
    e.stopPropagation()
    setExpandedId((prev) => (prev === row.id ? null : row.id))
  }

  return (
    <Button
      type="text"
      icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
      size="small"
      onClick={toggle}
    />
  )
}
