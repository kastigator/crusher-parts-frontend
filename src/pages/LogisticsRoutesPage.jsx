// src/pages/LogisticsRoutesPage.jsx
import PageWrapper from "@/components/common/PageWrapper"
import LogisticsRoutesMain from "@/components/logisticsRoutes/LogisticsRoutesMain"

export default function LogisticsRoutesPage() {
  return (
    <PageWrapper
      title="Маршруты логистики (legacy)"
      helpText="Старый каталог маршрутов. Новый блок Экономики будет использовать коридоры + шаблоны маршрутов + сценарии групп."
    >
      <LogisticsRoutesMain />
    </PageWrapper>
  )
}
