// src/components/common/VersionConflictModal.jsx
import React from "react"
import { Modal, Typography, Space, Button, Table, Tag, Tooltip } from "antd"

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
  open,
  draft,          // ваши несохранённые правки
  current,        // свежая запись с сервера
  onReload,       // «Обновить» — принять серверную версию
  onManualMerge,  // «Слить вручную» — вернуться к редактированию c базой
  onCancel,
  fields = [
    { key: "code",        title: "Код" },
    { key: "description", title: "Описание" },
    { key: "duty_rate",   title: "Пошлина (%)", format: v => (v ?? "") === "" ? "—" : String(v) },
    { key: "notes",       title: "Примечания" },
  ],
}) {
  const safeDraft = draft ?? {}
  const safeCurrent = current ?? {}

  const rows = diffRows(safeDraft, safeCurrent, fields)
  const changedCount = rows.filter(r => r.changed).length
  const noData = !draft && !current

  return (
    <Modal open={open} onCancel={onCancel} footer={null} title="Конфликт версий" centered>
      <Typography.Paragraph>
        Пока вы редактировали запись, её изменили в другом окне/у другого пользователя.
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
          <Button onClick={onCancel}>Отмена</Button>
          <Button onClick={onManualMerge}>Слить вручную</Button>
          <Button type="primary" onClick={onReload}>Обновить</Button>
        </Space>
      </Space>
    </Modal>
  )
}
