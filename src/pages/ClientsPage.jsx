// src/pages/ClientsPage.jsx
import React, { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import TabRendererPage from "@/components/common/TabRendererPage"
import ClientsMain from "@/components/clients/ClientsMain"

export default function ClientsPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const focusParam = params.get("focus")
    const id = focusParam ? Number(focusParam) || null : null
    if (id) {
      navigate(`/clients/${id}`, { replace: true })
    }
  }, [params, navigate])

  return (
    <TabRendererPage
      tabKey="clients"
      helpText="Рабочее место клиента: профиль, контакты и адреса, оборудование, клиентская номенклатура, заявки и сделки."
    >
      <ClientsMain />
    </TabRendererPage>
  )
}
