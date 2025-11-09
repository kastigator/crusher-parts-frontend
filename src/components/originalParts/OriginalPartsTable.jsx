import React, { useState } from "react"
import { Table, message } from "antd"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import ActionButtons from "@/components/common/ActionButtons"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"

/**
 * Таблица оригинальных деталей.
 * - Ничего не грузит сама: получает data и loading сверху.
 * - Управление выбором строки — через onSelect / selectedId.
 * - Удаление строки — DELETE /original-parts/:id, затем onRemove(id) и onReload?.
 * - История изменений — FullHistoryDialog (entity_type = "original_parts").
 */
export default function OriginalPartsTable({
  data = [],
  loading = false,
  modelId = null,      // сейчас не используется, но оставляем на будущее
  onReload,
  onRemove,
  onSelect,
  selectedId = null,
}) {
  const [historyId, setHistoryId] = useState(null)

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction(
      `Удалить деталь ${record.cat_number || ""}?`,
    )
    if (!confirmed) return
    try {
      await axios.delete(`/original-parts/${record.id}`)
      message.success("Деталь удалена")
      if (typeof onRemove === "function") onRemove(record.id)
      if (typeof onReload === "function") onReload()
    } catch (err) {
      console.error(err)
      message.error("Ошибка удаления детали")
    }
  }

  const columns = [
    { title: "Part number", dataIndex: "cat_number", width: 200 },
    {
      title: "Описание (RU)",
      dataIndex: "description_ru",
      ellipsis: true,
      // фиксируем ширину растяжной колонки, чтобы шапка/тело всегда совпадали
      onHeaderCell: () => ({ style: { width: 420, minWidth: 420, maxWidth: 420 } }),
      onCell:       () => ({ style: { width: 420, minWidth: 420, maxWidth: 420 } }),
    },
    { title: "Description (EN)", dataIndex: "description_en", ellipsis: true },
    { title: "Вес, кг", dataIndex: "weight", align: "right", width: 120 },
    { title: "ТН ВЭД", dataIndex: "tnved_code", width: 120 },
    {
      title: "Сборка",
      dataIndex: "is_assembly",
      width: 100,
      render: (v) => (v ? "Да" : "Нет"),
    },
    {
      title: "Действия",
      width: 110,
      render: (_, record) => (
        <ActionButtons
          size="small"
          // редактирования пока нет — оставляем только историю и удаление
          onHistory={() => setHistoryId(record.id)}
          onDelete={() => handleDelete(record)}
          titles={{
            history: "История изменений",
            delete: "Удалить деталь",
          }}
        />
      ),
    },
  ]

  return (
    <>
      <Table
        className="op-table"
        rowKey="id"
        columns={columns}
        dataSource={Array.isArray(data) ? data : []}
        loading={loading}
        pagination={{ pageSize: 50 }}
        tableLayout="fixed"
        scroll={{ x: true, y: 480 }}
        size="middle"
        // выбор строки — кликом
        onRow={(record) => ({
          onClick: () => {
            if (typeof onSelect === "function") onSelect(record)
          },
        })}
        // визуальная подсветка выбранной строки
        rowClassName={(record) =>
          record.id === selectedId ? "ant-table-row-selected" : ""
        }
      />

      {/* История изменений конкретной оригинальной детали */}
      {historyId != null && (
        <FullHistoryDialog
          entityType="original_parts"
          entityId={historyId}
          onClose={() => setHistoryId(null)}
        />
      )}
    </>
  )
}
