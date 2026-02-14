// src/components/orders/ProposalPreviewModal.jsx
import React, { useMemo, useState } from "react"
import dayjs from "dayjs"
import { Modal, Table, Space, Typography, Divider, Button, Tag, message, Segmented, Alert } from "antd"
import { UploadOutlined, DownloadOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

const { Title, Text } = Typography

const canViewSupplierDetails = (role = "") => {
  const r = (role || "").toLowerCase()
  return (
    r === "admin" ||
    r === "комплектовщик" ||
    r === "komplektovshchik" ||
    r === "komplektovshik" ||
    r === "закупщик" ||
    r === "buyer" ||
    r === "procurement" ||
    r === "purchase"
  )
}

export default function ProposalPreviewModal({ open, onClose, order, items, viewRole }) {
  const roleCanSeeSupplier = canViewSupplierDetails(viewRole)
  const [uploading, setUploading] = useState(false)
  const [viewMode, setViewMode] = useState("client") // client | internal

  const uomLabel = (uom) => {
    if (!uom) return "—"
    const map = { pcs: "шт", kg: "кг", set: "компл." }
    return map[uom] || uom
  }

  const itemTables = useMemo(() => {
    if (!Array.isArray(items)) return []

    return items.map((it, idx) => {
      const offers = Array.isArray(it.offers) ? it.offers : []
      const visible = offers.filter((o) => o.client_visible)
      const chosen =
        offers.find((o) => o.status === "approved") ||
        offers.find((o) => o.status === "proposed") ||
        offers[0]
      const display = visible.length ? visible : chosen ? [chosen] : []
      const hasApproved = display.some((o) => o.status === "approved")

      const rows = (display.length ? display : [null]).map((offer, offerIdx) => {
        const priceNumber =
          offer?.client_price != null ? Number(offer.client_price) : null
        const price =
          offer && offer.client_price != null
            ? formatPriceWithCurrency(offer.client_price, offer.client_currency || order?.currency || "")
            : "—"
        const eta =
          offer && offer.eta_days_effective != null
            ? `${offer.eta_days_effective} дн.`
            : offer?.lead_time_days != null
            ? `${offer.lead_time_days} дн.`
            : "—"
        const supplierLabel =
          offer && viewMode === "client"
            ? offer.supplier_public_code || "—"
            : offer && roleCanSeeSupplier
              ? offer.supplier_name || offer.supplier_public_code || "—"
              : offer?.supplier_public_code || "—"

        const countInTotal = hasApproved
          ? offer?.status === "approved"
          : offerIdx === 0

        return {
          key: `line-${it.id || idx}-offer-${offer?.id || offerIdx}`,
          variant: display.length > 1 ? String.fromCharCode(65 + offerIdx) : "",
          part_number: it.cat_number || it.original_part_number || "-",
          description:
            it.description ||
            it.part_description ||
            it.original_description_ru ||
            it.original_description_en ||
            "",
          supplier_part_number: offer?.supplier_part_number || "",
          supplier_part_description: offer?.supplier_part_description || "",
          qty: it.requested_qty || 1,
          uom: uomLabel(it.uom),
          supplier: supplierLabel,
          supplier_price:
            offer && offer.supplier_price != null
              ? formatPriceWithCurrency(offer.supplier_price, offer.supplier_currency || "")
              : "",
          logistics:
            offer && offer.logistics_cost != null
              ? formatPriceWithCurrency(offer.logistics_cost, offer.logistics_currency || "")
              : "",
          price,
          priceNumber,
          eta,
          comment: offer?.comment_client || "",
          countInTotal,
        }
      })

      const total = rows.reduce((sum, r) => {
        if (!r.countInTotal) return sum
        return Number.isFinite(r.priceNumber) ? sum + r.priceNumber : sum
      }, 0)

      return {
        lineNumber: it.line_number || idx + 1,
        header: `${it.cat_number || it.original_part_number || "-"} • ${
          it.description ||
          it.part_description ||
          it.original_description_ru ||
          it.original_description_en ||
          ""
        }`,
        model: [it.manufacturer_name, it.model_name].filter(Boolean).join(" "),
        rows,
        total,
      }
    })
  }, [items, roleCanSeeSupplier, viewMode, order?.currency])

  const total = useMemo(() => {
    return itemTables.reduce((sum, tbl) => sum + tbl.total, 0)
  }, [itemTables])

  const columnsClient = [
    { title: "№", dataIndex: "line_number", width: 60 },
    {
      title: "Вариант",
      dataIndex: "variant",
      width: 90,
      render: (v) => (v ? <Tag>{v}</Tag> : "—"),
    },
    { title: "Cat# пост.", dataIndex: "supplier_part_number", width: 160 },
    { title: "Описание у поставщика", dataIndex: "supplier_part_description", width: 240, ellipsis: true },
    { title: "Кол-во", dataIndex: "qty", width: 90 },
    { title: "Ед.", dataIndex: "uom", width: 70 },
    {
      title: "Поставщик",
      dataIndex: "supplier",
      width: 180,
      render: (v) => (v ? <Tag>{v}</Tag> : "—"),
    },
    { title: "Цена клиенту", dataIndex: "price", width: 140 },
    { title: "ETA", dataIndex: "eta", width: 100 },
    { title: "Комментарий", dataIndex: "comment", ellipsis: true },
  ]

  const columnsInternal = [
    { title: "№", dataIndex: "line_number", width: 60 },
    {
      title: "Вариант",
      dataIndex: "variant",
      width: 90,
      render: (v) => (v ? <Tag>{v}</Tag> : "—"),
    },
    { title: "Cat# пост.", dataIndex: "supplier_part_number", width: 160 },
    { title: "Наименование пост.", dataIndex: "supplier_part_description", width: 240, ellipsis: true },
    {
      title: "Поставщик",
      dataIndex: "supplier",
      width: 180,
      render: (v) => (v ? <Tag>{v}</Tag> : "—"),
    },
    { title: "Цена пост.", dataIndex: "supplier_price", width: 140 },
    { title: "Логистика", dataIndex: "logistics", width: 120 },
    { title: "Цена клиенту", dataIndex: "price", width: 140 },
    { title: "ETA", dataIndex: "eta", width: 90 },
    { title: "Комментарий", dataIndex: "comment", ellipsis: true },
  ]

  const handleGeneratePdf = async () => {
    if (!order?.id) {
      message.warning("Сначала сохраните заказ")
      return
    }
    setUploading(true)
    try {
      const { data } = await axios.post(`/client-orders/${order.id}/proposal-generate`)
      const url = data?.url
      if (url) {
        window.open(url, "_blank", "noopener")
        message.success("PDF сформирован и сохранён")
      } else {
        message.success("PDF сформирован")
      }
    } catch (e) {
      console.error("generate proposal error", e)
      message.error(e?.response?.data?.message || "Не удалось сформировать PDF")
    } finally {
      setUploading(false)
    }
  }

  const companyBlock = (
    <div>
      <Title level={5} style={{ marginBottom: 4 }}>
        ООО «Тестовая Компания»
      </Title>
      <Text>ИНН 1234567890</Text>
      <br />
      <Text>р/с 40702810900000000000 в ПАО Банк</Text>
      <br />
      <Text>Тел.: +7 (999) 000-00-00</Text>
      <br />
      <Text>E-mail: sales@example.com</Text>
    </div>
  )

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>Закрыть</Button>
          <Button icon={<UploadOutlined />} loading={uploading} onClick={handleGeneratePdf}>
            Сохранить PDF
          </Button>
        </Space>
      }
      width={1200}
      title="Предложение для клиента"
      styles={{
        body: { maxHeight: "80vh", overflowY: "auto" },
      }}
    >
      <style>
        {`
          @media print {
            @page { size: A4 portrait; margin: 12mm; }
            .proposal-print { width: 180mm; }
            .proposal-print .ant-table { font-size: 11px; }
            .proposal-print .ant-modal-footer { display: none !important; }
          }
        `}
      </style>
      <Space direction="vertical" style={{ width: "100%" }} size={12} className="proposal-print">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div />
          <Segmented
            value={viewMode}
            onChange={setViewMode}
            options={[
              { label: "Для клиента", value: "client" },
              { label: "Внутреннее", value: "internal" },
            ]}
          />
        </div>

        <Alert
          type="info"
          showIcon
          message="Шаблон предложения"
          description="Это временная болванка. Реквизиты, логотип и финальный текст будут добавлены позже."
        />

        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          {companyBlock}
          <div style={{ textAlign: "right", minWidth: 240 }}>
            <Title level={4} style={{ marginBottom: 4 }}>
              Заказ {order?.order_number || `#${order?.id || ""}`}
            </Title>
            <Text type="secondary">Статус: {order?.status || "—"}</Text>
            <div>
              <Text strong>Клиент:</Text> {order?.client_company_name || order?.client_name || "—"}
            </div>
            <div>
              <Text strong>Контакт:</Text> {order?.contact_name || "—"}
            </div>
            <div>
              <Text strong>E-mail:</Text> {order?.contact_email || "—"}
            </div>
            <div>
              <Text strong>Телефон:</Text> {order?.contact_phone || "—"}
            </div>
            <div>
              <Text strong>Заказ клиента:</Text> {order?.client_po_number || "—"}
            </div>
            <div>
              <Text strong>Дата запроса:</Text>{" "}
              {order?.requested_delivery_date
                ? dayjs(order.requested_delivery_date).format("YYYY-MM-DD")
                : "—"}
            </div>
          </div>
        </div>

        <Divider style={{ margin: "8px 0" }} />

        <Space wrap size={12} style={{ fontSize: 13 }}>
          <Text>
            <Text strong>Валюта:</Text> {order?.currency || "—"}
          </Text>
          <Text>
            <Text strong>Incoterms:</Text> {order?.incoterms || "—"}
          </Text>
          <Text>
            <Text strong>Оплата:</Text> {order?.payment_terms || "—"}
          </Text>
        </Space>

        {itemTables.map((tbl) => (
          <div key={`tbl-${tbl.lineNumber}`} style={{ marginTop: 8, border: "1px solid #f0f0f0", borderRadius: 8, padding: 12 }}>
            <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <Text strong>
                Позиция {tbl.lineNumber}: {tbl.header}
              </Text>
              {tbl.model && (
                <Text type="secondary">
                  {tbl.model}
                </Text>
              )}
            </div>
            <Table
              size="small"
              dataSource={tbl.rows}
              columns={viewMode === "internal" ? columnsInternal : columnsClient}
              pagination={false}
              scroll={{ x: viewMode === "internal" ? 1200 : 1100 }}
            />
          </div>
        ))}

        <div style={{ textAlign: "right", fontWeight: 600 }}>
          Итоговая сумма (утверждённые или первый видимый вариант):{" "}
          {total ? formatPriceWithCurrency(total, order?.currency || "") : "—"}
        </div>

        {order?.comment_client && (
          <div>
            <Text strong>Комментарий клиента:</Text> {order.comment_client}
          </div>
        )}
      </Space>
    </Modal>
  )
}
