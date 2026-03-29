import React from "react"
import { Button } from "antd"

export default function WorkspaceProgress({
  items = [],
  current = 0,
  completed = 0,
  onSelect,
}) {
  const safeItems = Array.isArray(items) ? items : []

  return (
    <div className="workspace-progress" role="tablist" aria-label="Этапы процесса">
      {safeItems.map((item, index) => {
        const label = typeof item === "string" ? item : item?.label
        const shortLabel =
          typeof item === "string" ? item : item?.shortLabel || item?.label
        const isActive = index === current
        const isDone = index < completed

        return (
          <Button
            key={`${label}-${index}`}
            size="small"
            type={isActive ? "primary" : "default"}
            className={`workspace-progress__item${isDone ? " is-done" : ""}${isActive ? " is-active" : ""}`}
            onClick={typeof onSelect === "function" ? () => onSelect(index) : undefined}
            title={label}
          >
            <span className="workspace-progress__index">{index + 1}</span>
            <span className="workspace-progress__label">{shortLabel}</span>
          </Button>
        )
      })}
    </div>
  )
}
