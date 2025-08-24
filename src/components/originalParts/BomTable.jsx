// src/components/originalParts/BomTable.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Table, Space, Button, InputNumber, message } from "antd";
import axios from "@/api/axiosInstance";
import confirmAction from "@/utils/confirmAction";
import { PlusOutlined } from "@ant-design/icons";
import BomChildPickerDrawer from "./BomChildPickerDrawer";

export default function BomTable(props) {
  // Поддерживаем оба формата пропсов:
  // 1) { parent: { id, equipment_model_id, ... }, onReload }
  // 2) { parentId, modelId, onReload }  (старый onChanged тоже поддерживается)
  const parentObj = props.parent || null;
  const parentId = parentObj?.id ?? props.parentId ?? null;
  const modelIdProp = props.modelId ?? parentObj?.equipment_model_id ?? null;
  const onReload = props.onReload || props.onChanged;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [modelId, setModelId] = useState(modelIdProp); // эффективный modelId

  // Если modelId не передан — подтянем его по parentId
  useEffect(() => {
    let ignore = false;
    const fetchModelId = async () => {
      if (!parentId || modelIdProp) return;
      try {
        const { data } = await axios.get(`/original-parts/${parentId}`);
        if (!ignore) setModelId(data?.equipment_model_id ?? null);
      } catch {
        // игнорируем (кнопка "Добавить позиции" будет disabled)
      }
    };
    fetchModelId();
    return () => {
      ignore = true;
    };
  }, [parentId, modelIdProp]);

  // Если извне пришёл новый modelId — обновим локальный
  useEffect(() => {
    setModelId(modelIdProp ?? null);
  }, [modelIdProp]);

  const load = async () => {
    if (!parentId) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/original-part-bom", {
        params: { parent_id: parentId },
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      message.error("Не удалось загрузить состав (children)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId]);

  const updateQty = async (childId, qty, qOrig) => {
    const q = Number(qty);
    if (!q || q === qOrig) return;
    try {
      await axios.put("/original-part-bom", {
        parent_part_id: parentId,
        child_part_id: childId,
        quantity: q,
      });
      message.success("Количество обновлено");
      await load();
      onReload?.();
    } catch (e) {
      console.error(e);
      message.error("Не удалось сохранить количество");
    }
  };

  const removeChild = async (childId) => {
    const { confirmed } = await confirmAction("Удалить строку BOM?");
    if (!confirmed) return;
    try {
      await axios.delete("/original-part-bom", {
        data: { parent_part_id: parentId, child_part_id: childId },
      });
      message.success("Строка удалена");
      await load();
      onReload?.();
    } catch (e) {
      console.error(e);
      message.error("Не удалось удалить строку");
    }
  };

  // Массовое добавление выбранных
  const addMany = async (list) => {
    if (!Array.isArray(list) || !list.length) return;
    if (!parentId) {
      message.warning("Нет родителя для BOM");
      return;
    }

    let ok = 0;
    const errors = [];

    for (const item of list) {
      try {
        await axios.post("/original-part-bom", {
          parent_part_id: parentId,
          child_part_id: item.id,
          quantity: item.qty || 1,
        });
        ok += 1;
      } catch (e) {
        const apiMsg = e?.response?.data?.message;
        const label = item.cat_number || item.id;
        errors.push(`${label}: ${apiMsg || "ошибка добавления"}`);
      }
    }

    if (ok) message.success(`Добавлено позиций: ${ok}`);
    if (errors.length) message.warning(`Не добавлено: ${errors.length}`);

    await load();
    onReload?.();
  };

  // Исключаем родителя и уже добавленных детей из списка выбора
  const excludeIds = useMemo(
    () => [parentId, ...items.map((r) => r.child_part_id)].filter(Boolean),
    [parentId, items]
  );

  return (
    <>
      <Table
        rowKey={(r) => `${r.parent_part_id}:${r.child_part_id}`}
        dataSource={items}
        loading={loading}
        size="small"
        pagination={false}
        columns={[
          { title: "Part number", dataIndex: "child_cat_number", width: 160 },
          {
            title: "Описание",
            render: (_, r) =>
              r.child_description_ru || r.child_description_en || "—",
          },
          {
            title: "Кол-во",
            dataIndex: "quantity",
            width: 200,
            render: (q, r) => (
              <Space.Compact style={{ width: "100%" }}>
                <InputNumber
                  min={0.0001}
                  step={0.0001}
                  defaultValue={q}
                  onPressEnter={(e) =>
                    updateQty(r.child_part_id, e.target.value, q)
                  }
                  onBlur={(e) => updateQty(r.child_part_id, e.target.value, q)}
                />
                <Button danger onClick={() => removeChild(r.child_part_id)}>
                  Удалить
                </Button>
              </Space.Compact>
            ),
          },
        ]}
        footer={() => (
          <div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setPickerOpen(true)}
              disabled={!modelId}
            >
              Добавить позиции
            </Button>
          </div>
        )}
      />

      {/* Передаём excludeIds, чтобы скрыть родителя и уже добавленных детей */}
      <BomChildPickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        parentPartId={parentId}
        modelId={modelId}
        excludeIds={excludeIds}
        onPick={(picked) => {
          setPickerOpen(false);
          addMany(picked);
        }}
      />
    </>
  );
}
