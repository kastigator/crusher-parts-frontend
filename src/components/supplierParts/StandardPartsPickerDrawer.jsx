import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Drawer, Table, Input, Space, Button, Typography, message, Tag } from "antd";
import { SearchOutlined, LinkOutlined, ReloadOutlined } from "@ant-design/icons";
import axios from "@/api/axiosInstance";

const { Text } = Typography;

export default function StandardPartsPickerDrawer({
  open,
  onClose,
  excludeIds = [],
  title = "Подбор стандартных изделий",
  confirmLabel = "Привязать выбранные",
  onPick,
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const abortRef = useRef(null);

  const cancelIfRunning = () => {
    try {
      abortRef.current?.abort?.();
    } catch {
      // ignore abort errors from stale requests
    }
    abortRef.current = null;
  };

  const fetchList = useCallback(async () => {
    if (!open) return;
    if (!q.trim()) {
      setRows([]);
      return;
    }

    cancelIfRunning();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const { data } = await axios.get("/standard-parts", {
        params: { q: q.trim(), limit: 100 },
        signal: controller.signal,
      });
      const excl = new Set((excludeIds || []).map(Number));
      const list = (Array.isArray(data) ? data : []).map((row) => ({
        ...row,
        _disabled: excl.has(Number(row.id)),
      }));
      setRows(list);
    } catch (e) {
      if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;
      console.error(e);
      message.error("Не удалось загрузить стандартные изделия");
    } finally {
      setLoading(false);
    }
  }, [open, q, excludeIds]);

  useEffect(() => {
    const t = setTimeout(fetchList, 250);
    return () => clearTimeout(t);
  }, [fetchList]);

  useEffect(() => {
    if (!open) {
      setSelectedRowKeys([]);
      cancelIfRunning();
    }
  }, [open]);

  const columns = useMemo(
    () => [
      {
        title: "Класс",
        dataIndex: "class_name",
        width: 160,
        render: (v) => v || <Text type="secondary">—</Text>,
      },
      {
        title: "Название",
        dataIndex: "display_name",
        width: 220,
        render: (v) => <Text strong>{v || "—"}</Text>,
      },
      {
        title: "Обозначение",
        dataIndex: "designation",
        width: 180,
        render: (v) => (v ? <Tag color="processing">{v}</Tag> : <Text type="secondary">—</Text>),
      },
      {
        title: "Описание",
        key: "description",
        render: (_, row) => row.description_ru || row.description_en || <Text type="secondary">—</Text>,
      },
    ],
    []
  );

  const selectedRows = useMemo(() => {
    const map = new Map(rows.map((r) => [r.id, r]));
    return selectedRowKeys.map((id) => map.get(id)).filter(Boolean);
  }, [selectedRowKeys, rows]);

  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      destroyOnClose
      width={980}
      extra={
        <Space>
          <Text type="secondary">
            Выбрано: <Text strong>{selectedRows.length}</Text>
          </Text>
          <Button
            type="primary"
            icon={<LinkOutlined />}
            disabled={!selectedRows.length}
            onClick={() => onPick?.(selectedRows)}
          >
            {confirmLabel}
          </Button>
        </Space>
      }
    >
      <Space style={{ width: "100%", marginBottom: 8 }} wrap align="center">
        <Input
          allowClear
          style={{ width: 360 }}
          placeholder="Поиск по классу, названию, обозначению, описанию"
          value={q}
          prefix={<SearchOutlined />}
          onChange={(e) => setQ(e.target.value)}
          onPressEnter={fetchList}
        />
        {q && (
          <Button icon={<ReloadOutlined />} onClick={() => setQ("")}>
            Сбросить
          </Button>
        )}
      </Space>

      <Table
        size="middle"
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={columns}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          getCheckboxProps: (record) => ({ disabled: record._disabled === true }),
        }}
        pagination={{ pageSize: 12, showSizeChanger: false }}
        locale={{ emptyText: q ? "Ничего не найдено" : "Введите запрос для поиска стандартных изделий" }}
      />
    </Drawer>
  );
}
