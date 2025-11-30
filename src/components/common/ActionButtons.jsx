// src/components/common/ActionButtons.jsx
import React from "react"
import { Button, Tooltip, Space } from "antd"
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  HistoryOutlined,
} from "@ant-design/icons"

/**
 * Универсальные кнопки действий для таблиц/форм.
 *
 * Параметры:
 * - onEdit, onSave, onCancel, onDelete, onHistory — колбэки действий (рендерятся только если переданы)
 * - loadingSave, loadingDelete — лоадеры на кнопках
 * - disabledEdit, disabledSave, disabledCancel, disabledDelete — дизаблы
 * - size — 'small' | 'middle' | 'large' (по умолчанию 'small')
 * - titles — объект для локализации тултипов (опционально)
 */
export default function ActionButtons({
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onHistory,
  extraButtons, // [{ key, label, onClick, icon, type, danger, disabled }]
  loadingSave = false,
  loadingDelete = false,
  disabledEdit = false,
  disabledSave = false,
  disabledCancel = false,
  disabledDelete = false,
  size = "small",
  titles = {
    edit: "Редактировать",
    save: "Сохранить",
    cancel: "Отмена",
    delete: "Удалить",
    history: "История изменений",
  },
}) {
  return (
    <Space size={6}>
      {onEdit && (
        <Tooltip title={titles.edit}>
          <Button
            aria-label={titles.edit}
            icon={<EditOutlined />}
            size={size}
            type="text"
            disabled={disabledEdit}
            onClick={onEdit}
          />
        </Tooltip>
      )}

      {onSave && (
        <Tooltip title={titles.save}>
          <Button
            aria-label={titles.save}
            icon={<SaveOutlined />}
            size={size}
            type="primary"
            loading={loadingSave}
            disabled={disabledSave}
            onClick={onSave}
          />
        </Tooltip>
      )}

      {onCancel && (
        <Tooltip title={titles.cancel}>
          <Button
            aria-label={titles.cancel}
            icon={<CloseOutlined />}
            size={size}
            type="default"
            disabled={disabledCancel}
            onClick={onCancel}
          />
        </Tooltip>
      )}

      {onHistory && (
        <Tooltip title={titles.history}>
          <Button
            aria-label={titles.history}
            icon={<HistoryOutlined />}
            size={size}
            type="text"
            onClick={onHistory}
          />
        </Tooltip>
      )}

      {onDelete && (
        <Tooltip title={titles.delete}>
          <Button
            aria-label={titles.delete}
            icon={<DeleteOutlined />}
            size={size}
            type="text"
            danger
            loading={loadingDelete}
            disabled={disabledDelete}
            onClick={onDelete}
          />
        </Tooltip>
      )}

      {Array.isArray(extraButtons) &&
        extraButtons.map((btn) => (
          <Tooltip title={btn.label} key={btn.key}>
            <Button
              aria-label={btn.label}
              icon={btn.icon}
              size={size}
              type={btn.type || "default"}
              danger={btn.danger}
              disabled={btn.disabled}
              onClick={btn.onClick}
            >
              {btn.showText === false ? null : (btn.text || btn.label)}
            </Button>
          </Tooltip>
        ))}
    </Space>
  )
}
