// src/pages/SupplierPartDetailPage.jsx
import React, { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Button, Card, Empty, Space, Tag, Tooltip, Typography, message } from "antd"
import { TeamOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import TabRendererPage from "@/components/common/TabRendererPage"
import SupplierPartDock from "@/components/supplierParts/SupplierPartDock"
import SupplierPartMetaCard from "@/components/supplierParts/SupplierPartMetaCard"

const { Text } = Typography

const fmtPrice = (p, c) => {
  const n = Number(p)
  if (!Number.isFinite(n)) return null
  const cur = (c || "").toString().trim()
  return `${n.toFixed(2)}${cur ? " " + cur : ""}`
}

export default function SupplierPartDetailPage() {
  const { id } = useParams()
  const partId = Number(id)

  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [part, setPart] = useState(null)

  const load = async () => {
    if (!partId) return
    setLoading(true)
    try {
      const { data } = await axios.get(`/supplier-parts/${partId}`)
      setPart(data || null)
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить деталь поставщика")
      setPart(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partId])

  const goBack = () => {
    const from = location.state?.from
    const listState = location.state?.listState

    if (from && listState) {
      navigate(from, { state: { restore: listState } })
      return
    }

    // Fallback: restore via URL params if present (e.g. deep link)
    const supplierId = params.get("supplierId")
    const all = params.get("all")
    const qs = new URLSearchParams()
    if (supplierId) qs.set("supplierId", supplierId)
    if (all) qs.set("all", all)
    const url = qs.toString() ? `/supplier-parts?${qs.toString()}` : "/supplier-parts"
    navigate(url)
  }

  const header = (
    <Space wrap size={8}>
      <Button onClick={goBack}>Назад к списку</Button>
      {part?.supplier_part_number ? (
        <Text type="secondary">Деталь: {part.supplier_part_number}</Text>
      ) : null}
      {part?.supplier_name ? <Tag color="geekblue">{part.supplier_name}</Tag> : null}
      {part?.supplier_id ? (
        <Button
          size="small"
          icon={<TeamOutlined />}
          onClick={() => navigate(`/suppliers/${part.supplier_id}`)}
        >
          Поставщик
        </Button>
      ) : null}
      {part?.supplier_contact_name ? (
        <Tag>
          Контакт: {part.supplier_contact_name}
          {part?.supplier_contact_phone ? ` · ${part.supplier_contact_phone}` : ""}
        </Tag>
      ) : null}
      {part?.supplier_primary_address ? (
        <Tooltip title={part.supplier_primary_address} placement="bottom">
          <Tag>Адрес</Tag>
        </Tooltip>
      ) : null}
      {fmtPrice(part?.latest_price, part?.latest_currency) ? (
        <Tag color="green">
          Цена: {fmtPrice(part.latest_price, part.latest_currency)}
          {part?.latest_price_date ? ` · ${part.latest_price_date}` : ""}
        </Tag>
      ) : null}
      {String(part?.part_type || "").toUpperCase() === "OEM" ? (
        <Tag color="blue">OEM</Tag>
      ) : null}
      {part?.is_overweight ? <Tag color="red">Тяжелая</Tag> : null}
      {part?.is_oversize ? <Tag color="orange">Негабарит</Tag> : null}
    </Space>
  )

  return (
    <TabRendererPage tabKey="supplier_parts">
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        {header}

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
            <SupplierPartMetaCard part={part} onSaved={load} />
            <SupplierPartDock part={part} onChanged={load} noTopMargin />
          </>
        )}
      </Space>
    </TabRendererPage>
  )
}
