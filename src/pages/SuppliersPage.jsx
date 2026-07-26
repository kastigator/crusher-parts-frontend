// src/pages/SuppliersPage.jsx
import React, { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import TabRendererPage from "@/components/common/TabRendererPage"
import SuppliersMain from "@/components/suppliers/SuppliersMain"

export default function SuppliersPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const focusParam = params.get("focus")
    const id = focusParam ? Number(focusParam) || null : null
    if (id) {
      navigate(`/suppliers/${id}`, { replace: true })
    }
  }, [params, navigate])

  return (
    <TabRendererPage
      tabKey="suppliers"
      helpText="Клик по строке — открыть рабочее место поставщика. Редактирование выполняется через кнопку карандаша."
    >
      <SuppliersMain />
    </TabRendererPage>
  )
}
