import React from "react"
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Checkbox,
  Collapse,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Steps,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from "antd"
import { CloseOutlined, EditOutlined, SaveOutlined } from "@ant-design/icons"
import dayjs from "dayjs"

const { Text } = Typography

export default function ClientRequestWorkspaceCard({
  activeRequest,
  statusColors,
  statusOptions,
  canRelease,
  isReleasedLocked,
  isSentToProcurement,
  rfqSyncStatus,
  handleReleaseRequest,
  handleSyncRfq,
  getStatusStepIndex,
  statusSteps,
  workspaceTabKey,
  setWorkspaceTabKey,
  isLatestRevision,
  activeRevisionLabel,
  activeRevisionDate,
  changeDraftActive,
  revisionOptions,
  activeRevisionId,
  revisions,
  handleSelectRevision,
  commitChangeDraft,
  hasDraftChanges,
  cancelChangeDraft,
  createRevisionAndEnterEdit,
  openImportModal,
  bulkMode,
  setBulkMode,
  setBulkSelectedKeys,
  setBulkSelectedRows,
  setBulkEdits,
  quickResults,
  formatPartLabel,
  quickSearch,
  setQuickSearch,
  quickSelectedPart,
  setQuickSelectedPart,
  quickLoading,
  handleQuickAdd,
  quickQty,
  setQuickQty,
  quickOemOnly,
  setQuickOemOnly,
  setAddModalOpen,
  hasBulkSelection,
  hasBulkEditsForSelected,
  applyBulkUpdate,
  applyBulkDelete,
  itemsColumns,
  items,
  itemsLoading,
  bulkSelectedKeys,
  revisionTimelineItems,
  revisionColumns,
  revisionsLoading,
  requestEditing,
  setRequestEditing,
  requestForm,
  handleUpdateRequest,
  clientOptions,
  sourceOptions,
  userOptions,
  contactOptions,
  contactDropdownOpen,
  setContactDropdownOpen,
  loadContacts,
}) {
  if (!activeRequest) {
    return (
      <Card title="Рабочая зона" size="small">
        <Text type="secondary">Выберите заявку в списке, чтобы открыть workspace.</Text>
      </Card>
    )
  }

  return (
    <Card title="Рабочая зона" size="small">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space wrap align="center" style={{ justifyContent: "space-between" }}>
          <Space wrap align="center">
            <Text strong>{activeRequest?.internal_number || "Заявка клиента"}</Text>
            {activeRequest?.status ? (
              <Tag color={statusColors[activeRequest.status] || "default"}>
                {statusOptions.find((opt) => opt.value === activeRequest.status)?.label ||
                  activeRequest.status}
              </Tag>
            ) : null}
            <Text type="secondary">Клиент: {activeRequest?.client_name || "—"}</Text>
            <Text type="secondary">
              {activeRevisionLabel} ({activeRevisionDate})
            </Text>
            {isSentToProcurement ? <Tag color="green">Заявка отправлена в закупку</Tag> : null}
            {rfqSyncStatus === "needs_sync" ? (
              <Tag color="orange">RFQ требует синхронизации</Tag>
            ) : null}
            {isReleasedLocked ? (
              <Tag color="orange">Редактирование временно ограничено</Tag>
            ) : null}
          </Space>
          <Space>
            {canRelease && !isReleasedLocked && !isSentToProcurement ? (
              <Button type="primary" onClick={handleReleaseRequest}>
                Отправить заявку
              </Button>
            ) : null}
            {rfqSyncStatus === "needs_sync" ? (
              <Button onClick={handleSyncRfq}>Синхронизировать RFQ</Button>
            ) : null}
          </Space>
        </Space>

        <Steps
          size="small"
          current={getStatusStepIndex(activeRequest?.status)}
          items={statusSteps.map((step) => ({ title: step.title }))}
        />

        <Tabs
          activeKey={workspaceTabKey}
          onChange={setWorkspaceTabKey}
          items={[
            {
              key: "items",
              label: "Позиции",
              children: (
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <Space
                    align="center"
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <Space direction="vertical" size={4}>
                      <Text type="secondary">
                        Быстрое добавление: строка ниже. Импорт из Excel справа.
                      </Text>
                      <Space size="small">
                        <Tag color={isLatestRevision ? "green" : "orange"}>{activeRevisionLabel}</Tag>
                        {changeDraftActive && <Tag color="blue">Черновик изменений</Tag>}
                        {!isLatestRevision && (
                          <Text type="warning">
                            Просмотр архивной ревизии: редактирование отключено.
                          </Text>
                        )}
                      </Space>
                    </Space>
                    <Space>
                      <Select
                        style={{ width: 240 }}
                        placeholder="Ревизия"
                        options={revisionOptions}
                        value={activeRevisionId || undefined}
                        onChange={handleSelectRevision}
                        disabled={!revisions.length || changeDraftActive}
                      />
                      {changeDraftActive ? (
                        <>
                          <Button
                            type="primary"
                            onClick={commitChangeDraft}
                            disabled={!hasDraftChanges}
                          >
                            Завершить ревизию
                          </Button>
                          <Button onClick={cancelChangeDraft}>Отменить ревизию</Button>
                        </>
                      ) : (
                        <Button
                          type="primary"
                          onClick={() => createRevisionAndEnterEdit()}
                          disabled={!isLatestRevision}
                        >
                          Создать ревизию
                        </Button>
                      )}
                      <Button onClick={openImportModal} disabled={!isLatestRevision}>
                        Импорт из Excel
                      </Button>
                    </Space>
                  </Space>

                  <Space wrap align="center" style={{ width: "100%" }}>
                    <Switch
                      checked={bulkMode}
                      onChange={(checked) => {
                        setBulkMode(checked)
                        if (!checked) {
                          setBulkSelectedKeys([])
                          setBulkSelectedRows([])
                          setBulkEdits({})
                        }
                      }}
                      disabled={!changeDraftActive}
                    />
                    <Text type="secondary">Массовое редактирование</Text>
                    <AutoComplete
                      style={{ minWidth: 420, maxWidth: "100%" }}
                      options={quickResults.map((part) => ({
                        value:
                          part.cat_number || part.description_ru || part.description_en || "",
                        label: formatPartLabel(part),
                        part,
                      }))}
                      value={quickSearch}
                      onChange={(value) => {
                        setQuickSearch(value)
                        if (quickSelectedPart?.cat_number !== value) {
                          setQuickSelectedPart(null)
                        }
                      }}
                      onSelect={(value, option) => {
                        setQuickSearch(value)
                        setQuickSelectedPart(option.part || null)
                      }}
                      placeholder="Быстрое добавление: введите кат. номер"
                      notFoundContent={quickLoading ? "Поиск..." : "Нет совпадений"}
                    >
                      <Input
                        style={{ width: "100%" }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            handleQuickAdd()
                          }
                        }}
                      />
                    </AutoComplete>
                    <InputNumber
                      min={1}
                      value={quickQty}
                      onChange={(value) => setQuickQty(value || 1)}
                      style={{ width: 100 }}
                      placeholder="Кол-во"
                    />
                    <Checkbox
                      checked={quickOemOnly}
                      onChange={(event) => setQuickOemOnly(event.target.checked)}
                    >
                      OEM
                    </Checkbox>
                    <Button
                      type="primary"
                      onClick={handleQuickAdd}
                      disabled={!quickSearch.trim()}
                    >
                      Добавить
                    </Button>
                    <Button type="link" onClick={() => setAddModalOpen(true)}>
                      Расширенный поиск
                    </Button>
                  </Space>

                  {bulkMode && (
                    <Space wrap align="center" style={{ width: "100%" }}>
                      <Text type="secondary">
                        Массовые действия применяются только к выбранным строкам.
                      </Text>
                      {hasBulkSelection && hasBulkEditsForSelected ? (
                        <Button onClick={applyBulkUpdate}>Применить к выбранным</Button>
                      ) : null}
                      {hasBulkSelection ? (
                        <Button danger onClick={applyBulkDelete}>
                          Удалить выбранные
                        </Button>
                      ) : null}
                    </Space>
                  )}

                  <Table
                    rowKey="id"
                    columns={itemsColumns}
                    dataSource={items}
                    loading={itemsLoading}
                    pagination={false}
                    rowSelection={
                      bulkMode
                        ? {
                            selectedRowKeys: bulkSelectedKeys,
                            onChange: (keys, rows) => {
                              setBulkSelectedKeys(keys)
                              setBulkSelectedRows(rows)
                              setBulkEdits((prev) => {
                                const next = { ...prev }
                                const allowed = new Set(
                                  rows
                                    .map((r) => r.line_number)
                                    .filter((v) => v !== null && v !== undefined),
                                )
                                rows.forEach((row) => {
                                  if (
                                    row.line_number === null ||
                                    row.line_number === undefined
                                  ) {
                                    return
                                  }
                                  if (!next[row.line_number]) {
                                    next[row.line_number] = {
                                      requested_qty: row.requested_qty,
                                      oem_only: !!row.oem_only,
                                    }
                                  }
                                })
                                Object.keys(next).forEach((key) => {
                                  if (!allowed.has(Number(key))) delete next[key]
                                })
                                return next
                              })
                            },
                          }
                        : undefined
                    }
                  />

                  <Collapse
                    items={[
                      {
                        key: "revision-history",
                        label: `История ревизий (${revisions.length})`,
                        children: (
                          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                            {revisionTimelineItems.length ? (
                              <Timeline items={revisionTimelineItems} />
                            ) : (
                              <Text type="secondary">Ревизий пока нет.</Text>
                            )}
                            <Table
                              rowKey="id"
                              columns={revisionColumns}
                              dataSource={revisions}
                              loading={revisionsLoading}
                              pagination={false}
                              onRow={(record) => ({
                                onClick: async () => {
                                  await handleSelectRevision(record.id)
                                },
                              })}
                              rowClassName={(record) =>
                                record.id === activeRevisionId ? "ant-table-row-selected" : ""
                              }
                            />
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Space>
              ),
            },
            {
              key: "details",
              label: "Данные заявки",
              children: (
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                    {requestEditing ? (
                      <>
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          onClick={() => requestForm.submit()}
                        >
                          Сохранить
                        </Button>
                        <Button
                          icon={<CloseOutlined />}
                          onClick={() => {
                            setRequestEditing(false)
                            requestForm.setFieldsValue({
                              client_id: activeRequest?.client_id,
                              source_type: activeRequest?.source_type || null,
                              assigned_to_user_id:
                                activeRequest?.assigned_to_user_id || null,
                              internal_number: activeRequest?.internal_number || null,
                              client_reference: activeRequest?.client_reference || null,
                              contact_name: activeRequest?.contact_name || null,
                              contact_email: activeRequest?.contact_email || null,
                              contact_phone: activeRequest?.contact_phone || null,
                              comment_internal: activeRequest?.comment_internal || null,
                              comment_client: activeRequest?.comment_client || null,
                              received_at: activeRequest?.received_at
                                ? dayjs(activeRequest.received_at)
                                : null,
                              processing_deadline: activeRequest?.processing_deadline
                                ? dayjs(activeRequest.processing_deadline)
                                : null,
                            })
                          }}
                        >
                          Отмена
                        </Button>
                      </>
                    ) : (
                      <Button
                        icon={<EditOutlined />}
                        disabled={isReleasedLocked}
                        onClick={() => setRequestEditing(true)}
                      >
                        Редактировать
                      </Button>
                    )}
                  </Space>

                  <Form form={requestForm} layout="vertical" onFinish={handleUpdateRequest}>
                    <Space wrap align="start">
                      <Form.Item label="Клиент" name="client_id">
                        <Select
                          style={{ width: 260 }}
                          options={clientOptions}
                          showSearch
                          optionFilterProp="label"
                          disabled
                        />
                      </Form.Item>
                      <Form.Item label="Внутренний номер" name="internal_number">
                        <Input style={{ width: 180 }} disabled={!requestEditing} />
                      </Form.Item>
                      <Form.Item label="Источник" name="source_type">
                        <Select
                          style={{ width: 160 }}
                          options={sourceOptions}
                          disabled={!requestEditing}
                        />
                      </Form.Item>
                      <Form.Item label="Ответственный" name="assigned_to_user_id">
                        <Select
                          style={{ width: 200 }}
                          options={userOptions}
                          showSearch
                          optionFilterProp="label"
                          allowClear
                          disabled={!requestEditing}
                        />
                      </Form.Item>
                      <Form.Item label="Референс клиента" name="client_reference">
                        <Input style={{ width: 220 }} disabled={!requestEditing} />
                      </Form.Item>
                      <Form.Item label="Дата получения" name="received_at">
                        <DatePicker
                          style={{ width: 200 }}
                          format="DD.MM.YYYY"
                          disabled={!requestEditing}
                        />
                      </Form.Item>
                      <Form.Item label="Дедлайн обработки" name="processing_deadline">
                        <DatePicker
                          style={{ width: 200 }}
                          format="DD.MM.YYYY"
                          disabled={!requestEditing}
                        />
                      </Form.Item>
                      <Form.Item label="Контакт" name="contact_name">
                        {requestEditing ? (
                          <AutoComplete
                            style={{ width: 200 }}
                            options={contactOptions}
                            placeholder="Выберите или введите"
                            filterOption={false}
                            open={contactDropdownOpen}
                            onFocus={() => {
                              setContactDropdownOpen(true)
                              if (activeRequest?.client_id) {
                                loadContacts(activeRequest.client_id, false)
                              }
                            }}
                            onBlur={() => setContactDropdownOpen(false)}
                            onSelect={(_, option) => {
                              setContactDropdownOpen(false)
                              if (option?.email || option?.phone) {
                                requestForm.setFieldsValue({
                                  contact_name: option.value || "",
                                  contact_email: option.email || "",
                                  contact_phone: option.phone || "",
                                })
                              }
                            }}
                            onChange={(value) => {
                              const match = contactOptions.find(
                                (opt) => opt.value === value,
                              )
                              if (!match) {
                                requestForm.setFieldsValue({
                                  contact_email: "",
                                  contact_phone: "",
                                })
                              }
                            }}
                          >
                            <Input />
                          </AutoComplete>
                        ) : (
                          <Input style={{ width: 200 }} disabled />
                        )}
                      </Form.Item>
                      <Form.Item label="E-mail" name="contact_email">
                        <Input style={{ width: 200 }} disabled={!requestEditing} />
                      </Form.Item>
                      <Form.Item label="Телефон" name="contact_phone">
                        <Input style={{ width: 180 }} disabled={!requestEditing} />
                      </Form.Item>
                    </Space>
                    <Space wrap align="start">
                      <Form.Item label="Комментарий (внутр.)" name="comment_internal">
                        <Input.TextArea
                          style={{ width: 320 }}
                          rows={2}
                          disabled={!requestEditing}
                        />
                      </Form.Item>
                      <Form.Item label="Комментарий клиента" name="comment_client">
                        <Input.TextArea
                          style={{ width: 320 }}
                          rows={2}
                          disabled={!requestEditing}
                        />
                      </Form.Item>
                    </Space>
                  </Form>
                </Space>
              ),
            },
            {
              key: "margin",
              label: "Маржа/Экономика",
              children: (
                <Alert
                  type="info"
                  message="Раздел в разработке"
                  description="Тут будет блок расчета маржи и экономики после работы закупщика."
                  showIcon
                />
              ),
            },
            {
              key: "quote",
              label: "КП",
              children: (
                <Alert
                  type="info"
                  message="Раздел в разработке"
                  description="Тут появится подготовка коммерческого предложения."
                  showIcon
                />
              ),
            },
            {
              key: "contract",
              label: "Контракт",
              children: (
                <Alert
                  type="info"
                  message="Раздел в разработке"
                  description="Тут будет хранение и согласование контракта."
                  showIcon
                />
              ),
            },
          ]}
        />
      </Space>
    </Card>
  )
}
