import React from "react"

const PageWrapper = ({ children }) => {
  return (
    <div
      style={{
        padding: "32px 24px",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,           // ✅ предотвращает вытеснение контента
        overflowX: "hidden",   // ✅ без горизонтального скролла
        boxSizing: "border-box",
        scrollbarGutter: "stable both-edges", // ✅ предотвращает скачки ширины при появлении скролла
      }}
    >
      {children}
    </div>
  )
}

export default PageWrapper
