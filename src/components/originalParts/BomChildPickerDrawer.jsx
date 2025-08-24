// src/components/originalParts/BomChildPickerDrawer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Drawer, Table, Input, Button, Space, Checkbox, InputNumber, message } from "antd";
import axios from "@/api/axiosInstance";

export default function BomChildPickerDrawer({
  open,
  onClose,
  parentPartId,              // id текущей сборки (родителя)
  modelId,                   // модель оборудования
  excludeIds = [],           // массив id, которые нельзя выбрать (например, уже добавленные дети)
  onPick                     // (items) => void, items: [{ id, qty }]
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [onlyParts, setOnlyParts] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [qtyMap, setQtyMap] = useState({}); // id -> qty
  const dref = useRef(null);

  // всё, что нельзя показывать/выбирать
  const blockedIds = useMemo(
    () => new Set([parentPartId, ...(excludeIds || [])]),
    [parentPartId, excludeIds]
  );

  const fetch = async (query) => {
    if (!modelId) return;
    setLoading(true);
    try {
      const params = { equipment_model_id: modelId };
      if (query?.trim()) params.q = query.trim();
      if (onlyParts) params.only_parts = 1;

      const { data } = await axios.get("/original-parts", { params });
      // скрываем родителя и уже добавленных детей
      const arr = (Array.isArray(data) ? data : []).filter((r) => !blockedIds.has(r.id));
      setRows(arr);

      // инициализируем количества для актуальных строк
      setQtyMap((prev) => {
        const next = { ...prev };
        for (const r of arr) if (next[r.id] == null) next[r.id] = 1;
        return next;
      });

      // чистим выделение, если оно случайно содержало заблокированные id
      setSelectedRowKeys((prev) => prev.filter((id) => !blockedIds.has(id)));
    } catch (e) {
      console.error(e);
      message.error("Не удалось загрузить детали для выбора");
    } finally {
      setLoading(false);
    }
  };

  // первая загрузка + обновление по фильтрам
  useEffect(() => {
    if (open) fetch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, modelId, onlyParts, blockedIds]);

  // лёгкий дебаунс поиска
  const onChangeSearch = (e) => {
    const v = e.target.value;
    setQ(v);
    clearTimeout(dref.current);
    dref.current = setTimeout(() => fetch(v), 300);
  };

  // подтверждение выбора
  const confirm = () => {
    if (!selectedRowKeys.length) return;
    const items = selectedRowKeys.map((id) => ({
      id,
      qty: Number(qtyMap[id]) > 0 ? Number(qtyMap[id]) : 1,
    }));
    onPick?.(items);
  };

  const columns = useMemo(
    () => [
      { title: "Part number", dataIndex: "cat_number", width: 160 },
      { title: "Описание", render: (_, r) => r.description_ru || r.description_en || "—" },
      {
        title: "Кол-во",
        dataIndex: "quantity",
        width: 140,
        render: (_v, r) => (
          <InputNumber
            min={0.0001}
            step={0.0001}
            value={qtyMap[r.id] ?? 1}
            onChange={(val) => setQtyMap((p) => ({ ...p, [r.id]: val ?? 1 }))}
            style={{ width: "100%" }}
          />
        ),
      },
    ],
    [qtyMap]
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={880}
      title="Добавить позиции в BOM"
      destroyOnClose
      extra={
        <Space>
          <Checkbox checked={onlyParts} onChange={(e) => setOnlyParts(e.target.checked)}>
            Только детали (не сборки)
          </Checkbox>
          <Button onClick={() => fetch(q)}>Искать</Button>
          <Button type="primary" onClick={confirm} disabled={!selectedRowKeys.length}>
            Выбрать: {selectedRowKeys.length}
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Input
          placeholder="Поиск по part number или описанию…"
          value={q}
          onChange={onChangeSearch}
          allowClear
        />

        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          size="small"
          pagination={{ pageSize: 10 }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            // подстраховка: вдруг где-то не отфильтровали
            getCheckboxProps: (r) => ({ disabled: blockedIds.has(r.id) }),
          }}
        />
      </Space>
    </Drawer>
  );
}
