import React from "react"
import { Typography } from "antd"

const { Title, Text } = Typography

/**
 * Унифицированная оболочка страницы.
 *
 * Props:
 *  - title?: string        — основной заголовок страницы
 *  - extra?: ReactNode     — блок справа от заголовка (ссылки, кнопки)
 *  - helpText?: string     — подсказка под заголовком (горячие клавиши и т.п.)
 *  - children: ReactNode   — контент страницы
 */
export default function PageWrapper({ title, extra, helpText, children }) {
  return (
    <div
      style={{
        padding: "24px 24px 24px 24px",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "hidden",
        boxSizing: "border-box",
        scrollbarGutter: "stable both-edges",
      }}
    >
      {/* === Заголовок страницы === */}
      {(title || extra) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: helpText ? 4 : 16,
          }}
        >
          {title && (
            <Title
              level={3}
              style={{
                margin: 0,
                fontWeight: 600,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </Title>
          )}

          {extra && <div>{extra}</div>}
        </div>
      )}

      {/* === Подсказка под заголовком === */}
      {helpText && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {helpText}
          </Text>
        </div>
      )}

      {/* === Контент страницы === */}
      {children}
    </div>
  )
}
