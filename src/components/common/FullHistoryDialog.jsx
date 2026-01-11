// src/components/common/FullHistoryDialog.jsx
import React from "react"
import { Modal } from "antd"
import HistoryPanel from "./HistoryPanel"

export default function FullHistoryDialog({
  entityId,
  entityType,
  onlyDeleted = false,
  endpoint,
  onClose,
}) {
  const opened = onlyDeleted || !!entityId

  return (
    <Modal
      open={opened}
      onCancel={onClose}
      onOk={onClose}
      width={1280}
      title={onlyDeleted ? "Удалённые записи" : "История изменений"}
      okText="Закрыть"
      cancelButtonProps={{ style: { display: "none" } }}
      bodyStyle={{ paddingTop: 12, maxHeight: "72vh", overflow: "hidden" }}
    >
      <HistoryPanel
        entityId={entityId}
        entityType={entityType}
        onlyDeleted={onlyDeleted}
        endpoint={endpoint}
        maxHeight="60vh"
      />
    </Modal>
  )
}
