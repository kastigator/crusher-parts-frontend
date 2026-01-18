import React from "react"
import { Card, Typography } from "antd"
import { Link } from "react-router-dom"
import PageWrapper from "@/components/common/PageWrapper"

const { Paragraph } = Typography

const catalogLinks = [
  { path: "/clients", label: "Клиенты" },
  { path: "/suppliers", label: "Поставщики" },
  { path: "/supplier-parts", label: "Детали поставщиков" },
  { path: "/original-parts", label: "Оригинальные детали" },
  { path: "/materials", label: "Материалы" },
  { path: "/tnved-codes", label: "Коды ТН ВЭД" },
]

export default function CatalogsPage() {
  return (
    <PageWrapper title="Каталоги" helpText="Каталоги и справочники.">
      <Card style={{ maxWidth: 720 }}>
        <Paragraph style={{ marginBottom: 16 }}>
          Выберите раздел каталога для работы с данными.
        </Paragraph>
        <div style={{ display: "grid", gap: 12 }}>
          {catalogLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: "block",
                padding: "10px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                color: "#111827",
                textDecoration: "none",
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </Card>
    </PageWrapper>
  )
}
