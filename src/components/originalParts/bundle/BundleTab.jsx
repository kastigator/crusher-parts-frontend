// src/components/originalParts/bundle/BundleTab.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Space, Input, Button, message, Tag, Table, Empty, Tooltip } from "antd";
import axios from "@/api/axiosInstance";
import SupplierPartPickerDrawer from "./SupplierPartPickerDrawer";
import confirmAction from "@/utils/confirmAction";

export default function BundleTab({ originalPartId }) {
  const [bundle, setBundle] = useState(null);           // { id, title, note }
  const [items, setItems] = useState([]);               // роли
  const [options, setOptions] = useState([]);           // варианты
  const [totals, setTotals] = useState([]);             // свод по валютам
  const [loading, setLoading] = useState(false);
  const [creatingTitle, setCreatingTitle] = useState("");
  const [creatingNote, setCreatingNote] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);   // выбранная роль для добавления вариантов

  // загрузка/создание "шапки" комплекта
  const loadBundle = useCallback(async () => {
    if (!originalPartId) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/supplier-bundles", { params: { original_part_id: originalPartId }});
      const b = Array.isArray(data) && data[0] ? data[0] : null;
      setBundle(b);
    } catch (e) {
      console.error(e);
      message.error("Не удалось загрузить комплект");
    } finally {
      setLoading(false);
    }
  }, [originalPartId]);

  const ensureBundle = useCallback(async () => {
    if (bundle) return bundle.id;
    if (!creatingTitle?.trim()) {
      message.warning("Введите название комплекта");
      return null;
    }
    try {
      const { data } = await axios.post("/supplier-bundles", {
        original_part_id: originalPartId,
        title: creatingTitle.trim(),
        note: creatingNote?.trim() || null,
      });
      await loadBundle();
      setCreatingTitle("");
      setCreatingNote("");
      return data?.id || null;
    } catch (e) {
      console.error(e);
      message.error("Не удалось создать комплект");
      return null;
    }
  }, [bundle, creatingTitle, creatingNote, originalPartId, loadBundle]);

  // загрузка состава (роли/варианты/итоги)
  const loadSummary = useCallback(async (bundleId) => {
    if (!bundleId) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`/supplier-bundles/${bundleId}/summary`);
      setItems(data?.items || []);
      setOptions(data?.options || []);
      setTotals(data?.totals || []);
    } catch (e) {
      console.error(e);
      message.error("Не удалось загрузить состав комплекта");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setItems([]); setOptions([]); setTotals([]);
    setActiveItem(null);
    loadBundle();
  }, [originalPartId, loadBundle]);

  useEffect(() => {
    if (bundle?.id) loadSummary(bundle.id);
  }, [bundle, loadSummary]);

  // роли
  const addItem = async (roleLabel, qty = 1) => {
    const bundleId = await ensureBundle();
    if (!bundleId) return;
    try {
      await axios.post("/supplier-bundles/items", {
        bundle_id: bundleId,
        role_label: roleLabel?.trim() || "Позиция",
        qty: Number(qty) || 1,
      });
      loadSummary(bundleId);
    } catch (e) {
      console.error(e);
      message.error("Не удалось добавить роль");
    }
  };

  const deleteItem = async (id) => {
    const { confirmed } = await confirmAction("Удалить позицию комплекта?");
    if (!confirmed) return;
    try {
      await axios.delete(`/supplier-bundles/items/${id}`);
      loadSummary(bundle.id);
      if (activeItem?.id === id) setActiveItem(null);
    } catch (e) {
      console.error(e);
      message.error("Не удалось удалить позицию");
    }
  };

  // варианты
  const addOptionsToItem = async (itemId, parts = []) => {
    if (!itemId || !parts?.length) return;
    try {
      for (const p of parts) {
        await axios.post("/supplier-bundles/links", {
          item_id: itemId,
          supplier_part_id: p.id,
          is_default: 0,
        });
      }
      await loadSummary(bundle.id);
      message.success(`Добавлено вариантов: ${parts.length}`);
    } catch (e) {
      console.error(e);
      message.error("Не удалось добавить варианты");
    }
  };

  const deleteLink = async (linkId) => {
    const { confirmed } = await confirmAction("Удалить вариант из роли?");
    if (!confirmed) return;
    try {
      await axios.delete(`/supplier-bundles/links/${linkId}`);
      await loadSummary(bundle.id);
    } catch (e) {
      console.error(e);
      message.error("Не удалось удалить вариант");
    }
  };

  const setDefault = async (linkId) => {
    try {
      await axios.put(`/supplier-bundles/links/${linkId}`, { is_default: 1 });
      await loadSummary(bundle.id);
    } catch (e) {
      console.error(e);
      message.error("Не удалось назначить по умолчанию");
    }
  };

  // таблицы
  const itemColumns = [
    { title: "Роль", dataIndex: "role_label" },
    { title: "Кол-во", dataIndex: "qty", width: 100, align: "right" },
    {
      title: "Действия",
      key: "act",
      width: 220,
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => { setActiveItem(r); setDrawerOpen(true); }}>
            Добавить варианты
          </Button>
          <Button size="small" danger onClick={() => deleteItem(r.id)}>Удалить</Button>
        </Space>
      ),
    },
  ];

  const optionsForItem = (itemId) => options.filter(o => o.item_id === itemId);
  const excludeIdsForItem = (itemId) =>
    optionsForItem(itemId).map(o => o.supplier_part_id);

  const optionsColumns = [
    { title: "Поставщик", dataIndex: "supplier_name", width: 220 },
    { title: "Номер у поставщика", dataIndex: "supplier_part_number", width: 220 },
    { title: "Описание", dataIndex: "description" },
    { title: "Цена", dataIndex: "last_price", width: 120, align: "right" },
    { title: "Валюта", dataIndex: "last_currency", width: 90, align: "center" },
    {
      title: "По умолчанию",
      dataIndex: "is_default",
      width: 130,
      align: "center",
      render: (v) => v ? <Tag color="green">да</Tag> : <Tag>нет</Tag>,
    },
    {
      title: "Действия",
      key: "op",
      width: 220,
      render: (_, r) => (
        <Space>
          {!r.is_default && (
            <Button size="small" onClick={() => setDefault(r.link_id)}>Сделать дефолт</Button>
          )}
          <Button size="small" danger onClick={() => deleteLink(r.link_id)}>Удалить</Button>
        </Space>
      )
    }
  ];

  const totalsBar = totals?.length
    ? totals.map(t => <Tag key={t.currency_iso3}>{t.currency_iso3}: {t.total_price}</Tag>)
    : <Tag>нет итогов</Tag>;

  return (
    <Card
      bodyStyle={{ paddingTop: 12 }}
      title={
        bundle
          ? <Space><Tag color="blue">Комплект ID: {bundle.id}</Tag> {totalsBar}</Space>
          : "Комплект ещё не создан для этой детали."
      }
      loading={loading}
    >
      {/* Создание комплекта */}
      {!bundle && (
        <Space.Compact style={{ width: "100%", marginBottom: 12 }}>
          <Input
            placeholder="Название комплекта"
            value={creatingTitle}
            onChange={(e) => setCreatingTitle(e.target.value)}
          />
          <Input
            placeholder="Комментарий (необязательно)"
            value={creatingNote}
            onChange={(e) => setCreatingNote(e.target.value)}
          />
          <Button type="primary" onClick={ensureBundle}>Создать комплект</Button>
        </Space.Compact>
      )}

      {/* Добавить роль */}
      {bundle && (
        <Space.Compact style={{ width: 520, marginBottom: 12 }}>
          <Input
            placeholder="Например: Насос"
            onPressEnter={(e) => addItem(e.target.value, 1)}
          />
          <Tooltip title="Кол-во по роли">
            <Input style={{ width: 100 }} defaultValue="1" id="bundle-role-qty" />
          </Tooltip>
          <Button
            onClick={() => {
              const role = document.querySelector("input[placeholder='Например: Насос']")?.value || "";
              const qtyEl = document.getElementById("bundle-role-qty");
              const qty = Number(qtyEl?.value || 1);
              addItem(role, qty);
            }}
          >
            + Добавить
          </Button>
        </Space.Compact>
      )}

      {/* Роли */}
      {bundle ? (
        <Table
          rowKey="id"
          dataSource={items}
          columns={itemColumns}
          pagination={false}
          locale={{ emptyText: <Empty description="Нет ролей. Добавьте первую роль выше." /> }}
          expandable={{
            expandedRowRender: (item) => (
              <Table
                rowKey="link_id"
                dataSource={optionsForItem(item.id)}
                columns={optionsColumns}
                pagination={false}
                size="small"
                locale={{ emptyText: <Empty description="Нет вариантов. Нажмите «Добавить варианты»." /> }}
              />
            ),
          }}
          size="middle"
          className="op-table"
        />
      ) : null}

      {/* Drawer выбора деталей поставщика */}
      <SupplierPartPickerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        excludeIds={activeItem ? excludeIdsForItem(activeItem.id) : []}
        onPick={(rows) => activeItem && addOptionsToItem(activeItem.id, rows)}
      />
    </Card>
  );
}
