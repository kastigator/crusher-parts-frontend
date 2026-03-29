import React from "react"

export default function FormGrid({ children, columns = 2, minColumnWidth = 220 }) {
  return (
    <div
      className="form-grid"
      style={{
        "--form-grid-columns": columns,
        "--form-grid-min-column-width": `${minColumnWidth}px`,
      }}
    >
      {children}
    </div>
  )
}
