import React from "react"
import { Table } from "antd"
import { formatPriceWithCurrency } from "@/utils/priceFormat"

export default function CoverageTabContent({ coverageRows }) {
  return (
    <Table
      rowKey="key"
      dataSource={coverageRows}
      pagination={false}
      columns={[
        { title: "RFQ", dataIndex: "line_number", width: 70 },
        { title: "Позиция", dataIndex: "item_description" },
        { title: "Компонент", dataIndex: "component_cat_number", width: 160 },
        { title: "Описание", dataIndex: "component_description" },
        { title: "Кол-во", dataIndex: "required_qty", width: 90 },
        { title: "Стратегия", dataIndex: "strategy_mode", width: 100 },
        { title: "Поставщики", dataIndex: "suppliers_count", width: 110 },
        { title: "Ответы", dataIndex: "responses_count", width: 90 },
        {
          title: "Лучшее",
          dataIndex: "best_price",
          width: 140,
          render: (value, record) =>
            value === "-" ? "-" : formatPriceWithCurrency(value, record.best_currency),
        },
        { title: "Поставщик", dataIndex: "best_supplier", width: 160 },
      ]}
    />
  )
}
