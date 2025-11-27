import React from "react"
import { Row, Col, Input, Button, Tooltip, Space, Typography } from "antd"
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
} from "@ant-design/icons"

const { Title } = Typography

export default function TableToolbar({
  title,        // строка заголовка (опционально)
  search,       // значение поиска
  onSearch,     // (value: string) => void
  onAdd,        // () => void
  onImport,     // () => void
  onShowDeleted // () => void
}) {
  return (
    <Row
      justify="space-between"
      align="middle"
      style={{ marginBottom: 16 }}
      gutter={16}
    >
      <Col flex="auto">
        <Space direction="horizontal">
          {title && (
            <Title level={5} style={{ margin: 0 }}>
              {title}
            </Title>
          )}

          {onSearch && (
            <Input.Search
              allowClear
              placeholder="Поиск..."
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              style={{ width: 320 }}
            />
          )}
        </Space>
      </Col>

      <Col>
        <Space>
          {onAdd && (
            <Tooltip title="Добавить">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={onAdd}
              >
                Добавить
              </Button>
            </Tooltip>
          )}

          {onImport && (
            <Tooltip title="Импорт из Excel">
              <Button icon={<UploadOutlined />} onClick={onImport}>
                Импорт
              </Button>
            </Tooltip>
          )}

          {onShowDeleted && (
            <Tooltip title="Удалённые записи">
              <Button
                icon={<DeleteOutlined />}
                onClick={onShowDeleted}
                danger
              >
                Удалённые
              </Button>
            </Tooltip>
          )}
        </Space>
      </Col>
    </Row>
  )
}
