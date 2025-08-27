import React, { useRef } from "react";
import { Table } from "antd";
/* ... твои импорты и колонки ... */

export default function BankDetailsTable(props){
  const wrapRef = useRef(null);
  const { columns, data, loading, /* ... остальное ... */ } = props;

  return (
    <div className="parts-table-wrap" ref={wrapRef}>
      <Table
        className="op-table parts-table"
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        size="small"
      />
    </div>
  );
}
