import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Button,
  Drawer,
  Empty,
  Input,
  Space,
  Table,
  Typography,
  message,
} from "antd"
import { SearchOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"

const { Text } = Typography

/**
 * Поиск альтернативных оригинальных деталей
 * (работает похоже на SupplierPartPickerDrawer, но по оригиналам).
 *
 * props:
 * - open
 * - onClose
 * - excludeIds: number[]  (детали, которые не должны появляться в выдаче)
 * - onPick(rows[])        (выбранные оригинальные детали)
 */
export default function AltOriginalsPickerDrawer({
  open,
  onClose,
  excludeIds = [],
  onPick,
}) {
  const [q, setQ] = useState("")
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState([])

  const abortRef = useRef(null)
  const debounceRef = useRef(null)

  const excludeKey = useMemo(
    () => (excludeIds || []).map(Number).sort((a, b) => a - b).join(","),
    [excludeIds],
  )

  const doSearch = async (query) => {
    const trimmed = (query || "").trim()
    abortRef.current?.abort?.()

    if (!trimmed) {
      setRows([])
      setSelectedRowKeys([])
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const params = {
        q: trimmed,
        limit: 50,
      }
      const { data } = await axios.get("/original-parts", {
        params,
        signal: controller.signal,
      })

      const list = Array.isArray(data) ? data : []

      const excl = new Set((excludeIds || []).map(Number).filter(Boolean))
      const filtered = excl.size
        ? list.filter((r) => !excl.has(Number(r.id)))
        : list

      setRows(filtered)
      setSelectedRowKeys((prev) =>
        prev.filter((id) => filtered.some((r) => r.id === id)),
      )
    } catch (e) {
      const name = e?.name || e?.code
      if (name !== "AbortError" && name !== "ERR_CANCELED") {
        console.error(e)
        message.error("Не удалось выполнить поиск оригинальных деталей")
      }
    } finally {
      setLoading(false)
    }
  }

  // дебаунс поиска
  useEffect(() => {
    if (!open) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      doSearch(q)
    }, 250)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open, excludeKey])

  useEffect(() => {
    if (!open) {
      setQ("")
      setRows([])
      setSelectedRowKeys([])
      abortRef.current?.abort?.()
    }
  }, [open])

  const columns = useMemo(
    () => [
      {
        title: "Part #",
        dataIndex: "cat_number",
        width: 160,
      },
      {
        title: "Описание (RU)",
        dataIndex: "description_ru",
        ellipsis: true,
        render: (v, r) => v || r.description_en || "—",
      },
      {
        title: "Производитель",
        dataIndex: "manufacturer_name",
        width: 220,
        ellipsis: true,
      },
      {
        title: "Модель",
        dataIndex: "model_name",
        width: 220,
        ellipsis: true,
      },
    ],
    [],
  )

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    preserveSelectedRowKeys: true,
  }

  const handleConfirm = () => {
    const picked = rows.filter((r) => selectedRowKeys.includes(r.id))
    if (picked.length) onPick?.(picked)
  }

  return (
    <Drawer
      title="Добавить альтернативные оригинальные детали"
      open={open}
      onClose={onClose}
      placement="right"
      width={900}
      destroyOnHidden
      keyboard
      maskClosable
      styles={{ body: { paddingTop: 8 } }}
      extra={
        <Space>
          <Button onClick={onClose}>Закрыть</Button>
          <Button
            type="primary"
            disabled={!selectedRowKeys.length}
            onClick={handleConfirm}
          >
            Добавить ({selectedRowKeys.length})
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Input
          placeholder="Найти деталь (по каталожному номеру или описанию)"
          prefix={<SearchOutlined />}
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onPressEnter={(e) => doSearch(e.currentTarget.value)}
        />

        <Table
          rowKey="id"
          className="op-table"
          dataSource={rows}
          columns={columns}
          loading={loading}
          size="small"
          pagination={false}
          rowSelection={rowSelection}
          locale={{
            emptyText: q.trim() ? (
              <Empty description="Ничего не найдено" />
            ) : (
              <Empty description="Начните с поиска" />
            ),
          }}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          В поиске скрываются текущая деталь и уже добавленные в группу
          альтернативные оригиналы.
        </Text>
      </Space>
    </Drawer>
  )
}
