import React from "react"
import { Button, Card, Input, Select, Space, Table, Tabs, Tag, Typography } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import RfqOverviewTabContent from "@/components/rfqWorkspace/RfqOverviewTabContent"
import SuppliersTabContent from "@/components/rfqWorkspace/SuppliersTabContent"
import ResponsesTabContent from "@/components/rfqWorkspace/ResponsesTabContent"
import CoverageTabContent from "@/components/rfqWorkspace/CoverageTabContent"
import SelectionTabContent from "@/components/rfqWorkspace/SelectionTabContent"
import EconomicsTabContent from "@/components/rfqWorkspace/EconomicsTabContent"
import SalesTabContent from "@/components/rfqWorkspace/SalesTabContent"
import ContractsTabContent from "@/components/rfqWorkspace/ContractsTabContent"
import PurchaseOrdersTabContent from "@/components/rfqWorkspace/PurchaseOrdersTabContent"

const { Text } = Typography

export default function RfqWorkspaceMainContent({
  clientFilterOptions,
  filterClientId,
  setFilterClientId,
  filterRequestNumber,
  setFilterRequestNumber,
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
  selectionLines,
  economicsDashboard,
  economicsRebuildLoading,
  onRebuildEconomicsScenario,
  salesQuotes,
  contracts,
  purchaseOrders,
  rfqStatusLabel,
  handleDeleteRfq,
}) {
  const rfqColumns = [
    { title: "Клиент", dataIndex: "client_name", width: 220 },
    {
      title: "Заявка",
      dataIndex: "client_request_number",
      width: 160,
      render: (value, record) =>
        value || record.client_reference || `#${record.client_request_id}`,
    },
    {
      title: "Ответственный",
      dataIndex: "assigned_user_name",
      width: 180,
      render: (value) => value || "—",
    },
    {
      title: "RFQ",
      dataIndex: "rfq_number",
      width: 140,
      render: (value, record) => value || `RFQ-${record.id}`,
    },
    { title: "Rev", dataIndex: "rev_number", width: 70 },
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
    {
      title: "Действия",
      dataIndex: "actions",
      width: 90,
      render: (_, record) => (
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={(event) => {
            event.stopPropagation()
            handleDeleteRfq(record.id)
          }}
        />
      ),
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card size="small" title="RFQ список">
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
        </Space>
        <Table
          rowKey="id"
          columns={rfqColumns}
          dataSource={filteredRfqs}
          loading={loading}
          pagination={{ pageSize: 12 }}
          onRow={(record) => ({
            onClick: () => setActiveRfqId(record.id),
          })}
          rowClassName={(record) =>
            Number(record.id) === Number(activeRfqId) ? "ant-table-row-selected" : ""
          }
        />
      </Card>

      {activeRfq ? (
        <Card size="small" title="Рабочая зона">
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space wrap align="center" style={{ justifyContent: "space-between" }}>
              <Space wrap align="center">
                <Text strong>{activeRfq.rfq_number || `RFQ-${activeRfq.id}`}</Text>
                <Tag color={statusToColor(activeRfq.status)}>{rfqStatusLabel(activeRfq.status)}</Tag>
                <Text type="secondary">{activeRfq.client_name || "Клиент"}</Text>
                <Text type="secondary">Rev {activeRfq.rev_number || "-"}</Text>
              </Space>
            </Space>

            <Tabs
              activeKey={activeTabKey}
              onChange={setActiveTabKey}
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
                  disabled: !isStructureConfirmed,
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
                  disabled: !isStructureConfirmed,
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
                  disabled: !isStructureConfirmed,
                  children: (
                    <CoverageTabContent
                      rfqId={activeRfqIdForTabs}
                      coverageRows={coverageRows}
                      structure={structure}
                      workspaceRows={responseWorkspaceRows}
                      suppliers={suppliers}
                    />
                  ),
                },
                {
                  key: "selection",
                  label: "Выбор",
                  disabled: !isStructureConfirmed,
                  children: (
                    <SelectionTabContent
                      selections={selections}
                      selectionLines={selectionLines}
                      formatDate={formatDate}
                    />
                  ),
                },
                {
                  key: "economics",
                  label: "Экономика",
                  disabled: !isStructureConfirmed,
                  children: (
                    <EconomicsTabContent
                      rfqId={activeRfqIdForTabs}
                      economicsDashboard={economicsDashboard}
                      economicsRebuildLoading={economicsRebuildLoading}
                      onRebuildEconomicsScenario={onRebuildEconomicsScenario}
                    />
                  ),
                },
                {
                  key: "sales",
                  label: "КП",
                  disabled: !isStructureConfirmed,
                  children: <SalesTabContent salesQuotes={salesQuotes} formatDate={formatDate} />,
                },
                {
                  key: "contracts",
                  label: "Контракт",
                  disabled: !isStructureConfirmed,
                  children: <ContractsTabContent contracts={contracts} formatDate={formatDate} />,
                },
                {
                  key: "po",
                  label: "PO",
                  disabled: !isStructureConfirmed,
                  children: (
                    <PurchaseOrdersTabContent
                      purchaseOrders={purchaseOrders}
                      formatDate={formatDate}
                    />
                  ),
                },
              ]}
            />
          </Space>
        </Card>
      ) : (
        <Card size="small">
          <Text type="secondary">Выберите RFQ для просмотра рабочего пространства.</Text>
        </Card>
      )}
    </Space>
  )
}
