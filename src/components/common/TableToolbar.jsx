import React from "react"
import { Row, Col, Input, Button, Tooltip, Space } from "antd"
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  ReloadOutlined,
  UndoOutlined
} from "@ant-design/icons"

const { Search } = Input

export default function TableToolbar({
  onAddClick,
  onImportClick,
  onExport,
  onRefresh,
  onResetFilters,
  filterValue,
  onFilterChange,
  customFilter,
  actionsRight,
  children
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Row justify="space-between" align="middle" gutter={[8, 8]} wrap>
        {/* Левая часть: фильтры и кастомные элементы */}
        <Col>
          <Space size="middle" wrap>
            {typeof filterValue !== "undefined" && typeof onFilterChange === "function" && (
              <Search
                placeholder="Поиск..."
                allowClear
                value={filterValue}
                onChange={(e) => onFilterChange(e.target.value)}
                style={{ width: 300 }}
              />
            )}

            {customFilter}
            {children}
          </Space>
        </Col>

        {/* Правая часть: действия */}
        <Col>
          <Space wrap>
            {onResetFilters && (
              <Tooltip title="Сбросить фильтры">
                <Button icon={<UndoOutlined />} onClick={onResetFilters} />
              </Tooltip>
            )}
            {onRefresh && (
              <Tooltip title="Обновить">
                <Button icon={<ReloadOutlined />} onClick={onRefresh} />
              </Tooltip>
            )}
            {onExport && (
              <Tooltip title="Экспорт">
                <Button icon={<DownloadOutlined />} onClick={onExport} />
              </Tooltip>
            )}
            {onImportClick && (
              <Tooltip title="Импорт">
                <Button icon={<UploadOutlined />} onClick={onImportClick}>
                  Импорт
                </Button>
              </Tooltip>
            )}
            {onAddClick && (
              <Tooltip title="Добавить новую запись">
                <Button icon={<PlusOutlined />} type="primary" onClick={onAddClick} />
              </Tooltip>
            )}
            {actionsRight}
          </Space>
        </Col>
      </Row>
    </div>
  )
}
