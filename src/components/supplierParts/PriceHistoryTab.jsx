import React, { useEffect, useState, useCallback, useRef } from "react";
import { Table, Form, Input, InputNumber, DatePicker, Button, Space, message } from "antd";
import dayjs from "dayjs";
import axios from "@/api/axiosInstance";

export default function PriceHistoryTab({ supplierPartId }) {
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
      const { data } = await axios.get("/supplier-part-prices", {
        params: { supplier_part_id: supplierPartId },
        signal: controller.signal
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      const name = e?.name || e?.code;
      if (name !== "AbortError" && name !== "ERR_CANCELED") {
        console.error(e);
        message.error("Не удалось загрузить историю цен");
      }
    } finally {
      setLoading(false);
    }
  }, [supplierPartId]);

  useEffect(() => {
    const t = setTimeout(load, 150);
    return () => { clearTimeout(t); abortRef.current?.abort(); };
  }, [load, supplierPartId]);

  const addPrice = async () => {
    try {
      const v = await form.validateFields();
      setAdding(true);
      await axios.post("/supplier-part-prices", {
        supplier_part_id: supplierPartId,
        price: v.price,
        currency: v.currency || null,
        date: v.date ? v.date.toDate() : new Date(),
        comment: v.comment || null
      });
      message.success("Цена добавлена");
      form.resetFields();
      load();
    } catch (e) {
      if (!e?.errorFields) {
        console.error(e);
        message.error(e?.response?.data?.message || "Не удалось добавить цену");
      }
    } finally {
      setAdding(false);
    }
  };

  const columns = [
    { title: "Дата", dataIndex: "date", width: 160, render: v => v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—" },
    { title: "Цена", dataIndex: "price", width: 140 },
    { title: "Валюта", dataIndex: "currency", width: 100, render: v => v || "—" },
    { title: "Комментарий", dataIndex: "comment" },
  ];

  return (
    <div>
      <Form
        form={form}
        layout="inline"
        style={{ marginBottom: 12, flexWrap: "wrap", rowGap: 8 }}
      >
        <Form.Item
          name="price"
          label="Цена"
          rules={[{ required: true, message: "Укажите цену" }]}
        >
          <InputNumber min={0} step={0.01} style={{ width: 140 }} />
        </Form.Item>

        <Form.Item name="currency" label="Валюта (ISO3)">
          <Input placeholder="USD" maxLength={3} style={{ width: 120 }} onChange={e => {
            const v = e.target.value?.toUpperCase().slice(0, 3);
            form.setFieldsValue({ currency: v });
          }} />
        </Form.Item>

        <Form.Item name="date" label="Дата">
          <DatePicker showTime allowClear style={{ width: 200 }} />
        </Form.Item>

        <Form.Item name="comment" label="Комментарий" style={{ flex: 1 }}>
          <Input placeholder="По прайсу №…" style={{ minWidth: 200 }} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" onClick={addPrice} loading={adding}>
            Добавить
          </Button>
        </Form.Item>
      </Form>

      <Table
        rowKey="id"
        dataSource={rows}
        columns={columns}
        loading={loading}
        size="small"
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
}
