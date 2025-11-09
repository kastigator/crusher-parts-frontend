import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Drawer, Table, Button, Input, Space, Tooltip, Empty, message } from "antd";
import axios from "@/api/axiosInstance";

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

  // синхронизируем selectedId с пропом
  useEffect(() => {
    setSelectedId(initialSupplierId ?? null);
  }, [initialSupplierId]);

  const cancelIfRunning = () => {
    try {
      abortRef.current?.abort?.();
    } catch {}
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

      // если выбранный поставщик всё ещё в выдаче — не сбрасываем выбор
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

  // грузим список при открытии и при изменении поисковой строки
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
        render: (text) => (
          <Tooltip title={text}>
            <span
              className="cell-ellipsis"
              style={{ display: "inline-block", maxWidth: 380 }}
            >
              {text}
            </span>
          </Tooltip>
        ),
      },
      { title: "Страна", dataIndex: "country", width: 80 },
      {
        title: "Контакт",
        dataIndex: "contact_person",
        render: (v) => v || "—",
        width: 180,
        ellipsis: true,
      },
      {
        title: "Телефон",
        dataIndex: "phone",
        render: (v) => v || "—",
        width: 150,
      },
      {
        title: "Email",
        dataIndex: "email",
        render: (v) => v || "—",
        width: 220,
        ellipsis: true,
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
      width={900}
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
      {/* Поле поиска без отдельной кнопки "Обновить" */}
      <div style={{ marginBottom: 12 }}>
        <Search
          allowClear
          placeholder="Найти поставщика по названию…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={load} // Enter или иконка запускают запрос сразу
        />
      </div>

      <Table
        rowKey="id"
        dataSource={rows}
        loading={loading}
        columns={columns}
        locale={{ emptyText: <Empty description="Поставщики не найдены" /> }}
        pagination={{ pageSize: 10 }}
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
