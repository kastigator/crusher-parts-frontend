import React from "react"
import { Card, Typography } from "antd"
import { Link } from "react-router-dom"
import PageWrapper from "@/components/common/PageWrapper"

const { Paragraph } = Typography

const adminLinks = [
  { path: "/users", label: "Пользователи и роли" },
]

export default function AdminPage() {
  return (
    <PageWrapper title="Админ" helpText="Администрирование системы.">
      <Card style={{ maxWidth: 720 }}>
        <Paragraph style={{ marginBottom: 16 }}>
          Управление пользователями, ролями и правами.
        </Paragraph>
        <div style={{ display: "grid", gap: 12 }}>
          {adminLinks.map((item) => (
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
