// src/components/common/PageWrapper.jsx

import React from "react"

const PageWrapper = ({ children }) => {
  return (
    <div
      style={{
        padding: "32px 24px",
        width: "100%",
        maxWidth: "100%",
        overflowX: "auto",
        boxSizing: "border-box"
      }}
    >
      {children}
    </div>
  )
}

export default PageWrapper
