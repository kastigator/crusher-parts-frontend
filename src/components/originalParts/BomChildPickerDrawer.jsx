import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Drawer, Table, Input, Button, Space, Checkbox, InputNumber, Tooltip, message } from "antd"
import axios from "@/api/axiosInstance"

export default function BomChildPickerDrawer({
  open,
  onClose,
  parentPartId,
  modelId,
  excludeIds = [],
  onPick,
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState("")
  const [onlyParts, setOnlyParts] = useState(true)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [qtyMap, setQtyMap] = useState({})
  const debounceRef = useRef(null)
  const abortRef = useRef(null)
  const fetchLock = useRef(false)

  const blockedIds = useMemo(
    () => new Set([parentPartId, ...(excludeIds || [])]),
    [parentPartId, excludeIds]
  )

  const fetchData = useCallback(
    async (query) => {
      if (!modelId || fetchLock.current) return
      fetchLock.current = true

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)

      try {
        const params = { equipment_model_id: modelId }
        if (query?.trim()) params.q = query.trim()
        if (onlyParts) params.only_parts = 1

        const { data } = await axios.get("/original-parts", { params, signal: controller.signal })
        const arr = (Array.isArray(data) ? data : []).filter((r) => !blockedIds.has(r.id))
        setRows(arr)

        setQtyMap((prev) => {
          const next = { ...prev }
          for (const r of arr) if (next[r.id] == null) next[r.id] = 1
          return next
        })
        setSelectedRowKeys((prev) => prev.filter((id) => !blockedIds.has(id)))
      } catch (e) {
        if (e?.name !== "AbortError") {
          console.error(e)
          message.error("Не удалось загрузить детали для выбора")
        }
      } finally {
        setLoading(false)
        fetchLock.current = false
      }
    },
    [modelId, onlyParts, blockedIds]
  )

  useEffect(() => {
    if (open) fetchData(q)
    else abortRef.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onChangeSearch = (e) => {
    const v = e.target.value
    setQ(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchData(v), 400)
  }

  const confirm = () => {
    if (!selectedRowKeys.length) return
    const items = selectedRowKeys.map((id) => ({
      id,
      qty: Number(qtyMap[id]) > 0 ? Number(qtyMap[id]) : 1,
    }))
    onPick?.(items)
    onClose()
  }

  const columns = useMemo(
    () => [
      { title: "Part number", dataIndex: "cat_number", width: 160 },
      {
        title: "Описание",
        render: (_, r) => {
          const text = r.description_ru || r.description_en || "—"
          return (
            <Tooltip title={text}>
              <span
                style={{
                  display: "inline-block",
                  maxWidth: 500,
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
        title: "Кол-во",
        width: 120,
        render: (_v, r) => (
          <InputNumber
            min={0.0001}
            step={0.0001}
            value={qtyMap[r.id] ?? 1}
            onChange={(val) => setQtyMap((p) => ({ ...p, [r.id]: val ?? 1 }))}
            style={{ width: "100%" }}
          />
        ),
      },
    ],
    [qtyMap]
  )

  return (
    <Drawer
      title="Добавить позиции в BOM"
      open={open}
      onClose={onClose}
      width={880}
      destroyOnClose
      maskClosable
      getContainer={() => document.body}
      extra={
        <Space>
          <Checkbox checked={onlyParts} onChange={(e) => setOnlyParts(e.target.checked)}>
            Только детали (не сборки)
          </Checkbox>
          <Button onClick={() => fetchData(q)}>Искать</Button>
          <Button type="primary" onClick={confirm} disabled={!selectedRowKeys.length}>
            Выбрать: {selectedRowKeys.length}
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Input
          placeholder="Поиск по part number или описанию…"
          value={q}
          onChange={onChangeSearch}
          allowClear
        />
        <div className="op-table parts-table">
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            columns={columns}
            size="small"
            pagination={{ pageSize: 10 }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              getCheckboxProps: (r) => ({ disabled: blockedIds.has(r.id) }),
            }}
            scroll={{ y: "calc(100vh - 320px)", x: "max-content" }}
          />
        </div>
      </Space>
    </Drawer>
  )
}
