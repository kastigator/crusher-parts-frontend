// src/components/originalParts/SubstitutionsTable.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Table, message, Empty, Tooltip } from "antd"
import axios from "@/api/axiosInstance"
import ValueDisplay from "@/components/common/ValueDisplay"

export default function SubstitutionsTable({ part, originalPartId }) {
  // поддерживаем оба варианта: либо прокидывают объект part, либо просто id
  const partId = useMemo(() => {
    if (originalPartId) return originalPartId
    return part?.id
  }, [originalPartId, part?.id])

  const [rows, setRows] = useState(null) // null — ещё не грузили
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!partId) return
    setLoading(true)
    try {
      const { data } = await axios.get("/original-part-substitutions", {
        params: { part_id: partId },
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      if (e?.response?.status === 404) {
        setRows([])
      } else {
        console.error("Ошибка загрузки замен:", e)
        message.error("Не удалось загрузить замены")
        setRows([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setRows(null) // сброс при смене детали
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partId])

  // Пусто (и это уже не загрузка) — показываем Empty в том же стилевом контуре
  if (!loading && rows && rows.length === 0) {
    return (
      <div className="op-table parts-table" style={{ padding: 12 }}>
        <Empty description="Замен пока нет" />
      </div>
    )
  }

  const columns = [
    {
      title: "Группа",
      dataIndex: "group_code",
      width: 140,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Тип",
      dataIndex: "relation_type",
      width: 140,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Cat #",
      dataIndex: "cat_number",
      width: 180,
      render: (v, r) =>
        r?.cat_number_tooltip ? (
          <Tooltip title={r.cat_number_tooltip}>
            <span>{v}</span>
          </Tooltip>
        ) : (
          <ValueDisplay value={v} />
        ),
    },
    {
      title: "Описание",
      dataIndex: "description",
      // компактный вывод с тултипом
      render: (v) =>
        v ? (
          <Tooltip title={v}>
            <span
              style={{
                display: "inline-block",
                maxWidth: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {v}
            </span>
          </Tooltip>
        ) : (
          <ValueDisplay value={null} />
        ),
    },
  ]

  return (
    <div className="op-table parts-table">
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        pagination={false}
        dataSource={rows || []}
        columns={columns}
        // на узких экранах не будет «вылезать»
        scroll={{ x: true }}
      />
    </div>
  )
}
