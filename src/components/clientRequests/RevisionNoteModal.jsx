import React from "react"
import { Input, Modal } from "antd"

export default function RevisionNoteModal({
  open,
  revisionNote,
  setRevisionNote,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal
      title="Комментарий к ревизии"
      open={open}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="Создать ревизию"
      cancelText="Отмена"
      destroyOnHidden
    >
      <Input.TextArea
        value={revisionNote}
        onChange={(event) => setRevisionNote(event.target.value)}
        rows={4}
        placeholder="Причина изменений (обязательно)"
      />
    </Modal>
  )
}
