import React, { useCallback, useEffect, useRef, useState } from "react";
import { Table, Form, Input, InputNumber, Button, Space, message, Popconfirm } from "antd";
import axios from "@/api/axiosInstance";

/**
 * Показывает связи "деталь поставщика ↔ оригинальные детали" и позволяет
 * добавлять/удалять привязки.
 *
 * Поддерживаем бэкенд-роуты:
 * GET    /supplier-part-originals?supplier_part_id=ID
 * POST   /supplier-part-originals { supplier_part_id, original_part_id? | original_part_cat_number, equipment_model_id? }
 * DELETE /supplier-part-originals { supplier_part_id, original_part_id }   (в body через axios { data })
 */
export default function OriginalsLinkTab({ supplierPartId, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form] = Form.useForm();
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    if (!supplierPartId) { setRows([]); return; }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const { data } = await axios.get("/supplier-part-originals", {
        params: { supplier_part_id: supplierPartId },
        signal: controller.signal
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      const name = e?.name || e?.code;
      if (name !== "AbortError" && name !== "ERR_CANCELED") {
        console.error(e);
        message.error("Не удалось загрузить привязки к оригинальным деталям");
      }
    } finally {
      setLoading(false);
    }
  }, [supplierPartId]);

  useEffect(() => {
    const t = setTimeout(load, 150);
    return () => { clearTimeout(t); abortRef.current?.abort(); };
  }, [load, supplierPartId]);

  const addLink = async () => {
    try {
      const v = await form.validateFields();
      setAdding(true);

      const payload = {
        supplier_part_id: supplierPartId,
      };

      // Вариант 1: прямой id
      if (v.original_part_id) {
        payload.original_part_id = Number(v.original_part_id);
      } else {
        // Вариант 2: по каталожному номеру (и опционально по ID модели, если номеров несколько)
        payload.original_part_cat_number = v.original_part_cat_number?.trim();
        if (v.equipment_model_id) payload.equipment_model_id = Number(v.equipment_model_id);
      }

      await axios.post("/supplier-part-originals", payload);
      message.success("Привязка добавлена");
      form.resetFields();
      load();
      onChanged?.();
    } catch (e) {
      if (!e?.errorFields) {
        console.error(e);
        message.error(e?.response?.data?.message || "Не удалось добавить привязку");
      }
    } finally {
      setAdding(false);
    }
  };

  const removeLink = async (original_part_id) => {
    try {
      await axios.delete("/supplier-part-originals", {
        data: { supplier_part_id: supplierPartId, original_part_id }
      });
      message.success("Привязка удалена");
      load();
      onChanged?.();
    } catch (e) {
      console.error(e);
      message.error(e?.response?.data?.message || "Не удалось удалить привязку");
    }
  };

  const columns = [
    { title: "Оригинальный номер", dataIndex: "cat_number", width: 220 },
    { title: "Производитель", dataIndex: "manufacturer_name", width: 200, render: v => v || "—" },
    { title: "Модель", dataIndex: "model_name", width: 220, render: v => v || "—" },
    {
      title: "Действия",
      width: 120,
      render: (_, r) => (
        <Popconfirm
          title="Удалить привязку?"
          onConfirm={() => removeLink(r.original_part_id)}
          okText="Удалить"
          cancelText="Отмена"
        >
          <Button danger size="small">Удалить</Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <div>
      {/* Форма добавления привязки */}
      <Form
        form={form}
        layout="inline"
        style={{ marginBottom: 12, flexWrap: "wrap", rowGap: 8 }}
      >
        <Form.Item name="original_part_id" label="ID оригинала">
          <InputNumber min={1} placeholder="например, 123" style={{ width: 140 }} />
        </Form.Item>

        <span style={{ opacity: 0.6, margin: "0 8px" }}>или</span>

        <Form.Item name="original_part_cat_number" label="Part number">
          <Input placeholder="например, 711-22-12340" style={{ width: 200 }} />
        </Form.Item>

        <Form.Item name="equipment_model_id" label="ID модели">
          <InputNumber min={1} placeholder="если PN встречается в нескольких моделях" style={{ width: 200 }} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" onClick={addLink} loading={adding}>
            Привязать
          </Button>
        </Form.Item>
      </Form>

      <Table
        rowKey={(r) => `${r.original_part_id}`}
        dataSource={rows}
        columns={columns}
        loading={loading}
        size="small"
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
}
