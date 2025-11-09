// src/components/originalParts/BomChildPickerDrawer.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Drawer, Table, Input, Button, Space, Checkbox, Tooltip, message, Empty, Tag } from "antd"
import { SearchOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"

export default function BomChildPickerDrawer({
  open,
  onClose,
  parentPartId,
  parentCatNumber,
  parentDescription,
  manufacturerName,
  modelName,
  modelId,
  excludeIds = [],
  onPick,
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState("")
  const [onlyAssemblies, setOnlyAssemblies] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [selectedRows, setSelectedRows] = useState([])

  const abortRef = useRef(null)
  const searchTimer = useRef(null)

  const canSearch = !!modelId && open
  // стабильный ключ для зависимостей (массив → строка)
  const excludeKey = useMemo(
    () => (excludeIds || []).map(Number).sort((a, b) => a - b).join(","),
    [excludeIds]
  )

  const fetchCandidates = useCallback(async () => {
    if (!canSearch) {
      setRows([])
      return
    }

    abortRef.current?.abort?.()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const params = { equipment_model_id: modelId }
      if (q?.trim()) params.q = q.trim()
      if (onlyAssemblies) params.only_assemblies = 1

      const { data } = await axios.get("/original-parts", {
        params,
        signal: controller.signal,
      })
      const list = Array.isArray(data) ? data : []

      // уже в составе + сам родитель — исключаем
      const excl = new Set((excludeIds || []).map(Number))
      const filtered = list.filter((r) => {
        const idNum = Number(r.id)
        if (!idNum) return false
        if (idNum === Number(parentPartId)) return false // ⛔️ не даём выбрать саму сборку
        if (excl.has(idNum)) return false               // уже в составе
        return true
      })

      setRows(filtered)

      // если какие-то выбранные записи исчезли — подчистим выбор
      if (selectedRowKeys.length) {
        const remain = selectedRowKeys.filter((id) =>
          filtered.some((r) => r.id === id)
        )
        if (remain.length !== selectedRowKeys.length) {
          setSelectedRowKeys(remain)
          const byId = new Map(filtered.map((r) => [r.id, r]))
          setSelectedRows(remain.map((id) => byId.get(id)).filter(Boolean))
        }
      }
    } catch (e) {
      const name = e?.name || e?.code
      if (name !== "CanceledError" && name !== "ERR_CANCELED") {
        console.error(e)
        message.error("Не удалось загрузить список деталей")
      }
    } finally {
      setLoading(false)
    }
    // не включаем selectedRowKeys/selectedRows/«сырые» excludeIds, чтобы не спамить запросами
  }, [canSearch, modelId, q, onlyAssemblies, excludeKey, parentPartId])

  // дебаунс поиска
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(fetchCandidates, 250)
    return () => clearTimeout(searchTimer.current)
  }, [fetchCandidates])

  // сброс при закрытии
  useEffect(() => {
    if (!open) {
      setQ("")
      setOnlyAssemblies(false)
      setSelectedRowKeys([])
      setSelectedRows([])
      setRows([])
      abortRef.current?.abort?.()
    }
  }, [open])

  const columns = useMemo(
    () => [
      { title: "Номер детали", dataIndex: "cat_number", width: 180 },
      {
        title: "Описание",
        dataIndex: "description_ru",
        ellipsis: true,
        onHeaderCell: () => ({
          style: { width: 380, minWidth: 380, maxWidth: 380 },
        }),
        onCell: () => ({
          style: { width: 380, minWidth: 380, maxWidth: 380 },
        }),
        render: (v, r) => (
          <Tooltip title={v || r.description_en} placement="topLeft">
            <span className="cell-ellipsis">
              {v || r.description_en || "—"}
            </span>
          </Tooltip>
        ),
      },
      { title: "Описание (EN)", dataIndex: "description_en", ellipsis: true },
      { title: "Вес, кг", dataIndex: "weight", align: "right", width: 120 },
      {
        title: "Тип",
        dataIndex: "is_assembly",
        width: 100,
        render: (v) => (v ? <Tag color="blue">Сборка</Tag> : <Tag>Деталь</Tag>),
      },
    ],
    []
  )

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys)
      setSelectedRows(rows)
    },
  }

  const header = (
    <Space direction="vertical" style={{ width: "100%" }} size={10}>
      <Space
        wrap
        style={{ width: "100%", justifyContent: "space-between" }}
      >
        <Space>
          <Input
            allowClear
            placeholder="Поиск по номеру/описанию…"
            prefix={<SearchOutlined />}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 320 }}
            disabled={!modelId}
          />
          <Checkbox
            checked={onlyAssemblies}
            onChange={(e) => setOnlyAssemblies(e.target.checked)}
            disabled={!modelId}
          >
            Только сборки
          </Checkbox>
        </Space>
        <Space>
          <Button onClick={onClose} icon={<CloseOutlined />}>
            Отмена
          </Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            disabled={!selectedRowKeys.length}
            onClick={() => onPick?.(selectedRows)}
          >
            Выбрать ({selectedRowKeys.length})
          </Button>
        </Space>
      </Space>

      <div style={{ color: "#666", fontSize: 12 }}>
        <strong>Модель:</strong>{" "}
        {manufacturerName || "—"}
        {modelName ? ` / ${modelName}` : ""}{" "}
        &nbsp;•&nbsp;
        <strong>Родитель:</strong>{" "}
        {parentCatNumber || "—"}
        {parentDescription ? ` — ${parentDescription}` : ""}{" "}
        &nbsp;•&nbsp;
        <strong>Уже в составе:</strong> {excludeIds?.length || 0}
      </div>
    </Space>
  )

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={920}
      title="Добавить позиции в BOM"
      destroyOnClose
      styles={{ body: { padding: 12 } }}
      footer={null}
    >
      {header}
      <div style={{ marginTop: 12 }}>
        {!rows.length && !loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              modelId
                ? "Ничего не найдено"
                : "Выберите модель, чтобы подобрать позиции"
            }
            style={{ marginTop: 48 }}
          />
        ) : (
          <Table
            className="op-table"
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={loading}
            pagination={{ pageSize: 20 }}
            size="middle"
            tableLayout="fixed"
            scroll={{ x: true, y: "calc(100vh - 360px)" }}
            rowSelection={rowSelection}
            onRow={(record) => ({
              onDoubleClick: () => {
                // быстрый сценарий: двойной клик — сразу добавить одну позицию
                if (!record?.id) return
                onPick?.([record])
              },
            })}
          />
        )}
      </div>
    </Drawer>
  )
}
