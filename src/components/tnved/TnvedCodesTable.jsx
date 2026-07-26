// src/components/tnved/TnvedCodesTable.jsx

import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Button,
  Descriptions,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Space,
  Spin,
  Statistic,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd"
import ActionButtons from "@/components/common/ActionButtons"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"
import FullHistoryDialog from "@/components/common/FullHistoryDialog"
import VersionConflictModal from "@/components/common/VersionConflictModal"
import createTablePagination from "@/utils/tablePagination"
import ValueDisplay from "@/components/common/ValueDisplay"
import { mergeConflictDraft } from "@/utils/versionConflict"
import useTableScrollHints from "@/utils/useTableScrollHints"
import DraggableColumnsTable from "@/components/common/DraggableColumnsTable"
import { getOrderedKeys } from "@/utils/columnOrder"

const { TextArea } = Input
const { Text } = Typography

export default function TnvedCodesTable({
  data,
  loading,
  visibleColumnKeys,
  columnOrderKeys,
  onColumnOrderKeysChange,
  onColumnsMeta,
  onUpdate,
  onDelete,
  onReplaceRow,
  onRefresh,
}) {
  const wrapRef = useRef(null)
  const [editingKey, setEditingKey] = useState("")
  const [editedRow, setEditedRow] = useState(null)
  const [logId, setLogId] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsRecord, setDetailsRecord] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [usageInfo, setUsageInfo] = useState(null)

  const [conflict, setConflict] = useState({
    open: false,
    current: null,
    draft: null,
  })

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const scrollHints = useTableScrollHints(wrapRef, [data, loading, page, pageSize])

  const isEditing = (record) => record.id === editingKey

  const startEdit = (record) => {
    if (editingKey && editingKey !== record.id) {
      message.warning("Сначала сохраните или отмените текущие изменения")
      return
    }
    setEditingKey(record.id)
    setEditedRow({ ...record })
  }

  const cancelEdit = () => {
    setEditingKey("")
    setEditedRow(null)
  }

  const saveEdit = async () => {
    try {
      await onUpdate(editingKey, { ...editedRow })
      cancelEdit()
    } catch (err) {
      if (err?.isDuplicateKey) {
        return message.error("Код уже существует")
      }
      if (err?.isVersionConflict) {
        setConflict({
          open: true,
          current: err.currentRecord || null,
          draft: editedRow,
        })
        return
      }
      console.error("Ошибка сохранения:", err)
      message.error("Не удалось сохранить строку")
    }
  }

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction(`Удалить код ${record.code}?`)
    if (!confirmed) return
    try {
      await onDelete(record)
    } catch (err) {
      if (err?.isVersionConflict) {
        if (err.currentRecord && typeof onReplaceRow === "function") {
          onReplaceRow(err.currentRecord)
        } else if (typeof onRefresh === "function") {
          onRefresh()
        }
        return message.warning(
          "Строка изменилась и не была удалена. Обновите данные.",
        )
      }
      console.error("Ошибка удаления:", err)
      message.error("Не удалось удалить строку")
    }
  }

  const columnsMeta = useMemo(
    () => ({
      options: [
        { key: "description", label: "Описание" },
        { key: "duty_rate", label: "Пошлина (%)" },
        { key: "usage_count", label: "Применяется" },
        { key: "notes", label: "Примечание" },
      ],
      defaultVisible: ["description", "duty_rate", "usage_count"],
      lockedKeys: ["code", "actions"],
    }),
    [],
  )

  useEffect(() => {
    if (typeof onColumnsMeta === "function") onColumnsMeta(columnsMeta)
  }, [onColumnsMeta, columnsMeta])

  const visibleKeys = useMemo(() => {
    const base =
      Array.isArray(visibleColumnKeys) && visibleColumnKeys.length
        ? visibleColumnKeys
        : columnsMeta.defaultVisible
    return new Set(base || [])
  }, [visibleColumnKeys, columnsMeta.defaultVisible])

  const defaultOrder = useMemo(
    () => ["code", "description", "duty_rate", "usage_count", "notes", "actions"],
    [],
  )
  const effectiveOrderKeys = useMemo(
    () => getOrderedKeys(columnOrderKeys, defaultOrder),
    [columnOrderKeys, defaultOrder],
  )

  const columns = [
    {
      title: "Код",
      dataIndex: "code",
      key: "code",
      width: 140,
      minWidth: 100,
      maxWidth: 220,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (_, record) =>
        isEditing(record) ? (
          <Input
            value={editedRow.code}
            onChange={(e) =>
              setEditedRow({ ...editedRow, code: e.target.value })
            }
            onPressEnter={saveEdit}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancelEdit()
            }}
          />
        ) : (
          <ValueDisplay value={record.code} />
        ),
    },
    {
      title: "Описание",
      dataIndex: "description",
      key: "description",
      width: 360,
      minWidth: 180,
      maxWidth: 520,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (_, record) =>
        isEditing(record) ? (
          <TextArea
            value={editedRow.description || ""}
            onChange={(e) =>
              setEditedRow({
                ...editedRow,
                description: e.target.value,
              })
            }
            autoSize={{ minRows: 2, maxRows: 6 }}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancelEdit()
            }}
          />
        ) : (
          <ValueDisplay value={record.description} />
        ),
    },
    {
      title: "Пошлина (%)",
      dataIndex: "duty_rate",
      key: "duty_rate",
      width: 140,
      render: (_, record) =>
        isEditing(record) ? (
          <InputNumber
            value={editedRow.duty_rate}
            step={0.01}
            style={{ width: "100%" }}
            onChange={(v) =>
              setEditedRow({ ...editedRow, duty_rate: v })
            }
            onPressEnter={saveEdit}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancelEdit()
            }}
          />
        ) : (
          <ValueDisplay value={record.duty_rate} />
        ),
    },
    {
      title: "Примечание",
      dataIndex: "notes",
      key: "notes",
      width: 260,
      minWidth: 140,
      maxWidth: 420,
      ellipsis: { showTitle: false },
      onCell: () => ({ style: { overflow: "hidden" } }),
      render: (_, record) =>
        isEditing(record) ? (
          <TextArea
            value={editedRow.notes || ""}
            onChange={(e) =>
              setEditedRow({ ...editedRow, notes: e.target.value })
            }
            autoSize={{ minRows: 2, maxRows: 4 }}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancelEdit()
            }}
          />
        ) : (
          <ValueDisplay value={record.notes} />
        ),
    },
    {
      title: "Применяется",
      dataIndex: "usage_count",
      key: "usage_count",
      width: 140,
      render: (_, record) => {
        const count = Number(record.usage_count || 0)
        return count ? <Tag color="blue">{count}</Tag> : <Text type="secondary">—</Text>
      },
    },
    {
      title: "Действия",
      dataIndex: "actions",
      key: "actions",
      width: 160,
      render: (_, record) => {
        const editing = isEditing(record)
        return (
          <ActionButtons
            onEdit={!editing ? () => startEdit(record) : undefined}
            onSave={editing ? saveEdit : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onDelete={!editing ? () => handleDelete(record) : undefined}
            onHistory={!editing ? () => setLogId(record.id) : undefined}
            disabledEdit={!!editingKey && !editing}
            disabledDelete={!!editingKey && !editing}
            size="small"
          />
        )
      },
    },
  ]

  const filteredColumns = columns.filter((c) => {
    if (c.key === "code" || c.key === "actions") return true
    return visibleKeys.has(String(c.key))
  })

  const orderedColumns = useMemo(() => {
    const idx = new Map(effectiveOrderKeys.map((k, i) => [k, i]))
    return [...filteredColumns].sort((a, b) => {
      const ai = idx.has(a.key) ? idx.get(a.key) : Number.MAX_SAFE_INTEGER
      const bi = idx.has(b.key) ? idx.get(b.key) : Number.MAX_SAFE_INTEGER
      return ai - bi
    })
  }, [filteredColumns, effectiveOrderKeys])

  const nonDraggableKeys = useMemo(
    () =>
      Array.isArray(columnsMeta.lockedKeys)
        ? columnsMeta.lockedKeys.filter((key) => key !== "actions")
        : [],
    [columnsMeta.lockedKeys]
  )

  const pagination = useMemo(
    () =>
      createTablePagination({
        page,
        pageSize,
        total: Array.isArray(data) ? data.length : 0,
        setPage,
        setPageSize,
      }),
    [page, pageSize, data],
  )

  useEffect(() => {
    if (!detailsOpen || !detailsRecord?.id) {
      setUsageInfo(null)
      return
    }

    let cancelled = false
    const run = async () => {
      setDetailsLoading(true)
      try {
        const { data: payload } = await axios.get(`/tnved-codes/${detailsRecord.id}/usage`)
        if (!cancelled) setUsageInfo(payload || null)
      } catch (err) {
        if (!cancelled) {
          console.error("Ошибка загрузки применений ТН ВЭД:", err)
          message.error("Не удалось загрузить применения кода")
        }
      } finally {
        if (!cancelled) setDetailsLoading(false)
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [detailsOpen, detailsRecord?.id])

  const reloadUsage = async () => {
    if (!detailsRecord?.id) return
    setDetailsLoading(true)
    try {
      const { data: payload } = await axios.get(`/tnved-codes/${detailsRecord.id}/usage`)
      setUsageInfo(payload || null)
    } catch (err) {
      console.error("Ошибка обновления применений ТН ВЭД:", err)
      message.error("Не удалось обновить применения кода")
    } finally {
      setDetailsLoading(false)
    }
  }

  const applyCodeToCandidate = async (candidate) => {
    if (!detailsRecord?.id || !candidate?.catalog_position_id) return
    const title =
      candidate.manufacturer_part_number ||
      candidate.display_name ||
      candidate.bom_manufacturer_part_number ||
      `позиция #${candidate.catalog_position_id}`
    const { confirmed } = await confirmAction(`Привязать код ${detailsRecord.code} к позиции ${title}?`)
    if (!confirmed) return

    try {
      await axios.patch(`/catalog-positions/${candidate.catalog_position_id}/card`, {
        tnved_code_id: detailsRecord.id,
      })
      message.success("Код привязан к позиции")
      await reloadUsage()
      if (typeof onRefresh === "function") onRefresh()
    } catch (err) {
      console.error("Ошибка привязки ТН ВЭД:", err)
      message.error(err?.response?.data?.message || "Не удалось привязать код")
    }
  }

  const formatPositionTitle = (row) =>
    row?.display_name ||
    row?.display_name_en ||
    row?.display_name_ru ||
    row?.bom_manufacturer_part_name ||
    row?.bom_title ||
    "—"

  const groupPositionRows = (rows = []) => {
    const groups = new Map()
    for (const row of rows || []) {
      const key = String(row.catalog_position_id || row.bom_item_id || Math.random())
      const existing = groups.get(key)
      if (existing) {
        existing.applications.push(row)
      } else {
        groups.set(key, { ...row, applications: [row] })
      }
    }
    return Array.from(groups.values())
  }

  const usageGroups = useMemo(
    () => groupPositionRows(usageInfo?.usage || []),
    [usageInfo?.usage],
  )
  const candidateGroups = useMemo(
    () => groupPositionRows(usageInfo?.candidates || []),
    [usageInfo?.candidates],
  )

  const renderMaterials = (value) => {
    if (!value) return <Text type="secondary">—</Text>
    return (
      <Tooltip title={value}>
        <Text
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.35,
          }}
        >
          {value}
        </Text>
      </Tooltip>
    )
  }

  const renderDimensions = (row) => {
    const dims = [row.length_mm, row.width_mm, row.height_mm]
      .filter((v) => v !== null && v !== undefined && v !== "")
      .map((v) => Number(v).toLocaleString("ru-RU"))
    return dims.length ? dims.join(" x ") : "—"
  }

  const renderPositionCards = (groups, { candidate = false } = {}) => {
    if (detailsLoading && !groups.length) {
      return (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <Spin />
        </div>
      )
    }
    if (!groups.length) {
      return (
        <Empty
          description={
            candidate
              ? "Похожих непривязанных позиций пока нет"
              : "Код пока не применялся в карточках позиций"
          }
        />
      )
    }

    return (
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {groups.map((group) => {
          const partNumber =
            group.manufacturer_part_number ||
            group.bom_manufacturer_part_number ||
            group.position_code ||
            `#${group.catalog_position_id}`
          const applications = group.applications || []
          return (
            <div
              key={`${candidate ? "candidate" : "usage"}-${group.catalog_position_id || group.bom_item_id}`}
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                padding: 14,
                background: "#fff",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(220px, 1.2fr) minmax(220px, 1fr) minmax(180px, 0.7fr)",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <Space direction="vertical" size={4}>
                  <Space wrap size={6}>
                    <Text strong style={{ fontSize: 16 }}>{partNumber}</Text>
                    {applications.length > 1 ? <Tag>{applications.length} места BOM</Tag> : null}
                    {candidate ? <Tag color="gold">без кода</Tag> : null}
                  </Space>
                  <Text>{formatPositionTitle(group)}</Text>
                  <Text type="secondary">{group.catalog_position_description || "—"}</Text>
                </Space>

                <Space direction="vertical" size={6}>
                  <Text type="secondary">Материал</Text>
                  {renderMaterials(group.materials_summary)}
                </Space>

                <Space direction="vertical" size={6}>
                  <Text type="secondary">Характеристики</Text>
                  <Text>Масса: {group.weight_kg ? `${Number(group.weight_kg).toLocaleString("ru-RU")} кг` : "—"}</Text>
                  <Text>Габариты: {renderDimensions(group)} мм</Text>
                  {candidate ? (
                    <Button size="small" onClick={() => applyCodeToCandidate(group)}>
                      Привязать код
                    </Button>
                  ) : null}
                </Space>
              </div>

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f5f5f5" }}>
                <Text type="secondary">Где применяется</Text>
                <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                  {applications.map((app) => (
                    <div
                      key={`${app.catalog_position_id}-${app.bom_item_id || app.equipment_model_id || "card"}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(160px, 0.8fr) minmax(220px, 1fr) minmax(80px, 0.3fr)",
                        gap: 12,
                        alignItems: "center",
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: "#fafafa",
                      }}
                    >
                      <Space direction="vertical" size={0}>
                        <Text>{app.model_name || "Без модели"}</Text>
                        <Text type="secondary">{app.manufacturer_name || "—"}</Text>
                      </Space>
                      <Text type="secondary">
                        {app.parent_title || app.parent_manufacturer_part_number
                          ? `Внутри: ${app.parent_manufacturer_part_number || app.parent_title}`
                          : "В корне BOM модели"}
                      </Text>
                      <Text type="secondary">Кол-во: {app.bom_quantity || "—"}</Text>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </Space>
    )
  }

  return (
    <>
      <div
        ref={wrapRef}
        className={`op-table-wrap${scrollHints.left ? " scroll-left" : ""}${
          scrollHints.right ? " scroll-right" : ""
        }`}
      >
        <DraggableColumnsTable
          className="op-table"
          columnSizingKey="tnved_codes_column_widths_v1"
          dataSource={data}
          columns={orderedColumns}
          nonDraggableKeys={nonDraggableKeys}
          onColumnOrderChange={({ activeKey, overKey }) => {
            if (typeof onColumnOrderKeysChange !== "function") return
            const nextFull = [...effectiveOrderKeys]
            const from = nextFull.indexOf(activeKey)
            const to = nextFull.indexOf(overKey)
            if (from < 0 || to < 0 || from === to) return
            const [item] = nextFull.splice(from, 1)
            nextFull.splice(to, 0, item)
            onColumnOrderKeysChange(nextFull)
          }}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          bordered
          size="small"
          tableLayout="fixed"
          scroll={{ x: true }}
          onRow={(record) => ({
            onClick: (e) => {
              if (isEditing(record)) return
              const target = e.target
              if (
                target.closest("button") ||
                target.closest("a") ||
                target.closest("input") ||
                target.closest("textarea") ||
                target.closest(".ant-input-number") ||
                target.closest(".ant-table-row-expand-icon")
              ) {
                return
              }
              setDetailsRecord(record)
              setDetailsOpen(true)
            },
            style: { cursor: isEditing(record) ? "default" : "pointer" },
          })}
        />
      </div>

      <Drawer
        open={detailsOpen}
        width={920}
        onClose={() => {
          setDetailsOpen(false)
          setDetailsRecord(null)
          setUsageInfo(null)
        }}
        title={detailsRecord ? `Код ТН ВЭД: ${detailsRecord.code || "—"}` : "Код ТН ВЭД"}
      >
        {detailsRecord ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space wrap size={16}>
              <Statistic
                title="Карточек позиций"
                value={usageInfo?.stats?.usage_count ?? detailsRecord.usage_count ?? 0}
                loading={detailsLoading}
              />
              <Statistic
                title="Строк BOM"
                value={usageInfo?.stats?.bom_usage_count ?? 0}
                loading={detailsLoading}
              />
              <Statistic
                title="Моделей"
                value={usageInfo?.stats?.model_count ?? detailsRecord.model_count ?? 0}
                loading={detailsLoading}
              />
              <Statistic
                title="Кандидатов без кода"
                value={usageInfo?.stats?.candidate_count ?? 0}
                loading={detailsLoading}
              />
            </Space>

            <Tabs
              items={[
                {
                  key: "overview",
                  label: "Обзор",
                  children: (
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label="Код">
                        {detailsRecord.code || "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Пошлина (%)">
                        {detailsRecord.duty_rate ?? "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Описание">
                        <Text style={{ whiteSpace: "pre-wrap" }}>
                          {detailsRecord.description || "—"}
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Примечание">
                        <Text style={{ whiteSpace: "pre-wrap" }}>
                          {detailsRecord.notes || "—"}
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Токены подбора">
                        {usageInfo?.candidate_tokens?.length ? (
                          <Space wrap>
                            {usageInfo.candidate_tokens.map((token) => (
                              <Tag key={token}>{token}</Tag>
                            ))}
                          </Space>
                        ) : (
                          "—"
                        )}
                      </Descriptions.Item>
                    </Descriptions>
                  ),
                },
                {
                  key: "usage",
                  label: `Применения (${usageInfo?.stats?.usage_count ?? detailsRecord.usage_count ?? 0})`,
                  children: renderPositionCards(usageGroups),
                },
                {
                  key: "candidates",
                  label: `Кандидаты (${usageInfo?.stats?.candidate_count ?? 0})`,
                  children: renderPositionCards(candidateGroups, { candidate: true }),
                },
              ]}
            />
          </Space>
        ) : null}
      </Drawer>

      {logId && (
        <FullHistoryDialog
          entityId={logId}
          entityType="tnved_codes"
          onClose={() => setLogId(null)}
        />
      )}

      <VersionConflictModal
        open={conflict.open}
        draft={conflict.draft}
        current={conflict.current}
        fields={[
          { key: "code", title: "Код" },
          { key: "description", title: "Описание" },
          {
            key: "duty_rate",
            title: "Пошлина (%)",
            format: (v) => ((v ?? "") === "" ? "-" : String(v)),
          },
          { key: "notes", title: "Примечание" },
        ]}
        onReload={() => {
          if (conflict.current && typeof onReplaceRow === "function")
            onReplaceRow(conflict.current)
          else if (typeof onRefresh === "function") onRefresh()
          else message.info("Строка изменилась — обновите данные")
          setConflict({ open: false, current: null, draft: null })
          cancelEdit()
        }}
        onManualMerge={() => {
          const base = conflict.current || {}
          const draft = conflict.draft || {}
          const merged = mergeConflictDraft(base, {
            ...draft,
            description: draft.description ?? base.description,
            duty_rate: draft.duty_rate ?? base.duty_rate,
            notes: draft.notes ?? base.notes,
          })
          if (merged.id) {
            setEditingKey(merged.id)
            setEditedRow(merged)
          }
          setConflict({ open: false, current: null, draft: null })
        }}
        onCancel={() =>
          setConflict({ open: false, current: null, draft: null })
        }
      />
    </>
  )
}
