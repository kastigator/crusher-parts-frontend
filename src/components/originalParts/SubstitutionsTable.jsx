import React, { useEffect, useState } from "react";
import { Table, Button, message, Input } from "antd";
import axios from "@/api/axiosInstance";
import confirmAction from "@/utils/confirmAction";

export default function SubstitutionsTable({ originalPartId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!originalPartId) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`/original-part-substitutions?original_id=${originalPartId}`);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      message.error("Не удалось загрузить замены");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [originalPartId]);

  const deleteRow = async (rec) => {
    const { confirmed } = await confirmAction("Удалить замену?");
    if (!confirmed) return;
    try {
      await axios.delete(`/original-part-substitutions/${rec.id}`);
      message.success("Удалено");
      load();
    } catch { message.error("Ошибка удаления"); }
  };

  const columns = [
    { title: "Код комплекта", dataIndex: "kit_code", width: 180 },
    { title: "Описание", dataIndex: "description", ellipsis: true },
    {
      title: "Действия", key: "act", width: 100,
      render: (_, r) => (
        <Button danger size="small" onClick={() => deleteRow(r)}>Удалить</Button>
      ),
    },
  ];

  return (
    <div className="op-table" style={{ width: "100%", overflowX: "auto" }}>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={false}
        size="small"
      />
    </div>
  );
}
