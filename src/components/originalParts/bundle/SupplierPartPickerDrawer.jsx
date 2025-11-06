import React, { useEffect, useMemo, useRef, useState } from "react";
import { Drawer, Table, Input, Button, Space, Empty, message, Typography } from "antd";
import axios from "@/api/axiosInstance";

const { Text } = Typography;

export default function SupplierPartPickerDrawer({
  open,
  onClose,
  excludeIds = [],
  onPick,
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const abortRef = useRef(null);

  const doSearch = async (query) => {
    abortRef.current?.abort?.();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const trimmed = (query || "").trim();
    if (!trimmed) {
      setRows([]);
      setSelectedRowKeys([]);
      return;
    }

    setLoading(true);
    try {
      const params = {
        q: trimmed,
        limit: 50,
        exclude_ids: (excludeIds || []).join(","),
      };
      const { data } = await axios.get("/supplier-parts/search-lite", {
        params,
        signal: ctrl.signal,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      const name = e?.name || e?.code;
      if (name !== "AbortError" && name !== "ERR_CANCELED") {
        console.error(e);
        message.error("Не удалось выполнить поиск деталей поставщиков");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => doSearch(q), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open, (excludeIds || []).join(",")]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setRows([]);
      setSelectedRowKeys([]);
    }
  }, [open]);

  const columns = useMemo(
    () => [
      { title: "Поставщик", dataIndex: "supplier_name", width: 220, ellipsis: true },
      {
        title: "Деталь у поставщика",
        key: "part",
        ellipsis: true,
        render: (_, r) => (
          <div style={{ lineHeight: 1.2 }}>
            <Text>{r.supplier_part_number || "—"}</Text>
            <br />
            <Text type="secondary">{r.description || "—"}</Text>
          </div>
        ),
      },
      {
        title: "Привязки",
        dataIndex: "original_links",
        width: 100,
        render: (v) => (v ? String(v) : "—"),
      },
      {
        title: "Последняя цена",
        dataIndex: "latest_price",
        width: 140,
        align: "right",
        render: (v, r) =>
          v != null ? `${Number(v).toFixed(2)} ${r.latest_currency || ""}` : "—",
      },
      {
        title: "Дата цены",
        dataIndex: "latest_price_date",
        width: 140,
        render: (v) =>
          v ? new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" }) : "—",
      },
    ],
    []
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    preserveSelectedRowKeys: true,
  };

  const onConfirm = () => {
    const picked = rows.filter((r) => selectedRowKeys.includes(r.id));
    if (picked.length) onPick?.(picked);
    onClose?.();
  };

  return (
    <Drawer
      title="Выбрать детали поставщиков"
      open={open}
      onClose={onClose}
      placement="right"
      width={920}
      destroyOnClose
      keyboard
      maskClosable
      styles={{ body: { paddingTop: 8 } }}
      extra={
        <Space>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="primary" disabled={!selectedRowKeys.length} onClick={onConfirm}>
            Выбрать ({selectedRowKeys.length})
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Input
          placeholder="Поиск по номеру/описанию..."
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onPressEnter={(e) => doSearch(e.currentTarget.value)}
        />
        <Table
          rowKey="id"
          className="op-table"
          dataSource={rows}
          columns={columns}
          loading={loading}
          size="small"
          pagination={false}
          rowSelection={rowSelection}
          locale={{
            emptyText: q.trim() ? <Empty description="Ничего не найдено" /> : <Empty description="Начните с поиска" />,
          }}
        />
      </Space>
    </Drawer>
  );
}
