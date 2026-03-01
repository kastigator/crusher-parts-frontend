import React from "react"
import { Alert, Button, Card, Table } from "antd"

export default function ScenariosCard({
  loadScenarios,
  scenariosLoading,
  scenariosError,
  economyScenarios,
  scenarioColumns,
  selectedScenarioId,
  setSelectedScenarioId,
}) {
  return (
    <Card
      size="small"
      title="Сценарии экономики"
      extra={
        <Button size="small" onClick={() => loadScenarios()} loading={scenariosLoading}>
          Обновить сценарии
        </Button>
      }
    >
      {scenariosError ? (
        <Alert type="error" showIcon message={scenariosError} />
      ) : !economyScenarios.length ? (
        <Alert
          type="info"
          showIcon
          message="Сценарии еще не созданы"
          description="После автогруппировки нажмите «Создать черновой сценарий»."
        />
      ) : (
        <Table
          rowKey={(record) => `scenario:${record.scenario_id}`}
          dataSource={economyScenarios}
          loading={scenariosLoading}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: "Сценарии не найдены" }}
          columns={scenarioColumns}
          rowSelection={{
            type: "radio",
            selectedRowKeys: selectedScenarioId ? [`scenario:${selectedScenarioId}`] : [],
            onChange: (keys) => {
              const key = keys?.length ? String(keys[0]) : ""
              const id = Number(key.split(":").pop() || 0)
              setSelectedScenarioId(id || null)
            },
          }}
        />
      )}
    </Card>
  )
}
