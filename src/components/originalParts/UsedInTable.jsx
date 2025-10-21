import React, { useEffect, useMemo, useState } from "react"
import { Table, message, Tooltip, Empty } from "antd"
import axios from "@/api/axiosInstance"
import ValueDisplay from "@/components/common/ValueDisplay"

const fmtQty = (v) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(Number.isFinite(Number(v)) ? Number(v) : 0)

export default function UsedInTable({ partId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!partId) {
      setRows([])
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.get("/original-part-bom/used-in", {
        params: { child_id: partId },
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("Ошибка загрузки UsedIn:", e)
      message.error("Не удалось загрузить список родителей (где используется)")
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partId])

  const columns = useMemo(
    () => [
      {
        title: "Parent Cat #",
        dataIndex: "parent_cat_number",
        width: 180,
        render: (v) => <ValueDisplay value={v} />,
      },
      {
        title: "Родитель",
        dataIndex: "parent_description_ru",
        render: (_, r) => {
          const text = r.parent_description_ru || r.parent_description_en || null
          if (!text) return <ValueDisplay value={null} />
          return (
            <Tooltip title={text}>
              <span
                style={{
                  display: "inline-block",
                  maxWidth: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {text}
              </span>
            </Tooltip>
          )
        },
      },
      {
        title: "Кол-во в родителе",
        dataIndex: "quantity",
        width: 160,
        align: "right",
        render: (v) => fmtQty(v),
      },
    ],
    []
  )

  return (
    <div
      className="subtable-shell"
      style={{
        width: "100%",
        minHeight: 160,      // ✅ фиксированная высота для стабильного layout
        maxHeight: "70vh",   // ✅ ограничение роста таблицы
        overflowY: "auto",   // ✅ предотвращает выталкивание при длинных списках
      }}
    >
      {!loading && rows.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Не используется ни в одной сборке"
          style={{ margin: "24px 0" }}
        />
      ) : (
        <Table
          className="op-table"
          rowKey={(r) => `${r.parent_id}:${r.child_id}`}
          size="small"
          loading={loading}
          pagination={false}
          dataSource={rows}
          columns={columns}
          scroll={{ x: "max-content" }} // ✅ устраняет горизонтальные скачки
        />
      )}
    </div>
  )
}
