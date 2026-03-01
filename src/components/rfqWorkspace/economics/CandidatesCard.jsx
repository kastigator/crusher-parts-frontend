import React from "react"
import { Alert, Button, Card, Space, Table } from "antd"

export default function CandidatesCard({
  loadCandidates,
  candidatesLoading,
  selectedCandidateId,
  autoGroupLoading,
  handleAutoGroup,
  createScenarioLoading,
  handleCreateScenario,
  candidatesError,
  coverageCandidates,
  setSelectedCandidateId,
  candidateColumns,
}) {
  return (
    <Card
      size="small"
      title="Кандидаты из Покрытия"
      extra={
        <Space>
          <Button size="small" onClick={loadCandidates} loading={candidatesLoading}>
            Обновить
          </Button>
          <Button
            size="small"
            type="primary"
            disabled={!selectedCandidateId}
            loading={autoGroupLoading}
            onClick={handleAutoGroup}
          >
            Автосгруппировать
          </Button>
          <Button
            size="small"
            disabled={!selectedCandidateId}
            loading={createScenarioLoading}
            onClick={handleCreateScenario}
          >
            Создать черновой сценарий
          </Button>
        </Space>
      }
    >
      {candidatesError ? (
        <Alert type="error" showIcon message={candidatesError} />
      ) : !coverageCandidates.length ? (
        <Alert
          type="info"
          showIcon
          message="Кандидаты еще не переданы из Покрытия"
          description="На вкладке «Покрытие» сформируйте кандидатов в режиме «Комбинации» и нажмите «Передать в Экономику»."
        />
      ) : (
        <Table
          rowKey={(record) => Number(record.candidate_set_id)}
          dataSource={coverageCandidates}
          loading={candidatesLoading}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: "Кандидаты не найдены" }}
          rowSelection={{
            type: "radio",
            selectedRowKeys: selectedCandidateId ? [Number(selectedCandidateId)] : [],
            onChange: (keys) => setSelectedCandidateId(keys?.length ? Number(keys[0]) : null),
          }}
          columns={candidateColumns}
        />
      )}
    </Card>
  )
}
