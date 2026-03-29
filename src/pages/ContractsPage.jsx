import React, { useEffect, useState } from "react"
import { Alert, Button, Card, Space, Table, Typography, message } from "antd"
import { useNavigate } from "react-router-dom"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"
import { resolveAppHref } from "@/utils/resolveAppHref"

const STATUS_LABELS = {
  draft: "Черновик",
  sent_to_client: "Отправлен клиенту",
  signed: "Подписан",
  in_execution: "В исполнении",
  completed: "Исполнен",
  closed_with_issues: "Закрыт с проблемами",
}

export default function ContractsPage() {
  const navigate = useNavigate()
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(false)
  const { Text } = Typography

  const handleGenerate = async (contract) => {
    try {
      const { data } = await axios.post(`/contracts/${contract.id}/generate`)
      await loadContracts()
      if (data?.url) window.open(data.url, "_blank", "noopener")
      message.success("DOCX контракта сформирован")
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сформировать DOCX")
    }
  }

  const loadContracts = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/contracts")
      setContracts(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить контракты")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContracts()
  }, [])

  return (
    <PageWrapper
      title="Контракты"
      subtitle="Обзор уже созданных контрактов и связанных документов."
      helpSummary="Основной сценарий создания новых контрактов вынесен в Client Request Workspace. Эта страница остаётся обзорной и документной."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Alert
          type="warning"
          showIcon
          message="Создание и изменение контрактов перенесено в Client Request Workspace"
          description="Эта страница нужна для обзора, проверки статусов и работы с документами по уже созданным контрактам."
        />
        <Card title="Где работать с контрактом" size="small">
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Text type="secondary">
              Создание, согласование статуса и работа с привязкой к заявке выполняются внутри workspace по заявкам клиента.
            </Text>
            <Space wrap>
              <Button type="primary" onClick={() => navigate("/client-request-workspace")}>
                Открыть Client Request Workspace
              </Button>
            </Space>
          </Space>
        </Card>

        <Card title="Список контрактов" size="small">
          <Table
            rowKey="id"
            dataSource={contracts}
            loading={loading}
            pagination={{ pageSize: 20 }}
            columns={[
              {
                title: "Контракт",
                width: 320,
                render: (_, row) => (
                  <Space direction="vertical" size={2}>
                    <span>{row.contract_number || "Без номера"}</span>
                    <span style={{ color: "#8c8c8c" }}>{row.client_name || "Клиент не указан"}</span>
                  </Space>
                ),
              },
              {
                title: "Статус",
                dataIndex: "status",
                width: 160,
                render: (value) => STATUS_LABELS[String(value || "").trim()] || value || "—",
              },
              {
                title: "Исполнение",
                width: 170,
                render: (_, row) => (
                  <Space direction="vertical" size={2}>
                    <span>{`${Number(row.po_confirmed || 0)}/${Number(row.po_total || 0)} заказов`}</span>
                    <span style={{ color: Number(row.open_quality_events || 0) > 0 ? "#d4380d" : "#8c8c8c" }}>
                      {Number(row.open_quality_events || 0) > 0
                        ? `Открытых отклонений: ${Number(row.open_quality_events || 0)}`
                        : "Открытых отклонений нет"}
                    </span>
                  </Space>
                ),
              },
              { title: "Дата", dataIndex: "contract_date", width: 120 },
              {
                title: "Сумма",
                dataIndex: "amount",
                width: 160,
                render: (v, r) => formatPriceWithCurrency(v, r?.currency),
              },
              {
                title: "Документы",
                width: 320,
                render: (_, row) => (
                  <Space wrap>
                    <Button size="small" onClick={() => window.open(resolveAppHref(`/contracts/${row.id}/preview`), "_blank", "noopener")}>
                      Открыть документ
                    </Button>
                    {row.file_url ? (
                      <Button size="small" onClick={() => window.open(row.file_url, "_blank", "noopener")}>
                        Скачать DOCX
                      </Button>
                    ) : null}
                    <Button size="small" onClick={() => handleGenerate(row)}>
                      Пересобрать DOCX
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </Space>
    </PageWrapper>
  )
}
