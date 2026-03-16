// src/pages/OriginalPartDetailPage.jsx
import React, { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Button, Card, Empty, Modal, Space, Tag, Typography, message } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import TabRendererPage from "@/components/common/TabRendererPage"
import DetailDock from "@/components/originalParts/DetailDock"
import confirmAction from "@/utils/confirmAction"

const { Text } = Typography

export default function OriginalPartDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const partId = Number(id)

  const [loading, setLoading] = useState(false)
  const [part, setPart] = useState(null)

  const currentModelId =
    Number(location.state?.currentModelId || 0) ||
    Number(part?.equipment_model_id || 0) ||
    (Array.isArray(part?.application_models) && part.application_models.length === 1
      ? Number(part.application_models[0]?.equipment_model_id || 0) || null
      : null)

  const goBackToList = () => {
    const from = location.state?.from || "/original-parts"
    const listState = location.state?.listState
    if (listState) {
      navigate(from, { state: { restore: listState } })
    } else {
      navigate(from)
    }
  }

  const openPartCardFromBom = (nextPartId) => {
    const idNum = Number(nextPartId)
    if (!Number.isFinite(idNum) || idNum <= 0) return
    navigate(`/original-parts/${idNum}`, {
      state: {
        from: location.pathname,
        currentModelId,
        listState: location.state?.listState,
      },
    })
  }

  const load = async () => {
    if (!partId) return
    setLoading(true)
    try {
      const { data } = await axios.get(`/original-parts/${partId}/full`)
      setPart(data || null)
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить деталь")
      setPart(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partId])

  const handleDeleteCurrentModel = async () => {
    if (!part?.id) return
    const { confirmed } = await confirmAction(
      `Удалить деталь ${part.cat_number || ""} только из текущей модели?`
    )
    if (!confirmed) return
    try {
      await axios.delete(`/original-parts/${part.id}`, {
        data: {
          equipment_model_id: currentModelId,
        },
      })
      message.success("Удалено из текущей модели")
      goBackToList()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось удалить деталь")
    }
  }

  const handleDeleteEverywhere = async () => {
    if (!part?.id) return
    const modelNames = Array.isArray(part?.application_models)
      ? part.application_models.map((m) => m?.model_name).filter(Boolean)
      : []
    const confirmed = await new Promise((resolve) => {
      Modal.confirm({
        title: `Удалить ${part.cat_number || "деталь"} полностью?`,
        okText: "Удалить полностью",
        cancelText: "Отмена",
        okButtonProps: { danger: true },
        content: (
          <Space direction="vertical" size={8}>
            <div>Деталь будет удалена из всех моделей производителя.</div>
            <div style={{ fontWeight: 600 }}>Модели, из которых удалится:</div>
            <Space wrap>
              {modelNames.length ? (
                modelNames.map((name) => <Tag key={name}>{name}</Tag>)
              ) : (
                <Tag>{part?.model_name || "—"}</Tag>
              )}
            </Space>
          </Space>
        ),
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })
    if (!confirmed) return
    try {
      const { data } = await axios.post(`/original-parts/${part.id}/delete-all`)
      const cnt = Number(data?.deleted_count || 0)
      message.success(
        cnt > 0
          ? `Полное удаление выполнено (моделей: ${cnt})`
          : "Полное удаление выполнено"
      )
      goBackToList()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось удалить деталь полностью")
    }
  }

  return (
    <TabRendererPage tabKey="original_parts">
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          OEM детали
        </Typography.Title>
        <Space>
          <Button onClick={goBackToList}>
            Назад к списку
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDeleteCurrentModel}
          >
            Удалить из модели
          </Button>
          <Button
            danger
            type="primary"
            icon={<DeleteOutlined />}
            onClick={handleDeleteEverywhere}
          >
            Удалить полностью
          </Button>
          {part?.cat_number ? (
            <Text type="secondary">OEM деталь: {part.cat_number}</Text>
          ) : null}
        </Space>

        {!partId ? (
          <Card>
            <Empty description="Некорректный идентификатор детали" />
          </Card>
        ) : !part && !loading ? (
          <Card>
            <Empty description="Деталь не найдена" />
          </Card>
        ) : (
          <>
            <Card size="small" bodyStyle={{ padding: 12 }}>
              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                <b>Модели применения</b>
                <Space wrap>
                  {(Array.isArray(part?.application_models) &&
                  part.application_models.length > 0
                    ? part.application_models
                    : [
                        {
                          equipment_model_id: part?.equipment_model_id || null,
                          model_name: part?.model_name || "—",
                        },
                      ]
                  ).map((m) => (
                    <Tag key={`${m.equipment_model_id || "x"}:${m.model_name || ""}`} color="blue">
                      {m.model_name || "—"}
                    </Tag>
                  ))}
                </Space>
              </Space>
            </Card>

            <DetailDock
              part={part}
              modelId={currentModelId}
              manufacturerName={part?.manufacturer_name}
              modelName={part?.model_name}
              onOpenPart={openPartCardFromBom}
              onPartsChanged={load}
            />
          </>
        )}
      </Space>
    </TabRendererPage>
  )
}
