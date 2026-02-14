import React from "react"
import { Button, Checkbox, Select, Segmented, Space, Table, Tag, Typography } from "antd"
import { OFFER_STATUS_META, fmtMoney, isOfferVisible, normalizeOfferStatus } from "@/components/orders/offerModal/offerModalUtils"

const { Text } = Typography

export default function OffersListTabContent({
  offersFilter,
  setOffersFilter,
  offerFilterOptions,
  offersStats,
  canEditOffers,
  canSelect,
  selectedOfferKeys,
  bulkUpdating,
  handleBulkVisibility,
  bulkStatus,
  handleBulkStatus,
  selectedOffers,
  filteredOffers,
  offers,
  offersLoading,
  setSelectedOfferKeys,
  handleToggleVisibility,
  handleStatusChange,
  handleSelectOffer,
  handleDeleteOffer,
  renderSupplier,
}) {
  const offerRowClassName = (record) => {
    const classes = []
    if (isOfferVisible(record)) classes.push("offer-row-visible")
    if (record.status === "approved") classes.push("offer-row-approved")
    return classes.join(" ")
  }

  const columnsOffers = [
    {
      title: "Тип",
      dataIndex: "bundle_id",
      width: 90,
      render: (v) => (v ? <Tag color="geekblue">Комплект</Tag> : <Tag>Деталь</Tag>),
    },
    {
      title: "Поставщик",
      key: "supplier",
      width: 200,
      render: (_, r) => renderSupplier(r),
    },
    {
      title: "Cat# пост.",
      dataIndex: "supplier_part_number",
      width: 140,
      ellipsis: true,
    },
    {
      title: "Описание у поставщика",
      dataIndex: "supplier_part_description",
      width: 220,
      ellipsis: true,
      render: (v) => v || "—",
    },
    {
      title: "Деталь / Комплектация",
      dataIndex: "supplier_part_description",
      width: 220,
      ellipsis: true,
      render: (v, r) => (
        <Space direction="vertical" size={2}>
          <span>{v || r.comment_internal || "—"}</span>
          {r.bundle_id && r.comment_internal && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.comment_internal}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Цена пост.",
      dataIndex: "supplier_price",
      width: 120,
      render: (v, r) => fmtMoney(v, r.supplier_currency || ""),
    },
    {
      title: "Логистика",
      key: "logi",
      width: 140,
      render: (_, r) =>
        r.logistics_cost != null ? fmtMoney(r.logistics_cost, r.logistics_currency || "") : "—",
    },
    {
      title: "Цена клиенту",
      dataIndex: "client_price",
      width: 140,
      render: (v, r) => fmtMoney(v, r.client_currency || ""),
    },
    {
      title: "ETA",
      dataIndex: "eta_days_effective",
      width: 80,
      render: (v) => (v != null ? `${v} дн.` : "—"),
    },
    {
      title: "Для клиента",
      dataIndex: "client_visible",
      width: 130,
      render: (_, record) => {
        const visible = isOfferVisible(record)
        const isLocked = normalizeOfferStatus(record?.status) === "approved"
        if (canSelect) {
          return (
            <Checkbox
              checked={visible}
              disabled={isLocked}
              onChange={(e) => handleToggleVisibility(record, e.target.checked)}
            >
              Показать
            </Checkbox>
          )
        }
        return visible ? <Tag color="green">Показан</Tag> : <Tag>Скрыт</Tag>
      },
    },
    {
      title: "Статус",
      dataIndex: "status",
      width: 140,
      render: (v, record) => {
        const meta = OFFER_STATUS_META[v] || { color: "default", label: v || "—" }
        if (!canEditOffers) return <Tag color={meta.color}>{meta.label}</Tag>
        return (
          <Select
            value={v}
            style={{ width: 130 }}
            onChange={(val) => handleStatusChange(record, val)}
            options={Object.entries(OFFER_STATUS_META).map(([value, m]) => ({
              value,
              label: m.label,
            }))}
          />
        )
      },
    },
    {
      title: "",
      key: "actions",
      width: 180,
      render: (_, r) => (
        <Space>
          {canSelect && (
            <Button size="small" type="primary" onClick={() => handleSelectOffer(r)}>
              Выбрать
            </Button>
          )}
          {canEditOffers && (
            <Button size="small" danger onClick={() => handleDeleteOffer(r)}>
              Удалить
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div
      style={{
        overflowX: "auto",
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        padding: 12,
        background: "#fafafa",
      }}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Space wrap align="center" style={{ width: "100%", justifyContent: "space-between" }}>
          <Segmented size="small" value={offersFilter} onChange={setOffersFilter} options={offerFilterOptions} />
          <Space wrap>
            <Tag>Всего: {offersStats.total}</Tag>
            <Tag color="blue">Для клиента: {offersStats.visible}</Tag>
            <Tag color="green">Выбраны: {offersStats.approved}</Tag>
          </Space>
        </Space>

        {(canEditOffers || canSelect) && (
          <Space wrap align="center">
            <Text type="secondary">Выбрано: {selectedOfferKeys.length}</Text>
            <Button
              size="small"
              onClick={() => handleBulkVisibility(true)}
              disabled={!canSelect || !selectedOfferKeys.length}
              loading={bulkUpdating}
            >
              Показать клиенту
            </Button>
            <Button
              size="small"
              onClick={() => handleBulkVisibility(false)}
              disabled={!canSelect || !selectedOfferKeys.length}
              loading={bulkUpdating}
            >
              Скрыть
            </Button>
            <Select
              size="small"
              placeholder="Статус выбранным"
              value={bulkStatus || undefined}
              onChange={handleBulkStatus}
              disabled={!canEditOffers || !selectedOfferKeys.length}
              loading={bulkUpdating}
              style={{ width: 200 }}
              options={Object.entries(OFFER_STATUS_META).map(([value, m]) => ({
                value,
                label: m.label,
              }))}
            />
            <Button
              size="small"
              type="primary"
              onClick={() => handleSelectOffer(selectedOffers[0])}
              disabled={!canSelect || selectedOffers.length !== 1}
            >
              Выбрать
            </Button>
            <Text type="secondary">
              Показано: {filteredOffers.length} из {offers.length}
            </Text>
          </Space>
        )}

        <Table
          rowKey="id"
          size="small"
          className="op-table"
          columns={columnsOffers}
          dataSource={filteredOffers}
          pagination={false}
          scroll={{ x: 940 }}
          loading={offersLoading}
          rowClassName={offerRowClassName}
          rowSelection={
            canEditOffers || canSelect
              ? {
                  selectedRowKeys: selectedOfferKeys,
                  onChange: setSelectedOfferKeys,
                }
              : undefined
          }
          locale={{ emptyText: offersLoading ? "Загрузка..." : "Офферы пока не добавлены" }}
          title={() =>
            "Текущие офферы (галочка «Для клиента» синхронизирует статус «Предложен/Черновик»)"
          }
        />
      </Space>
    </div>
  )
}
