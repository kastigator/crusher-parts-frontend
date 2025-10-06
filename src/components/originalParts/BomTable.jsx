import React, { useEffect, useState } from "react";
import { Table, InputNumber, message, Button, Space } from "antd";
import axios from "@/api/axiosInstance";
import confirmAction from "@/utils/confirmAction";
import BomChildPickerDrawer from "./BomChildPickerDrawer";

export default function BomTable({ parent, modelId, onReload }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = async () => {
    if (!parent?.id) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`/original-part-bom?parent_id=${parent.id}`);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      message.error("Не удалось загрузить BOM");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [parent?.id]);

  const updateQty = async (rec, val) => {
    try {
      await axios.put(`/original-part-bom/${rec.id}`, { mult_qty: val });
      message.success("Количество обновлено");
      load();
    } catch { message.error("Ошибка обновления количества"); }
  };

  const deleteRow = async (rec) => {
    const { confirmed } = await confirmAction("Удалить позицию из сборки?");
    if (!confirmed) return;
    try {
      await axios.delete(`/original-part-bom/${rec.id}`);
      message.success("Удалено");
      load();
      onReload?.();
    } catch { message.error("Не удалось удалить"); }
  };

  const columns = [
    { title: "Part number", dataIndex: "cat_number", width: 180 },
    { title: "Описание", dataIndex: "description_ru", width: 280 },
    {
      title: "Кол-во", dataIndex: "mult_qty", align: "right", width: 100,
      render: (_, r) => (
        <InputNumber
          min={0.001}
          step={0.001}
          value={r.mult_qty}
          onChange={(v) => updateQty(r, v)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Действия", key: "act", width: 100,
      render: (_, r) => (
        <Button size="small" danger onClick={() => deleteRow(r)}>Удалить</Button>
      ),
    },
  ];

  return (
    <div className="op-table" style={{ width: "100%" }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Button type="primary" size="small" onClick={() => setDrawerOpen(true)}>Добавить позицию</Button>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={false}
          size="small"
        />
      </Space>
      <BomChildPickerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        parentId={parent?.id}
        modelId={modelId}
        onPicked={load}
      />
    </div>
  );
}
