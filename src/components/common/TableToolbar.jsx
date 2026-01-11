import React from "react"
import { Row, Col, Input, Button, Tooltip, Space, Typography } from "antd"
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  ReloadOutlined,
} from "@ant-design/icons"

const { Title } = Typography

export default function TableToolbar({
  title,         // строка заголовка (опционально)
  search,        // значение поиска
  onSearch,      // (value: string) => void
  onAdd,         // () => void
  onImport,      // () => void
  onShowDeleted, // () => void
  onRefresh,     // () => void
  placeholder = "Поиск...",
  disabled = false,
  searchWidth = 320,
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
              placeholder={placeholder}
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              onSearch={(value) => onSearch(value)}
              style={{ width: searchWidth }}
              disabled={disabled}
            />
          )}
        </Space>
      </Col>

      <Col>
        <Space>
          {onRefresh && (
            <Tooltip title="Обновить">
              <Button icon={<ReloadOutlined />} onClick={onRefresh}>
                Обновить
              </Button>
            </Tooltip>
          )}
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
