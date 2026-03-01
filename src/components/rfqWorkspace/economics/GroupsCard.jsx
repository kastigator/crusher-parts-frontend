import React from "react"
import { Alert, Button, Card, Table } from "antd"

export default function GroupsCard({
  loadGroups,
  groupsLoading,
  groupsError,
  consolidationGroups,
  groupColumns,
  summary,
}) {
  return (
    <Card
      size="small"
      title="Группы консолидации"
      extra={
        <Button size="small" onClick={() => loadGroups()} loading={groupsLoading}>
          Обновить группы
        </Button>
      }
    >
      {groupsError ? (
        <Alert type="error" showIcon message={groupsError} />
      ) : !consolidationGroups.length ? (
        <Alert
          type="info"
          showIcon
          message="Группы консолидации еще не созданы"
          description="Нажмите «Автосгруппировать» для выбранного кандидата."
        />
      ) : (
        <Table
          rowKey={(record) => `group:${record.shipment_group_id}`}
          dataSource={consolidationGroups}
          loading={groupsLoading}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: "Группы консолидации не найдены" }}
          columns={groupColumns}
          summary={summary}
        />
      )}
    </Card>
  )
}
