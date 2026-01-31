// src/pages/SupplierDetailPage.jsx
import React, { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Button, Card, Empty, Space, Tag, Typography, message } from "antd"
import axios from "@/api/axiosInstance"
import TabRendererPage from "@/components/common/TabRendererPage"
import SupplierDock from "@/components/suppliers/SupplierDock"
import SupplierMetaCard from "@/components/suppliers/SupplierMetaCard"

const { Text } = Typography

export default function SupplierDetailPage() {
  const { id } = useParams()
  const supplierId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(false)
  const [supplier, setSupplier] = useState(null)

  const load = async () => {
    if (!supplierId) return
    setLoading(true)
    try {
      const { data } = await axios.get(`/suppliers/${supplierId}`)
      setSupplier(data || null)
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить поставщика")
      setSupplier(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  const goBack = () => {
    const from = location.state?.from
    const listState = location.state?.listState
    if (from && listState) {
      navigate(from, { state: { restore: listState } })
      return
    }
    navigate("/suppliers")
  }

  const header = (
    <Space wrap size={8}>
      <Button onClick={goBack}>Назад к списку</Button>
      {supplier?.name ? <Text type="secondary">Поставщик: {supplier.name}</Text> : null}
      {supplier?.public_code ? <Tag color="geekblue">{supplier.public_code}</Tag> : null}
      {supplier?.country ? <Tag>{supplier.country}</Tag> : null}
    </Space>
  )

  return (
    <TabRendererPage tabKey="suppliers">
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        {header}

        {!supplierId ? (
          <Card>
            <Empty description="Некорректный идентификатор поставщика" />
          </Card>
        ) : !supplier && !loading ? (
          <Card>
            <Empty description="Поставщик не найден" />
          </Card>
        ) : (
          <>
            <SupplierMetaCard supplier={supplier} onSaved={load} />
            <SupplierDock supplier={supplier} onChanged={load} />
          </>
        )}
      </Space>
    </TabRendererPage>
  )
}

