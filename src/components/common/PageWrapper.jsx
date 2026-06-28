import React from "react"
import AppPageHeader from "@/components/common/AppPageHeader"

/**
 * Унифицированная оболочка страницы.
 *
 * Props:
 *  - title?: string        — основной заголовок страницы
 *  - extra?: ReactNode     — блок справа от заголовка (ссылки, кнопки)
 *  - helpText?: string     — подсказка под заголовком (горячие клавиши и т.п.)
 *  - padding?: string      — внутренние отступы страницы
 *  - children: ReactNode   — контент страницы
 */
export default function PageWrapper({
  title,
  subtitle,
  status,
  extra,
  primaryActions,
  secondaryActions,
  helpText,
  helpSummary,
  padding = "24px",
  children,
}) {
  return (
    <div
      style={{
        padding,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "hidden",
        boxSizing: "border-box",
        scrollbarGutter: "stable both-edges",
      }}
    >
      {/* === Заголовок страницы === */}
      <AppPageHeader
        title={title}
        subtitle={subtitle}
        status={status}
        secondaryActions={secondaryActions || extra}
        primaryActions={primaryActions}
        helpSummary={helpSummary || helpText}
      />

      {/* === Контент страницы === */}
      {children}
    </div>
  )
}
