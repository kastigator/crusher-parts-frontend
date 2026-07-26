import React from "react"
import {
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
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from "antd"
import { CloseOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import RequestCommercialFlowTabContent from "@/components/clientRequests/RequestCommercialFlowTabContent"
import RequestExecutionTabContent from "@/components/clientRequests/RequestExecutionTabContent"
import RequestSummaryTabContent from "@/components/clientRequests/RequestSummaryTabContent"
import EntityHeader from "@/components/common/EntityHeader"
import WorkspaceProgress from "@/components/common/WorkspaceProgress"
import { useNavigate } from "react-router-dom"

const { Text } = Typography

const commercialStageByLegacyWorkspaceTab = {
  margin: "pricing",
  quote: "quote",
  contract: "contract",
}

const hasReached = (status, keys) => keys.includes(String(status || ""))

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
  equipmentUnitOptions,
  selectedEquipmentUnitId,
  setSelectedEquipmentUnitId,
  selectedEquipmentUnitLabel,
  handleDeleteRequest,
  cardless = false,
}) {
  const navigate = useNavigate()

  if (!activeRequest) {
    const emptyState = cardless ? (
      <Text type="secondary">Выберите заявку в списке, чтобы открыть workspace.</Text>
    ) : (
      <Card title="Рабочая зона" size="small">
        <Text type="secondary">Выберите заявку в списке, чтобы открыть workspace.</Text>
      </Card>
    )
    return emptyState
  }

  const activeWorkspaceTabKey = commercialStageByLegacyWorkspaceTab[workspaceTabKey] ? "commercial" : workspaceTabKey
  const requestStatusLabel =
    statusOptions.find((opt) => opt.value === activeRequest?.status)?.label ||
    activeRequest?.status ||
    "—"
  const rfqReady = !!activeRequest?.rfq_id && rfqSyncStatus !== "needs_sync"
  const responsesReady = hasReached(activeRequest?.status, [
    "responses_received",
    "selection_done",
    "quote_prepared",
    "contracted",
  ])
  const selectionReady = hasReached(activeRequest?.status, [
    "selection_done",
    "quote_prepared",
    "contracted",
  ])
  const quoteReady = hasReached(activeRequest?.status, ["quote_prepared", "contracted"])
  const contractReady = activeRequest?.status === "contracted"
  const openWorkspaceTab = (key) => setWorkspaceTabKey(key)
  const nextAction = (() => {
    if (!isLatestRevision) {
      return {
        label: "Открыть текущую ревизию",
        description: "Сейчас открыта архивная ревизия: правки, RFQ, КП и исполнение ведутся по текущей ревизии.",
        disabled: true,
      }
    }
    if (rfqSyncStatus === "needs_sync") {
      return {
        label: "Синхронизировать RFQ",
        description: "Сначала обновляем RFQ под текущий состав заявки, потом закупка продолжает ответы и выбор.",
        onClick: handleSyncRfq,
      }
    }
    if (!isSentToProcurement) {
      return {
        label: "Отправить заявку",
        description: "Проверьте позиции и передайте заявку в закупку, чтобы появился закупочный RFQ.",
        onClick: canRelease && !isReleasedLocked ? handleReleaseRequest : undefined,
        disabled: !canRelease || isReleasedLocked,
      }
    }
    if (!selectionReady) {
      return {
        label: "Открыть RFQ",
        description: responsesReady
          ? "Ответы есть, следующий рабочий шаг — собрать и утвердить выбор закупки."
          : "Закупка собирает поставщиков, ответы, покрытие и экономику до утвержденного выбора.",
        onClick: () => navigate(`/rfq-workspace?rfq=${activeRequest.rfq_id || ""}`),
        disabled: !activeRequest?.rfq_id,
      }
    }
    if (!quoteReady) {
      return {
        label: "Рассчитать КП",
        description: "Закупочная база утверждена, теперь продавец считает продажную цену и готовит КП клиенту.",
        onClick: () => openWorkspaceTab("commercial"),
      }
    }
    if (!contractReady) {
      return {
        label: "Оформить контракт",
        description: "КП подготовлено или согласовано, следующий шаг — зафиксировать коммерческий контур контрактом.",
        onClick: () => openWorkspaceTab("contract"),
      }
    }
    return {
      label: "Открыть исполнение",
      description: "Контракт зафиксирован: работаем с PO, резервами, приемками и складским покрытием.",
      onClick: () => openWorkspaceTab("execution"),
    }
  })()

  const content = (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <EntityHeader
          title={activeRequest?.internal_number || "Заявка клиента"}
          status={
            activeRequest?.status ? (
              <Tag color={statusColors[activeRequest.status] || "default"} style={{ marginInlineEnd: 0 }}>
                {statusOptions.find((opt) => opt.value === activeRequest.status)?.label ||
                  activeRequest.status}
              </Tag>
            ) : null
          }
          meta={[
            `Клиент: ${activeRequest?.client_name || "—"}`,
            selectedEquipmentUnitLabel ? `Оборудование: ${selectedEquipmentUnitLabel}` : null,
            `${activeRevisionLabel} (${activeRevisionDate})`,
            isSentToProcurement ? "Заявка отправлена в закупку" : null,
            rfqSyncStatus === "needs_sync" ? "RFQ требует синхронизации" : null,
            isReleasedLocked ? "Редактирование временно ограничено" : null,
          ]}
          primaryActions={
            canRelease && !isReleasedLocked && !isSentToProcurement ? (
              <Button type="primary" onClick={handleReleaseRequest}>
                Отправить заявку
              </Button>
            ) : null
          }
          secondaryActions={
            <Space>
              {rfqSyncStatus === "needs_sync" ? (
                <Button onClick={handleSyncRfq}>Синхронизировать RFQ</Button>
              ) : null}
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteRequest?.(activeRequest?.id)}
              >
                Удалить заявку
              </Button>
            </Space>
          }
        />

        <div className="workspace-process-strip">
          <WorkspaceProgress
            current={getStatusStepIndex(activeRequest?.status)}
            completed={getStatusStepIndex(activeRequest?.status)}
            items={statusSteps.map((step) => ({
              label: step.title,
              shortLabel: step.title,
            }))}
          />
        </div>

        <div className="workspace-next-panel">
          <div className="workspace-next-panel__body">
            <Text type="secondary">Сейчас</Text>
            <div className="workspace-next-panel__title">{requestStatusLabel}</div>
            <Text type="secondary">{nextAction.description}</Text>
            <Space wrap size={[8, 8]} style={{ marginTop: 10 }}>
              <Tag color={isLatestRevision ? "green" : "orange"}>
                {isLatestRevision ? "Текущая ревизия" : "Архивная ревизия"}
              </Tag>
              <Tag color={isSentToProcurement ? "green" : "default"}>
                {isSentToProcurement ? "В закупке" : "До закупки"}
              </Tag>
              <Tag color={rfqReady ? "green" : activeRequest?.rfq_id ? "orange" : "default"}>
                {rfqReady ? "RFQ синхронизирован" : activeRequest?.rfq_id ? "RFQ требует синхронизации" : "RFQ еще нет"}
              </Tag>
              <Tag color={responsesReady ? "green" : "default"}>Ответы</Tag>
              <Tag color={selectionReady ? "green" : "default"}>Выбор</Tag>
              <Tag color={quoteReady ? "green" : "default"}>КП</Tag>
              <Tag color={contractReady ? "green" : "default"}>Контракт</Tag>
            </Space>
          </div>
          <div className="workspace-next-panel__action">
            <Text type="secondary">Следующее действие</Text>
            <Button
              type="primary"
              disabled={nextAction.disabled || !nextAction.onClick}
              onClick={nextAction.onClick}
            >
              {nextAction.label}
            </Button>
          </div>
        </div>

        <Tabs
          activeKey={activeWorkspaceTabKey}
          onChange={setWorkspaceTabKey}
          size="small"
          items={[
            {
              key: "summary",
              label: "Сводка",
              children: (
                <RequestSummaryTabContent
                  requestId={activeRequest?.id}
                  onOpenTab={setWorkspaceTabKey}
                />
              ),
            },
            {
              key: "items",
              label: "Позиции",
              children: (
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <div className="workspace-toolbar workspace-toolbar--split">
                    <div className="workspace-toolbar__group workspace-toolbar__group--meta">
                      <Text type="secondary">Работа ведётся в активной ревизии заявки.</Text>
                      <Space size="small" wrap>
                        <Tag color={isLatestRevision ? "green" : "orange"}>{activeRevisionLabel}</Tag>
                        {changeDraftActive ? <Tag color="blue">Черновик изменений</Tag> : null}
                        {!isLatestRevision ? (
                          <Text type="warning">
                            Архивная ревизия: редактирование отключено.
                          </Text>
                        ) : null}
                      </Space>
                    </div>
                    <div className="workspace-toolbar__group workspace-toolbar__group--actions">
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
                    </div>
                  </div>

                  <div className="workspace-controls-panel">
                    <div className="workspace-controls-panel__hint">
                      <Text type="secondary">
                        Быстрое добавление и массовые изменения доступны ниже.
                      </Text>
                    </div>
                    <Space wrap align="center" style={{ width: "100%" }}>
                    <Select
                      style={{ width: 340 }}
                      placeholder="Контекст оборудования"
                      options={equipmentUnitOptions}
                      showSearch
                      optionFilterProp="label"
                      allowClear
                      value={selectedEquipmentUnitId || undefined}
                      onChange={(value) => setSelectedEquipmentUnitId(value || null)}
                    />
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
                  </div>

                  {bulkMode && (
                    <div className="workspace-inline-banner">
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
                    </div>
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
                      <Form.Item
                        label="Контекст оборудования"
                        tooltip="Используется для фильтрации OEM-подбора и автоподстановки модели в новые строки заявки."
                      >
                        <Select
                          style={{ width: 320 }}
                          options={equipmentUnitOptions}
                          showSearch
                          optionFilterProp="label"
                          allowClear
                          value={selectedEquipmentUnitId || undefined}
                          onChange={(value) => setSelectedEquipmentUnitId(value || null)}
                        />
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
              key: "commercial",
              label: "Расчет и КП",
              children: (
                <RequestCommercialFlowTabContent
                  requestId={activeRequest?.id}
                  activeRevisionId={activeRevisionId}
                  initialStage={commercialStageByLegacyWorkspaceTab[workspaceTabKey] || "pricing"}
                />
              ),
            },
            {
              key: "execution",
              label: "Исполнение",
              children: <RequestExecutionTabContent requestId={activeRequest?.id} />,
            },
          ]}
        />
      </Space>
    </>
  )

  if (cardless) return content

  return (
    <Card title="Рабочая зона" size="small">
      {content}
    </Card>
  )
}
