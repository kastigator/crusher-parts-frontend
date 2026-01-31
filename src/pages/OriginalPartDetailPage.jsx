// src/pages/OriginalPartDetailPage.jsx
import React, { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Button, Card, Empty, Space, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import TabRendererPage from "@/components/common/TabRendererPage"
import DetailDock from "@/components/originalParts/DetailDock"
import TnvedPicker from "@/components/fields/TnvedPicker"

const { Text } = Typography

export default function OriginalPartDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const partId = Number(id)

  const [loading, setLoading] = useState(false)
  const [part, setPart] = useState(null)
  const [meta, setMeta] = useState({ tech_description: "", tnved: null })
  const [metaDirty, setMetaDirty] = useState(false)
  const [metaSaving, setMetaSaving] = useState(false)

  const load = async () => {
    if (!partId) return
    setLoading(true)
    try {
      const { data } = await axios.get(`/original-parts/${partId}/full`)
      setPart(data || null)
      const tnvedObj = data?.tnved_code_id
        ? {
            id: data.tnved_code_id,
            code: data.tnved_code || "",
            description: data.tnved_description || "",
          }
        : null
      setMeta({
        tech_description: data?.tech_description || "",
        tnved: tnvedObj,
      })
      setMetaDirty(false)
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

  const saveMeta = async () => {
    if (!part?.id) return
    setMetaSaving(true)
    try {
      const payload = {
        tech_description:
          meta.tech_description?.trim() === ""
            ? null
            : meta.tech_description.trim(),
        tnved_code_id: meta.tnved?.id ?? null,
      }
      await axios.put(`/original-parts/${part.id}`, payload)
      message.success("Изменения сохранены")
      setMetaDirty(false)
      await load()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось сохранить изменения")
    } finally {
      setMetaSaving(false)
    }
  }

  const resetMeta = () => {
    if (!part) return
    const tnvedObj = part?.tnved_code_id
      ? {
          id: part.tnved_code_id,
          code: part.tnved_code || "",
          description: part.tnved_description || "",
        }
      : null
    setMeta({
      tech_description: part.tech_description || "",
      tnved: tnvedObj,
    })
    setMetaDirty(false)
  }

  return (
    <TabRendererPage tabKey="original_parts">
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        <Space>
          <Button
            onClick={() => {
              const from = location.state?.from || "/original-parts"
              const listState = location.state?.listState
              if (listState) {
                navigate(from, { state: { restore: listState } })
              } else {
                navigate(from)
              }
            }}
          >
            Назад к списку
          </Button>
          {part?.cat_number ? (
            <Text type="secondary">Деталь: {part.cat_number}</Text>
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
              <Space direction="vertical" style={{ width: "100%" }} size={10}>
                <div>
                  <b>Тех. описание</b>
                  <textarea
                    style={{
                      width: "100%",
                      marginTop: 6,
                      minHeight: 60,
                      resize: "vertical",
                      borderRadius: 6,
                      border: "1px solid #d9d9d9",
                      padding: 8,
                      fontFamily: "inherit",
                      fontSize: 13,
                    }}
                    value={meta.tech_description}
                    onChange={(e) => {
                      setMeta((prev) => ({
                        ...prev,
                        tech_description: e.target.value,
                      }))
                      setMetaDirty(true)
                    }}
                  />
                </div>

                <div>
                  <b>ТН ВЭД</b>
                  <div style={{ marginTop: 6 }}>
                    <TnvedPicker
                      allowClear
                      style={{ width: "100%" }}
                      value={meta.tnved || null}
                      onChange={(val) => {
                        setMeta((prev) => ({ ...prev, tnved: val || null }))
                        setMetaDirty(true)
                      }}
                    />
                  </div>
                </div>

                <Space>
                  <Button
                    type="primary"
                    onClick={saveMeta}
                    disabled={!metaDirty}
                    loading={metaSaving}
                  >
                    Сохранить
                  </Button>
                  <Button onClick={resetMeta} disabled={!metaDirty || metaSaving}>
                    Сбросить
                  </Button>
                </Space>
              </Space>
            </Card>

            <DetailDock
              part={part}
              modelId={part?.equipment_model_id || null}
              manufacturerName={part?.manufacturer_name}
              modelName={part?.model_name}
              onPartsChanged={load}
            />
          </>
        )}
      </Space>
    </TabRendererPage>
  )
}
