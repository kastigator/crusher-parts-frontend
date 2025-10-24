import React, { useEffect, useState, useCallback } from "react"
import { Table, Tabs, Button, message } from "antd"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import BomTable from "./BomTable"
import BomTree from "./BomTree"
import UsedInTable from "./UsedInTable"
import SubstitutionsTable from "./SubstitutionsTable"

export default function OriginalPartsTable({ modelId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!modelId) return
    setLoading(true)
    try {
      const { data } = await axios.get("/original-parts", { params: { model_id: modelId } })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      message.error("Не удалось загрузить детали модели")
    } finally {
      setLoading(false)
    }
  }, [modelId])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    const { confirmed } = await confirmAction("Удалить деталь?")
    if (!confirmed) return
    try {
      await axios.delete(`/original-parts/${id}`)
      message.success("Удалено")
      setRows(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error(err)
      message.error("Ошибка удаления детали")
    }
  }

  const columns = [
    { title: "Part number", dataIndex: "cat_number", width: 180 },
    { title: "Описание (RU)", dataIndex: "description_ru", ellipsis: true },
    { title: "Description (EN)", dataIndex: "description_en", ellipsis: true },
    { title: "Вес, кг", dataIndex: "weight", align: "right", width: 120 },
    { title: "ТН ВЭД", dataIndex: "tnved_code", width: 120 },
    { title: "Сборка", dataIndex: "is_assembly", width: 100, render: (v) => (v ? "Да" : "Нет") },
    {
      title: "Действия",
      width: 100,
      render: (_, r) => (
        <Button danger size="small" onClick={() => handleDelete(r.id)}>
          Удалить
        </Button>
      ),
    },
  ]

  const expandedRowRender = (record) => (
    <div className="expanded-area">
      <Tabs
        defaultActiveKey="bom"
        destroyInactiveTabPane
        items={[
          { key: "bom", label: "BOM (таблица)", children: <BomTable parent={record} modelId={modelId} onReload={load} /> },
          { key: "tree", label: "BOM (дерево)", children: <BomTree rootId={record.id} /> },
          { key: "used", label: "Где используется", children: <UsedInTable partId={record.id} /> },
          { key: "subs", label: "Замены (комплекты)", children: <SubstitutionsTable originalPartId={record.id} /> },
        ]}
      />
    </div>
  )

  return (
    <Table
      className="op-table"
      rowKey="id"
      columns={columns}
      dataSource={rows}
      loading={loading}
      expandable={{ expandedRowRender }}
      pagination={false}
      tableLayout="fixed"
      scroll={{ x: true }}
      size="middle"
    />
  )
}
