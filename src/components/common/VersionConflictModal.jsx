// src/components/common/VersionConflictModal.jsx
import React from "react"
import { Modal, Typography, Space, Button, Table, Tag, Tooltip } from "antd"
import { mergeConflictDraft } from "@/utils/versionConflict"

function diffRows(draft = {}, current = {}, fields = []) {
  const list = Array.isArray(fields) ? fields : []
  return list.map(({ key, title, format }) => {
    const a = draft?.[key]
    const b = current?.[key]
    const fmt = typeof format === "function" ? format : (v) => v
    const showA = fmt(a)
    const showB = fmt(b)
    const changed = (showA ?? "") !== (showB ?? "")
    return { key, title, mine: showA ?? "—", theirs: showB ?? "—", changed }
  })
}

export default function VersionConflictModal({
  conflict,
  open,
  draft,          // ваши несохранённые правки
  current,        // свежая запись с сервера
  onReload,       // «Обновить» — принять серверную версию
  onManualMerge,  // «Слить вручную» — вернуться к редактированию c базой
  onApplyServer,  // алиас onReload
  onApplyDraft,   // алиас onManualMerge
  onMerge,        // алиас с передачей merged-объекта
  onCancel,
  onClose,
  entityLabel,
  entityName,
  fields = [
    { key: "code",        title: "Код" },
    { key: "description", title: "Описание" },
    { key: "duty_rate",   title: "Пошлина (%)", format: v => (v ?? "") === "" ? "—" : String(v) },
    { key: "notes",       title: "Примечания" },
  ],
}) {
  const resolvedOpen =
    open !== undefined ? open : conflict?.open !== undefined ? conflict.open : !!conflict
  const resolvedDraft = draft ?? conflict?.draft
  const resolvedCurrent = current ?? conflict?.current
  const label = entityLabel || entityName

  const safeDraft = resolvedDraft ?? {}
  const safeCurrent = resolvedCurrent ?? {}

  const rows = diffRows(safeDraft, safeCurrent, fields)
  const changedCount = rows.filter(r => r.changed).length
  const noData = !resolvedDraft && !resolvedCurrent

  const handleCancel = typeof onCancel === "function" ? onCancel : onClose
  const handleReload =
    typeof onReload === "function" ? onReload : onApplyServer
  const canReload = typeof handleReload === "function"
  const handleManualMerge = () => {
    if (typeof onManualMerge === "function") return onManualMerge()
    if (typeof onApplyDraft === "function") return onApplyDraft()
    if (typeof onMerge === "function") {
      const merged = mergeConflictDraft(
        resolvedCurrent || {},
        resolvedDraft || {},
      )
      return onMerge(merged)
    }
    return null
  }
  const canMerge =
    typeof onManualMerge === "function" ||
    typeof onApplyDraft === "function" ||
    typeof onMerge === "function"

  return (
    <Modal
      open={resolvedOpen}
      onCancel={handleCancel}
      footer={null}
      title="Конфликт версий"
      centered
    >
      <Typography.Paragraph>
        Пока вы редактировали {label ? `«${label}»` : "запись"}, её изменили в
        другом окне/у другого пользователя.
      </Typography.Paragraph>

      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        Выберите действие:
        <ul style={{ marginTop: 6 }}>
          <li><b>Обновить</b> — принять текущую версию из базы (ваши черновые правки будут сброшены).</li>
          <li><b>Слить вручную</b> — открыть свежую версию и перенести ваши правки в нужные поля, затем сохранить.</li>
        </ul>
      </Typography.Paragraph>

      {!noData ? (
        <Table
          size="small"
          pagination={false}
          rowKey="key"
          dataSource={rows}
          style={{ marginBottom: 12 }}
          columns={[
            { title: "Поле", dataIndex: "title", width: 160 },
            {
              title: "Ваши правки",
              dataIndex: "mine",
              render: (v, r) => (r.changed ? <Tag>{v}</Tag> : <span>{v}</span>),
            },
            {
              title: "В базе",
              dataIndex: "theirs",
              render: (v, r) => (r.changed ? <Tag color="blue">{v}</Tag> : <span>{v}</span>),
            },
            {
              title: "",
              width: 70,
              align: "center",
              render: (_, r) => (r.changed ? <Tooltip title="Значения отличаются">⚠️</Tooltip> : null),
            },
          ]}
        />
      ) : (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          Не удалось получить данные для сравнения. Вы можете просто «Обновить» и повторить редактирование.
        </Typography.Paragraph>
      )}

      <Space style={{ justifyContent: "space-between", width: "100%" }}>
        <Typography.Text type="secondary">
          {noData ? " " : `Изменённых полей: ${changedCount}`}
        </Typography.Text>
        <Space>
          <Button onClick={handleCancel}>Отмена</Button>
          {canMerge && <Button onClick={handleManualMerge}>Слить вручную</Button>}
          {canReload && (
            <Button type="primary" onClick={handleReload}>
              Обновить
            </Button>
          )}
        </Space>
      </Space>
    </Modal>
  )
}
