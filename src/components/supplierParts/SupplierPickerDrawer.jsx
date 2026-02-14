// src/components/supplierParts/SupplierPickerDrawer.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Drawer,
  Table,
  Button,
  Input,
  Space,
  Tooltip,
  Empty,
  message,
} from "antd";
import axios from "@/api/axiosInstance";
import { getCountryLabel } from "@/components/inputs/countryUtils";

const { Search } = Input;

export default function SupplierPickerDrawer({
  open,
  onClose,
  onPick,
  initialSupplierId = null,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(initialSupplierId);
  const [search, setSearch] = useState("");
  const abortRef = useRef(null);

  useEffect(() => {
    setSelectedId(initialSupplierId ?? null);
  }, [initialSupplierId]);

  const cancelIfRunning = () => {
    try {
      abortRef.current?.abort?.();
    } catch {
      // ignore abort errors
    }
    abortRef.current = null;
  };

  const load = useCallback(async () => {
    cancelIfRunning();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const params = {};
      if (search?.trim()) params.q = search.trim();
      const { data } = await axios.get("/part-suppliers", {
        params,
        signal: controller.signal,
      });
      const list = Array.isArray(data) ? data : [];
      setRows(list);

      if (selectedId) {
        const stillThere = list.some((r) => r.id === selectedId);
        if (!stillThere) setSelectedId(null);
      }
    } catch (e) {
      const name = e?.name || e?.code;
      if (name !== "AbortError" && name !== "ERR_CANCELED") {
        console.error(e);
        message.error("Не удалось загрузить поставщиков");
      }
    } finally {
      setLoading(false);
    }
  }, [search, selectedId]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, 300);
    return () => {
      clearTimeout(t);
      cancelIfRunning();
    };
  }, [open, load]);

  const columns = useMemo(
    () => [
      {
        title: "Компания",
        dataIndex: "name",
        width: 320,
        ellipsis: true,
        render: (text) => (
          <Tooltip title={text}>
            <span
              style={{
                display: "inline-block",
                maxWidth: 300,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {text}
            </span>
          </Tooltip>
        ),
      },
      {
        title: "Страна",
        dataIndex: "country",
        width: 160,
        ellipsis: true,
        render: (code) => getCountryLabel(code, "ru") || "—",
      },
      {
        title: "Контакт",
        dataIndex: "contact_person",
        width: 150,
        ellipsis: true,
        render: (v) => v || "—",
      },
      {
        title: "Телефон",
        dataIndex: "phone",
        width: 150,
        ellipsis: true,
        render: (v) => v || "—",
      },
      {
        title: "E-mail",
        dataIndex: "email",
        width: 220,
        ellipsis: true,
        render: (v) =>
          v ? (
            <Tooltip title={v}>
              <span
                style={{
                  display: "inline-block",
                  maxWidth: 210,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {v}
              </span>
            </Tooltip>
          ) : (
            "—"
          ),
      },
    ],
    []
  );

  const pickSelected = () => {
    const picked = rows.find((r) => r.id === selectedId);
    if (picked) onPick?.(picked);
  };

  const handleClose = () => {
    cancelIfRunning();
    onClose?.();
  };

  return (
    <Drawer
      width={1000}
      title="Выбрать поставщика"
      open={open}
      onClose={handleClose}
      extra={
        <Space>
          <Button onClick={handleClose}>Отмена</Button>
          <Button type="primary" disabled={!selectedId} onClick={pickSelected}>
            Выбрать
          </Button>
        </Space>
      }
      footer={null}
    >
      <div style={{ marginBottom: 12 }}>
        <Search
          allowClear
          placeholder="Найти поставщика по названию…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={load}
        />
      </div>

      <Table
        rowKey="id"
        dataSource={rows}
        loading={loading}
        columns={columns}
        locale={{ emptyText: <Empty description="Поставщики не найдены" /> }}
        pagination={{ pageSize: 10 }}
        size="middle"
        scroll={{ x: 1000 }}
        rowSelection={{
          type: "radio",
          selectedRowKeys: selectedId ? [selectedId] : [],
          onChange: (keys) => setSelectedId(keys?.[0]),
        }}
        onRow={(record) => ({
          onClick: () => setSelectedId(record.id),
          onDoubleClick: () => {
            setSelectedId(record.id);
            pickSelected();
          },
        })}
      />
    </Drawer>
  );
}
