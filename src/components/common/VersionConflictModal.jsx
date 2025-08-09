import React from "react"
import { Modal, Typography, Space, Button } from "antd"

export default function VersionConflictModal({
  open,
  onReload,
  onManualMerge,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      title="Конфликт версий"
      centered
    >
      <Typography.Paragraph>
        Запись уже была изменена другим пользователем.
        Выберите, как продолжить:
      </Typography.Paragraph>
      <Space style={{ justifyContent: "flex-end", width: "100%" }}>
        <Button onClick={onCancel}>Отмена</Button>
        <Button onClick={onManualMerge}>Слить вручную</Button>
        <Button type="primary" onClick={onReload}>
          Обновить
        </Button>
      </Space>
    </Modal>
  )
}
