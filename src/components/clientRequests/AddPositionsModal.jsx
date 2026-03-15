import React from "react"
import { AutoComplete, Button, Card, Checkbox, Input, InputNumber, Modal, Select, Space, Table, Typography } from "antd"

const { Text } = Typography

export default function AddPositionsModal({
  open,
  onCancel,
  modalResults,
  formatPartLabel,
  modalSearch,
  setModalSearch,
  modalSelectedPart,
  setModalSelectedPart,
  modalLoading,
  handleModalGlobalAdd,
  modalQty,
  setModalQty,
  modalOemOnly,
  setModalOemOnly,
  manufacturerOptions,
  manufacturerId,
  setManufacturerId,
  modelOptions,
  modelId,
  setModelId,
  catalogSearch,
  setCatalogSearch,
  frequentParts,
  frequentLoading,
  handleAddFromCatalog,
  handleAddSelectedFromCatalog,
  catalogSelection,
  catalogAddLoading,
  setCatalogSelection,
  catalogResults,
  catalogLoading,
  catalogRowInputs,
  setCatalogRowInputs,
  equipmentContextLabel,
}) {
  return (
    <Modal
      title="Добавить позиции"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={1060}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Text type="secondary">
            Можно искать по каталожному номеру сразу или уточнять через производителя и модель.
          </Text>
          {equipmentContextLabel ? (
            <Text type="secondary">Текущий equipment context: {equipmentContextLabel}</Text>
          ) : null}
          <Space wrap align="center">
            <AutoComplete
              style={{ width: 360 }}
              options={modalResults.map((part) => ({
                value:
                  part.cat_number ||
                  part.description_ru ||
                  part.description_en ||
                  "",
                label: formatPartLabel(part),
                part,
              }))}
              value={modalSearch}
              onChange={(value) => {
                setModalSearch(value)
                if (modalSelectedPart?.cat_number !== value) {
                  setModalSelectedPart(null)
                }
              }}
              onSelect={(value, option) => {
                setModalSearch(value)
                setModalSelectedPart(option.part || null)
              }}
              placeholder="Глобальный поиск по OEM деталям"
              notFoundContent={modalLoading ? "Поиск..." : "Нет совпадений"}
            >
              <Input
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    handleModalGlobalAdd()
                  }
                }}
              />
            </AutoComplete>
            <InputNumber
              min={1}
              value={modalQty}
              onChange={(value) => setModalQty(value || 1)}
              style={{ width: 110 }}
              placeholder="Кол-во"
            />
            <Checkbox
              checked={modalOemOnly}
              onChange={(event) => setModalOemOnly(event.target.checked)}
            >
              OEM
            </Checkbox>
            <Button type="primary" onClick={handleModalGlobalAdd}>
              Добавить
            </Button>
          </Space>
          <Space wrap>
            <Select
              style={{ width: 220 }}
              options={manufacturerOptions}
              placeholder="Производитель"
              allowClear
              showSearch
              optionFilterProp="label"
              value={manufacturerId || undefined}
              onChange={(value) => setManufacturerId(value || null)}
            />
            <Select
              style={{ width: 240 }}
              options={modelOptions}
              placeholder="Модель"
              allowClear
              showSearch
              optionFilterProp="label"
              disabled={!manufacturerId}
              value={modelId || undefined}
              onChange={(value) => setModelId(value || null)}
            />
            <Input.Search
              style={{ minWidth: 260 }}
              placeholder="Каталожный номер или описание"
              allowClear
              value={catalogSearch}
              onSearch={(value) => setCatalogSearch(value)}
              onChange={(e) => setCatalogSearch(e.target.value)}
            />
          </Space>
          {catalogSearch && catalogSearch.length < 2 ? (
            <Text type="secondary">
              Введите минимум 2 символа для фильтра, сейчас показан полный список.
            </Text>
          ) : null}
          <Card size="small" title="Часто используемые">
            {frequentParts.length ? (
              <Space wrap>
                {frequentParts.map((part) => (
                  <Button
                    key={part.id}
                    size="small"
                    onClick={() => handleAddFromCatalog(part)}
                  >
                    {part.cat_number || "Без номера"}{" "}
                    {part.model_name ? `• ${part.model_name}` : ""}
                  </Button>
                ))}
              </Space>
            ) : (
              <Text type="secondary">
                {frequentLoading
                  ? "Загрузка..."
                  : "Пока нет часто используемых деталей."}
              </Text>
            )}
          </Card>
          <Space
            align="center"
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <Text type="secondary">
              {catalogSearch && catalogSearch.length >= 2
                ? "Результаты поиска"
                : modelId
                  ? "Детали, подходящие выбранной технике"
                  : "Все детали выбранной модели"}
            </Text>
            <Space>
              <Button
                onClick={handleAddSelectedFromCatalog}
                disabled={!catalogSelection.length || catalogAddLoading}
                loading={catalogAddLoading}
              >
                Добавить выбранные ({catalogSelection.length})
              </Button>
              <Button
                onClick={() => setCatalogSelection([])}
                disabled={!catalogSelection.length}
              >
                Снять выбор
              </Button>
            </Space>
          </Space>
          <Table
            rowKey="id"
            size="small"
            dataSource={catalogResults}
            loading={catalogLoading}
            rowSelection={{
              selectedRowKeys: catalogSelection,
              onChange: setCatalogSelection,
            }}
            pagination={{ pageSize: 8, showSizeChanger: true }}
            locale={{
              emptyText: !modelId
                ? "Сначала выберите производителя и модель"
                : "Нет данных по этой модели",
            }}
            columns={[
              {
                title: "Кат. номер",
                dataIndex: "cat_number",
                width: 160,
              },
              {
                title: "Описание",
                render: (_, row) =>
                  row.description_ru || row.description_en || "—",
              },
              {
                title: "Применяемость",
                width: 170,
                render: (_, row) =>
                  equipmentContextLabel ? (
                    <Tag color="green">Подходит выбранной технике</Tag>
                  ) : Number(row.fitments_count || 0) > 0 ? (
                    <Tag color="blue">{row.fitments_count} связей</Tag>
                  ) : (
                    <Tag>Нет связей</Tag>
                  ),
              },
              {
                title: "Кол-во",
                width: 110,
                render: (_, row) => (
                  <InputNumber
                    min={1}
                    value={catalogRowInputs[row.id]?.qty || 1}
                    onChange={(value) =>
                      setCatalogRowInputs((prev) => ({
                        ...prev,
                        [row.id]: {
                          ...(prev[row.id] || {}),
                          qty: value || 1,
                        },
                      }))
                    }
                    style={{ width: 90 }}
                  />
                ),
              },
              {
                title: "OEM",
                width: 90,
                render: (_, row) => (
                  <Checkbox
                    checked={!!catalogRowInputs[row.id]?.oem_only}
                    onChange={(event) =>
                      setCatalogRowInputs((prev) => ({
                        ...prev,
                        [row.id]: {
                          ...(prev[row.id] || {}),
                          oem_only: event.target.checked,
                        },
                      }))
                    }
                  >
                    OEM
                  </Checkbox>
                ),
              },
              {
                title: "",
                width: 110,
                render: (_, row) => (
                  <Button
                    size="small"
                    onClick={() => handleAddFromCatalog(row)}
                    loading={catalogAddLoading}
                  >
                    Добавить
                  </Button>
                ),
              },
            ]}
          />
        </Space>

      </Space>
    </Modal>
  )
}
