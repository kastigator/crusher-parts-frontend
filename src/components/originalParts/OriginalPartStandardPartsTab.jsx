import React, { useCallback, useEffect, useState } from "react"
import { Alert, Table, Tag, message } from "antd"
import axios from "@/api/axiosInstance"

const textOrDash = (value) => {
  const v = String(value || "").trim()
  return v || "—"
}

export default function OriginalPartStandardPartsTab({ partId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!partId) {
      setRows([])
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get("/oem-part-standard-parts", {
        params: { oem_part_id: partId },
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /oem-part-standard-parts error:", err)
      message.error("Не удалось загрузить стандартные детали")
    } finally {
      setLoading(false)
    }
  }, [partId])

  useEffect(() => {
    load()
  }, [load])

  const columns = [
    {
      title: "Класс",
      dataIndex: "class_name",
      render: textOrDash,
    },
    {
      title: "Название",
      dataIndex: "display_name",
      render: (value) => <span style={{ fontWeight: 600 }}>{textOrDash(value)}</span>,
    },
    {
      title: "Обозначение",
      dataIndex: "designation",
      render: textOrDash,
    },
    {
      title: "Описание",
      render: (_, row) => textOrDash(row.standard_description_ru || row.standard_description_en),
    },
    {
      title: "Основная",
      dataIndex: "is_primary",
      width: 120,
      render: (value) => (value ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>),
    },
    {
      title: "Комментарий",
      dataIndex: "note",
      render: textOrDash,
    },
    {
      title: "Статус",
      key: "status",
      width: 220,
      render: (_, record) =>
        record.is_primary ? <Tag color="green">Основное OEM-представление</Tag> : <Tag>Дополнительная связь</Tag>,
    },
  ]

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Связи со стандартными деталями теперь создаются из каталога стандартных деталей"
        description="В карточке стандартной детали используйте действие «Создать OEM-представление». Здесь связь показывается только для просмотра."
      />

      <Table
        size="small"
        rowKey={(row) => `${row.oem_part_id}-${row.standard_part_id}`}
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={false}
        locale={{ emptyText: "Стандартные детали ещё не привязаны" }}
      />
    </>
  )
}
