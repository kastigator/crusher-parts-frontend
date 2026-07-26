import React from "react"
import { Alert, Button, Card, Checkbox, Input, Select, Segmented, Space, Table, Tabs, Tag, Typography } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import RfqOverviewTabContent from "@/components/rfqWorkspace/RfqOverviewTabContent"
import SuppliersTabContent from "@/components/rfqWorkspace/SuppliersTabContent"
import ResponsesTabContent from "@/components/rfqWorkspace/ResponsesTabContent"
import CoverageTabContent from "@/components/rfqWorkspace/CoverageTabContent"
import SelectionTabContent from "@/components/rfqWorkspace/SelectionTabContent"
import ScenariosTabContent from "@/components/rfqWorkspace/ScenariosTabContent"
import LogisticsTabContent from "@/components/rfqWorkspace/LogisticsTabContent"
import EconomicsTabContent from "@/components/rfqWorkspace/EconomicsTabContent"
import WorkspaceShell from "@/components/common/WorkspaceShell"
import EntityHeader from "@/components/common/EntityHeader"
import { useNavigate } from "react-router-dom"

const { Text } = Typography

const countRows = (rows) => (Array.isArray(rows) ? rows.length : 0)

const selectionReady = (selections) =>
  (Array.isArray(selections) ? selections : []).some(
    (row) => String(row?.status || "").trim().toLowerCase() === "approved"
  )

const activeContractCount = (contracts) =>
  (Array.isArray(contracts) ? contracts : []).filter((row) =>
    ["signed", "in_execution", "completed"].includes(String(row?.status || "").trim().toLowerCase())
  ).length

const RFQ_STAGE_DEFS = [
  { key: "structure", label: "Состав RFQ", tabs: ["rfq"] },
  { key: "supplier-flow", label: "Поставщики и отправка", tabs: ["suppliers"] },
  { key: "responses-flow", label: "Ответы и покрытие", tabs: ["responses", "coverage"] },
  { key: "decision-flow", label: "Сценарии и выбор", tabs: ["scenarios", "logistics", "economics", "selection"] },
]

const RFQ_TAB_LABELS = {
  rfq: "Структура",
  suppliers: "Поставщики",
  responses: "Ответы",
  coverage: "Покрытие",
  scenarios: "Сценарии",
  logistics: "Логистика",
  economics: "Экономика",
  selection: "Выбор",
}

const RFQ_TAB_TO_STAGE = RFQ_STAGE_DEFS.reduce((acc, stage) => {
  stage.tabs.forEach((tabKey) => {
    acc[tabKey] = stage.key
  })
  return acc
}, {})

const RFQ_STAGE_BY_KEY = RFQ_STAGE_DEFS.reduce((acc, stage) => {
  acc[stage.key] = stage
  return acc
}, {})

export default function RfqWorkspaceMainContent({
  clientFilterOptions,
  filterClientId,
  setFilterClientId,
  filterRequestNumber,
  setFilterRequestNumber,
  showArchivedRfqs,
  setShowArchivedRfqs,
  filteredRfqs,
  loading,
  setActiveRfqId,
  activeRfqId,
  activeRfq,
  activeTabKey,
  setActiveTabKey,
  isStructureConfirmed,
  structure,
  activeRfqIdForTabs,
  rfqTreeData,
  openKitPreview,
  altPartsMap,
  openAltModal,
  suggestedSuppliers,
  suggestedSelection,
  setSuggestedSelection,
  renderMatchTypes,
  handleAddSuggestedSuppliers,
  supplierForm,
  handleAddSupplier,
  supplierOptions,
  setSupplierCreateOpen,
  hasAnySupplierSent,
  totalNewLines,
  suppliers,
  items,
  selectedSupplierIds,
  setSelectedSupplierIds,
  handleSupplierLanguage,
  openSelectionModal,
  dispatchSummaryMap,
  formatDate,
  supplierSendingId,
  handleSendForSupplier,
  statusToColor,
  supplierStatusLabel,
  handleSendRfq,
  sending,
  loadDocuments,
  sendIncludePriced,
  setSendIncludePriced,
  fileDispatches,
  docsLoading,
  responseSuppliers,
  responseSupplierFilter,
  setResponseSupplierFilter,
  loadResponsesAndLines,
  showArchivedResponses,
  setShowArchivedResponses,
  importModal,
  setImportModal,
  responseWorkspaceRows,
  responseLines,
  coverageRows,
  selections,
  onSelectionFinalized,
  salesQuotes,
  contracts,
  purchaseOrders,
  rfqStatusLabel,
  handleDeleteRfq,
}) {
  const navigate = useNavigate()
  const isRfqNeedsSync = String(activeRfq?.rfq_sync_status || "").toLowerCase() === "needs_sync"
  const effectiveActiveTabKey = isRfqNeedsSync && activeTabKey !== "rfq" ? "rfq" : activeTabKey
  const requestId = activeRfq?.client_request_id
  const hasApprovedSelection = selectionReady(selections)
  const quoteCount = countRows(salesQuotes)
  const contractCount = activeContractCount(contracts)
  const poCount = countRows(purchaseOrders)

  const handleTabChange = (key) => {
    if (isRfqNeedsSync && key !== "rfq") return
    setActiveTabKey(key)
  }
  const openClientRequestTab = (tab) => {
    if (!requestId) return
    navigate(`/client-request-workspace?request_id=${requestId}&tab=${tab}`)
  }
  const effectiveStageKey = RFQ_TAB_TO_STAGE[effectiveActiveTabKey] || "structure"
  const isStageDisabled = (stage) => stage.key !== "structure" && (!isStructureConfirmed || isRfqNeedsSync)
  const handleStageChange = (stageKey) => {
    const stage = RFQ_STAGE_BY_KEY[stageKey]
    if (!stage || isStageDisabled(stage)) return
    const nextTabKey = stage.tabs.includes(effectiveActiveTabKey) ? effectiveActiveTabKey : stage.tabs[0]
    handleTabChange(nextTabKey)
  }
  const tabContentByKey = {
    rfq: (
      <RfqOverviewTabContent
        structure={structure}
        activeRfqId={activeRfqIdForTabs}
        rfqTreeData={rfqTreeData}
        openKitPreview={openKitPreview}
        altPartsMap={altPartsMap}
        openAltModal={openAltModal}
      />
    ),
    suppliers: (
      <SuppliersTabContent
        suggestedSuppliers={suggestedSuppliers}
        suggestedSelection={suggestedSelection}
        setSuggestedSelection={setSuggestedSelection}
        renderMatchTypes={renderMatchTypes}
        handleAddSuggestedSuppliers={handleAddSuggestedSuppliers}
        supplierForm={supplierForm}
        handleAddSupplier={handleAddSupplier}
        supplierOptions={supplierOptions}
        setSupplierCreateOpen={setSupplierCreateOpen}
        hasAnySupplierSent={hasAnySupplierSent}
        totalNewLines={totalNewLines}
        suppliers={suppliers}
        selectedSupplierIds={selectedSupplierIds}
        setSelectedSupplierIds={setSelectedSupplierIds}
        handleSupplierLanguage={handleSupplierLanguage}
        openSelectionModal={openSelectionModal}
        dispatchSummaryMap={dispatchSummaryMap}
        formatDate={formatDate}
        supplierSendingId={supplierSendingId}
        handleSendForSupplier={handleSendForSupplier}
        statusToColor={statusToColor}
        supplierStatusLabel={supplierStatusLabel}
        handleSendRfq={handleSendRfq}
        sending={sending}
        activeRfqId={activeRfqIdForTabs}
        loadDocuments={loadDocuments}
        sendIncludePriced={sendIncludePriced}
        setSendIncludePriced={setSendIncludePriced}
        fileDispatches={fileDispatches}
        docsLoading={docsLoading}
        activeRfq={activeRfq}
      />
    ),
    responses: (
      <ResponsesTabContent
        activeRfqId={activeRfqIdForTabs}
        suppliers={suppliers}
        items={items}
        responseSuppliers={responseSuppliers}
        responseSupplierFilter={responseSupplierFilter}
        setResponseSupplierFilter={setResponseSupplierFilter}
        reloadResponses={() => loadResponsesAndLines(activeRfqIdForTabs)}
        showArchivedResponses={showArchivedResponses}
        setShowArchivedResponses={setShowArchivedResponses}
        importModal={importModal}
        setImportModal={setImportModal}
        workspaceRows={responseWorkspaceRows}
        responseLines={responseLines}
        formatDate={formatDate}
      />
    ),
    coverage: (
      <CoverageTabContent
        rfqId={activeRfqIdForTabs}
        onNavigateTab={handleTabChange}
        coverageRows={coverageRows}
        structure={structure}
        workspaceRows={responseWorkspaceRows}
        suppliers={suppliers}
      />
    ),
    scenarios: <ScenariosTabContent rfqId={activeRfqIdForTabs} />,
    logistics: (
      <LogisticsTabContent
        rfqId={activeRfqIdForTabs}
        onNavigateTab={handleTabChange}
      />
    ),
    economics: (
      <EconomicsTabContent
        rfqId={activeRfqIdForTabs}
        onNavigateTab={handleTabChange}
      />
    ),
    selection: (
      <SelectionTabContent
        rfqId={activeRfqIdForTabs}
        selections={selections}
        formatDate={formatDate}
        onSelectionFinalized={onSelectionFinalized}
      />
    ),
  }
  const renderStageContent = (stage) => {
    const leafKey = stage.tabs.includes(effectiveActiveTabKey) ? effectiveActiveTabKey : stage.tabs[0]
    return (
      <div className="rfq-stage-shell">
        {stage.tabs.length > 1 ? (
          <Segmented
            className="rfq-stage-switch"
            size="small"
            value={leafKey}
            options={stage.tabs.map((tabKey) => ({
              label: RFQ_TAB_LABELS[tabKey],
              value: tabKey,
            }))}
            onChange={(value) => handleTabChange(String(value))}
          />
        ) : null}
        <div className="rfq-stage-content">
          {tabContentByKey[leafKey]}
        </div>
      </div>
    )
  }
  const rfqColumns = [
    {
      title: "RFQ",
      width: 420,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <span>{record.rfq_number || `RFQ-${record.id}`}</span>
          <span style={{ color: "#8c8c8c" }}>
            {record.client_name || "Клиент"} · {record.client_request_number || record.client_reference || `#${record.client_request_id}`}
          </span>
          {String(record.rfq_sync_status || "").toLowerCase() === "needs_sync" ? (
            <Tag color="orange" style={{ width: "fit-content" }}>Требует синхронизации</Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Ответственный",
      dataIndex: "assigned_user_name",
      width: 170,
      render: (value, record) => (
        <Space direction="vertical" size={2}>
          <span>{value || "—"}</span>
          <span style={{ color: "#8c8c8c" }}>Rev {record.rev_number || 1}</span>
        </Space>
      ),
    },
    {
      title: "Статус",
      dataIndex: "status",
      width: 120,
      render: (value) => <Tag color={statusToColor(value)}>{rfqStatusLabel(value)}</Tag>,
    },
    {
      title: "Создано",
      dataIndex: "created_at",
      width: 120,
      render: formatDate,
    },
  ]

  return (
    <WorkspaceShell
      mode="stacked"
      listWidth={400}
      listPane={(
        <Card size="small" title={`RFQ список (${filteredRfqs.length})`}>
          <Space wrap align="center" style={{ marginBottom: 12 }}>
            <Select
              style={{ width: 220 }}
              options={clientFilterOptions}
              placeholder="Фильтр по клиенту"
              allowClear
              showSearch
              optionFilterProp="label"
              value={filterClientId || undefined}
              onChange={(value) => setFilterClientId(value || null)}
            />
            <Input
              style={{ width: 220 }}
              placeholder="Номер заявки / RFQ"
              allowClear
              value={filterRequestNumber}
              onChange={(event) => setFilterRequestNumber(event.target.value)}
            />
            <Checkbox
              checked={showArchivedRfqs}
              onChange={(event) => setShowArchivedRfqs(event.target.checked)}
            >
              Показывать архивные
            </Checkbox>
          </Space>
          <Table
            rowKey="id"
            columns={rfqColumns}
            dataSource={filteredRfqs}
            loading={loading}
            size="small"
            pagination={{ pageSize: 6, size: "small", showSizeChanger: false }}
            scroll={{ x: 820, y: 280 }}
            onRow={(record) => ({
              onClick: () => setActiveRfqId(record.id),
            })}
            rowClassName={(record) =>
              Number(record.id) === Number(activeRfqId) ? "ant-table-row-selected" : ""
            }
          />
        </Card>
      )}
      detailPane={
        activeRfq ? (
          <Card size="small">
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <EntityHeader
                title={activeRfq.rfq_number || `RFQ-${activeRfq.id}`}
                status={
                  <Tag color={statusToColor(activeRfq.status)} style={{ marginInlineEnd: 0 }}>
                    {rfqStatusLabel(activeRfq.status)}
                  </Tag>
                }
                meta={[
                  activeRfq.client_name || "Клиент",
                  `Rev ${activeRfq.rev_number || "-"}`,
                  isRfqNeedsSync ? "Новая ревизия заявки не синхронизирована" : null,
                  activeRfq.client_request_number
                    ? `Заявка: ${activeRfq.client_request_number}`
                    : activeRfq.client_reference
                      ? `Референс: ${activeRfq.client_reference}`
                      : null,
                ]}
                secondaryActions={(
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteRfq(activeRfq.id)}
                  >
                    Удалить RFQ
                  </Button>
                )}
              />

              {isRfqNeedsSync ? (
                <Alert
                  type="warning"
                  showIcon
                  message="RFQ не синхронизирован с текущей ревизией заявки"
                  description="Отправка поставщикам, ответы, покрытие, сценарии и выбор временно закрыты, чтобы не продолжить старый состав. Откройте заявку клиента и выполните «Синхронизировать RFQ»."
                />
              ) : null}

              <div className="workspace-handoff-panel">
                <div className="workspace-handoff-panel__main">
                  <Text strong>Граница ответственности RFQ</Text>
                  <Text type="secondary">
                    Здесь закупка собирает ответы, покрытие, логистику, экономику и утверждает выбор.
                    Расчет КП, контракт, PO и исполнение ведутся в заявке клиента.
                  </Text>
                  <Space wrap size={[8, 8]}>
                    <Tag color={hasApprovedSelection ? "green" : "default"}>
                      Выбор: {hasApprovedSelection ? "утвержден" : "не утвержден"}
                    </Tag>
                    <Tag>КП: {quoteCount}</Tag>
                    <Tag>Контракты: {contractCount}</Tag>
                    <Tag>PO: {poCount}</Tag>
                  </Space>
                </div>
                <Space wrap className="workspace-handoff-panel__actions">
                  <Button
                    size="small"
                    type={hasApprovedSelection ? "primary" : "default"}
                    disabled={!requestId}
                    onClick={() => openClientRequestTab("commercial")}
                  >
                    Открыть расчет в заявке
                  </Button>
                  <Button
                    size="small"
                    disabled={!requestId}
                    onClick={() => openClientRequestTab("execution")}
                  >
                    Исполнение
                  </Button>
                </Space>
              </div>

              <Tabs
                activeKey={effectiveStageKey}
                onChange={handleStageChange}
                size="small"
                items={RFQ_STAGE_DEFS.map((stage) => ({
                  key: stage.key,
                  label: stage.label,
                  disabled: isStageDisabled(stage),
                  children: renderStageContent(stage),
                }))}
              />
            </Space>
          </Card>
        ) : (
          <Card size="small" title="Рабочая зона RFQ">
            <Text type="secondary">Выберите RFQ для просмотра рабочего пространства.</Text>
          </Card>
        )
      }
    />
  )
}
