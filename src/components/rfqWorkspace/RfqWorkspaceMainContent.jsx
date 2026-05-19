import React from "react"
import { Alert, Button, Card, Checkbox, Input, Select, Space, Table, Tabs, Tag, Typography } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import RfqOverviewTabContent from "@/components/rfqWorkspace/RfqOverviewTabContent"
import SuppliersTabContent from "@/components/rfqWorkspace/SuppliersTabContent"
import ResponsesTabContent from "@/components/rfqWorkspace/ResponsesTabContent"
import CoverageTabContent from "@/components/rfqWorkspace/CoverageTabContent"
import SelectionTabContent from "@/components/rfqWorkspace/SelectionTabContent"
import ScenariosTabContent from "@/components/rfqWorkspace/ScenariosTabContent"
import LogisticsTabContent from "@/components/rfqWorkspace/LogisticsTabContent"
import EconomicsTabContent from "@/components/rfqWorkspace/EconomicsTabContent"
import SalesTabContent from "@/components/rfqWorkspace/SalesTabContent"
import ContractsTabContent from "@/components/rfqWorkspace/ContractsTabContent"
import PurchaseOrdersTabContent from "@/components/rfqWorkspace/PurchaseOrdersTabContent"
import WorkspaceShell from "@/components/common/WorkspaceShell"
import EntityHeader from "@/components/common/EntityHeader"

const { Text } = Typography

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
  activeStep,
  handleStepChange,
  flowStatus,
  stepLabels,
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
  onCommercialUpdated,
  salesQuotes,
  contracts,
  purchaseOrders,
  rfqStatusLabel,
  handleDeleteRfq,
}) {
  const isRfqNeedsSync = String(activeRfq?.rfq_sync_status || "").toLowerCase() === "needs_sync"
  const effectiveActiveTabKey = isRfqNeedsSync && activeTabKey !== "rfq" ? "rfq" : activeTabKey
  const handleTabChange = (key) => {
    if (isRfqNeedsSync && key !== "rfq") return
    setActiveTabKey(key)
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
                  description="Отправка поставщикам, ответы, покрытие, сценарии, выбор и коммерческий контур временно закрыты, чтобы не продолжить старый состав. Откройте заявку клиента и выполните «Синхронизировать RFQ»."
                />
              ) : null}

              <Tabs
                activeKey={effectiveActiveTabKey}
                onChange={handleTabChange}
                size="small"
                items={[
                {
                  key: "rfq",
                  label: "RFQ",
                  children: (
                    <RfqOverviewTabContent
                      structure={structure}
                      activeRfqId={activeRfqIdForTabs}
                      rfqTreeData={rfqTreeData}
                      openKitPreview={openKitPreview}
                      altPartsMap={altPartsMap}
                      openAltModal={openAltModal}
                    />
                  ),
                },
                {
                  key: "suppliers",
                  label: "Поставщики",
                  disabled: !isStructureConfirmed || isRfqNeedsSync,
                  children: (
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
                },
                {
                  key: "responses",
                  label: "Ответы",
                  disabled: !isStructureConfirmed || isRfqNeedsSync,
                  children: (
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
                },
                {
                  key: "coverage",
                  label: "Покрытие",
                  disabled: !isStructureConfirmed || isRfqNeedsSync,
                  children: (
                    <CoverageTabContent
                      rfqId={activeRfqIdForTabs}
                      onNavigateTab={setActiveTabKey}
                      coverageRows={coverageRows}
                      structure={structure}
                      workspaceRows={responseWorkspaceRows}
                      suppliers={suppliers}
                    />
                  ),
                },
                {
                  key: "scenarios",
                  label: "Сценарии",
                  disabled: !isStructureConfirmed || isRfqNeedsSync,
                  children: <ScenariosTabContent rfqId={activeRfqIdForTabs} />,
                },
                {
                  key: "logistics",
                  label: "Логистика",
                  disabled: !isStructureConfirmed || isRfqNeedsSync,
                  children: (
                    <LogisticsTabContent
                      rfqId={activeRfqIdForTabs}
                      onNavigateTab={setActiveTabKey}
                    />
                  ),
                },
                {
                  key: "economics",
                  label: "Экономика",
                  disabled: !isStructureConfirmed || isRfqNeedsSync,
                  children: (
                    <EconomicsTabContent
                      rfqId={activeRfqIdForTabs}
                      onNavigateTab={setActiveTabKey}
                    />
                  ),
                },
                {
                  key: "selection",
                  label: "Выбор",
                  disabled: !isStructureConfirmed || isRfqNeedsSync,
                  children: (
                    <SelectionTabContent
                      rfqId={activeRfqIdForTabs}
                      selections={selections}
                      formatDate={formatDate}
                      onSelectionFinalized={onSelectionFinalized}
                    />
                  ),
                },
                {
                  key: "sales",
                  label: "Коммерческое предложение",
                  disabled: !isStructureConfirmed || isRfqNeedsSync,
                  children: (
                    <SalesTabContent
                      activeRfq={activeRfq}
                      selections={selections}
                      salesQuotes={salesQuotes}
                      formatDate={formatDate}
                      onCommercialUpdated={onCommercialUpdated}
                    />
                  ),
                },
                {
                  key: "contracts",
                  label: "Контракт",
                  disabled: !isStructureConfirmed || isRfqNeedsSync,
                  children: (
                    <ContractsTabContent
                      contracts={contracts}
                      formatDate={formatDate}
                      onCommercialUpdated={onCommercialUpdated}
                    />
                  ),
                },
                {
                  key: "po",
                  label: "Заказы",
                  disabled: !isStructureConfirmed || isRfqNeedsSync,
                  children: (
                    <PurchaseOrdersTabContent
                      selections={selections}
                      contracts={contracts}
                      purchaseOrders={purchaseOrders}
                      formatDate={formatDate}
                      onCommercialUpdated={onCommercialUpdated}
                    />
                  ),
                },
                ]}
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
