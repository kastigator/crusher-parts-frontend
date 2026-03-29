import React from "react"
import { Alert, Descriptions, Modal, Space, Tag, Typography } from "antd"
import axios from "@/api/axiosInstance"
import { appMessage } from "@/utils/uiFeedback"
import { getTrashEntityLabel } from "@/utils/trashLabels"

const { Text } = Typography

const MODE_META = {
  trash: { label: "Корзина", color: "orange" },
  archive_only: { label: "Только архив", color: "blue" },
  relation_delete: { label: "Удаление связи", color: "purple" },
  forbidden: { label: "Недоступно", color: "red" },
}

function formatList(obj) {
  return Object.entries(obj || {})
    .filter(([, value]) => Number(value || 0) > 0)
    .map(([key, value]) => ({
      key,
      label: getTrashEntityLabel(key),
      value: Number(value || 0),
    }))
}

function TrashPreviewContent({ preview }) {
  const affected = formatList(preview?.affected_counts)
  const activeProcesses = formatList(preview?.active_processes)
  const blockingReasons = Array.isArray(preview?.blocking_reasons) ? preview.blocking_reasons : []
  const modeMeta = MODE_META[preview?.mode] || MODE_META.forbidden

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label="Сущность">{preview?.entity_title || "Без названия"}</Descriptions.Item>
        <Descriptions.Item label="Режим">
          <Tag color={modeMeta.color}>{modeMeta.label}</Tag>
        </Descriptions.Item>
        {preview?.summary?.message ? (
          <Descriptions.Item label="Что произойдёт">{preview.summary.message}</Descriptions.Item>
        ) : null}
      </Descriptions>

      {affected.length ? (
        <Alert
          type="info"
          showIcon
          message="Будет затронуто"
          description={
            <Space direction="vertical" size={4}>
              {affected.map((item) => (
                <Text key={item.key}>{`${item.label}: ${item.value}`}</Text>
              ))}
            </Space>
          }
        />
      ) : null}

      {activeProcesses.length ? (
        <Alert
          type="warning"
          showIcon
          message="Активные процессы"
          description={
            <Space direction="vertical" size={4}>
              {activeProcesses.map((item) => (
                <Text key={item.key}>{`${item.label}: ${item.value}`}</Text>
              ))}
            </Space>
          }
        />
      ) : null}

      {blockingReasons.length ? (
        <Alert
          type="error"
          showIcon
          message="Ограничения"
          description={
            <Space direction="vertical" size={4}>
              {blockingReasons.map((item, idx) => (
                <Text key={`${item.code || "reason"}-${idx}`}>{item.message || item.code}</Text>
              ))}
            </Space>
          }
        />
      ) : null}
    </Space>
  )
}

async function showBlockedPreview(preview) {
  return new Promise((resolve) => {
    Modal.info({
      title: preview?.summary?.title || "Удаление недоступно",
      width: 720,
      okText: "Понятно",
      content: <TrashPreviewContent preview={preview} />,
      onOk: () => resolve({ deleted: false, blocked: true, preview }),
    })
  })
}

export async function runTrashDeleteFlow({
  entityType,
  entityId,
  deleteUrl,
  deleteParams,
  previewParams,
  successMessage,
}) {
  try {
    const { data: preview } = await axios.get(`/trash/preview/${entityType}/${entityId}`, {
      params: previewParams || {},
    })
    if (preview?.mode !== "trash" && preview?.mode !== "relation_delete") {
      return showBlockedPreview(preview)
    }

    return new Promise((resolve) => {
      const isRelationDelete = preview?.mode === "relation_delete"
      Modal.confirm({
        title: preview?.summary?.title || (isRelationDelete ? "Удалить связь?" : "Переместить в корзину?"),
        width: 720,
        okText: isRelationDelete ? "Удалить связь" : "Переместить в корзину",
        okButtonProps: { danger: true },
        cancelText: "Отмена",
        content: <TrashPreviewContent preview={preview} />,
        onCancel: () => resolve({ deleted: false, preview }),
        onOk: async () => {
          try {
            const { data } = await axios.delete(deleteUrl, {
              params: deleteParams || {},
            })
            appMessage.success(successMessage || data?.message || "Объект перемещён в корзину")
            resolve({ deleted: true, preview, response: data })
          } catch (error) {
            const nextPreview = error?.response?.data?.preview
            if (nextPreview) {
              setTimeout(() => {
                showBlockedPreview(nextPreview)
              }, 0)
            } else {
              appMessage.error(error?.response?.data?.message || "Не удалось выполнить удаление")
            }
            throw error
          }
        },
      })
    })
  } catch (error) {
    appMessage.error(error?.response?.data?.message || "Не удалось загрузить предпросмотр удаления")
    return { deleted: false, error }
  }
}

export function getTrashModeMeta(mode) {
  return MODE_META[mode] || MODE_META.forbidden
}
