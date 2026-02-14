import React from "react"
import { Alert, Button, Card, Modal, Space, Switch, Table, Typography, Upload } from "antd"
import { FileExcelOutlined, UploadOutlined } from "@ant-design/icons"

const { Text } = Typography

export default function ImportExcelModal({
  open,
  onCancel,
  templateUrl,
  handleExcelUpload,
  stagedRows,
  setStagedRows,
  resetImportState,
  stagedColumns,
  handlePreviewRows,
  createMissing,
  setCreateMissing,
  handleCommitRows,
  importErrors,
  importSummary,
  importPreview,
  importLoading,
  previewColumns,
}) {
  return (
    <Modal
      title="Импорт из Excel"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={960}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space wrap align="center">
          <Button
            icon={<FileExcelOutlined />}
            href={templateUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
          >
            Скачать шаблон
          </Button>
          <Upload
            accept=".xlsx"
            showUploadList={false}
            beforeUpload={(file) => {
              handleExcelUpload(file)
              return false
            }}
          >
            <Button icon={<UploadOutlined />}>Загрузить Excel</Button>
          </Upload>
          <Text type="secondary">
            Файл будет проверен перед добавлением в заявку.
          </Text>
        </Space>

        <Card
          size="small"
          title={`Позиции к импорту (${stagedRows.length})`}
          extra={
            <Space>
              <Button
                danger
                onClick={() => {
                  setStagedRows([])
                  resetImportState()
                }}
              >
                Очистить
              </Button>
            </Space>
          }
        >
          <Table
            rowKey="id"
            size="small"
            dataSource={stagedRows}
            pagination={false}
            columns={stagedColumns}
            locale={{ emptyText: "Загрузите Excel-файл" }}
          />
          <Space wrap align="center" style={{ marginTop: 12 }}>
            <Button
              onClick={() => handlePreviewRows(stagedRows)}
              disabled={!stagedRows.length}
            >
              Проверить
            </Button>
            <Switch
              checked={createMissing}
              onChange={setCreateMissing}
              checkedChildren="Создавать недостающие"
              unCheckedChildren="Без создания"
            />
            <Text type="secondary">
              Недостающие производители/модели/детали можно добавить автоматически.
            </Text>
          </Space>
          <Space style={{ marginTop: 12 }}>
            <Button
              type="primary"
              onClick={() => handleCommitRows(stagedRows)}
              disabled={
                !stagedRows.length ||
                importErrors.length > 0 ||
                (importPreview.length &&
                  importPreview.some((row) => row.status === "error")) ||
                (!createMissing &&
                  importPreview.some((row) => row.status === "warning"))
              }
              loading={importLoading}
            >
              Добавить в заявку
            </Button>
          </Space>
        </Card>

        {importErrors.length > 0 && (
          <Alert
            type="error"
            message={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {importErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            }
          />
        )}

        {importSummary && (
          <Alert
            type="info"
            message={`Всего строк: ${importSummary.total}. Ок: ${importSummary.ok}. Предупреждения: ${importSummary.warning}. Ошибки: ${importSummary.error}.`}
          />
        )}

        {importPreview.length > 0 && (
          <Table
            rowKey="row_number"
            size="small"
            dataSource={importPreview}
            pagination={false}
            locale={{ emptyText: "Нет данных для проверки" }}
            columns={previewColumns}
          />
        )}
      </Space>
    </Modal>
  )
}
