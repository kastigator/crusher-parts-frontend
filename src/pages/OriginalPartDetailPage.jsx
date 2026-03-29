// src/pages/OriginalPartDetailPage.jsx
import React, { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Button, Card, Empty, Space, Tag, Typography, message } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import TabRendererPage from "@/components/common/TabRendererPage"
import DetailDock from "@/components/originalParts/DetailDock"
import { runTrashDeleteFlow } from "@/utils/trashUi"

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
    if (!part?.id || !currentModelId) {
      message.error("Не удалось определить текущую модель")
      return
    }
    try {
      const result = await runTrashDeleteFlow({
        entityType: "oem_part_model_fitments",
        entityId: part.id,
        deleteUrl: `/original-parts/${part.id}`,
        deleteParams: {
          equipment_model_id: currentModelId,
        },
        previewParams: {
          equipment_model_id: currentModelId,
        },
        successMessage: "Удаление связи с моделью выполнено",
      })
      if (!result?.deleted) return
      goBackToList()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось удалить деталь")
    }
  }

  const handleDeleteEverywhere = async () => {
    if (!part?.id) return
    try {
      const result = await runTrashDeleteFlow({
        entityType: "oem_parts",
        entityId: part.id,
        deleteUrl: `/oem-parts/${part.id}`,
        successMessage: "OEM деталь перемещена в корзину",
      })
      if (!result?.deleted) return
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
