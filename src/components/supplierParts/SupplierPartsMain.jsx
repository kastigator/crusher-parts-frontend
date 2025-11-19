// src/components/supplierParts/SupplierPartsMain.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Space,
  Button,
  Tag,
  message,
  Input,
  Form,
  InputNumber,
} from "antd";
import {
  TeamOutlined,
  ImportOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import TableToolbar from "@/components/common/TableToolbar";
import SupplierPickerDrawer from "./SupplierPickerDrawer";
import SupplierPartsTable from "./SupplierPartsTable";
import SupplierPartDock from "./SupplierPartDock";
import ImportModal from "@/components/common/ImportModal";
import axios from "@/api/axiosInstance";
import { getCountryLabel } from "@/components/inputs/CountrySelect";

const SUPPLIER_TEMPLATE_URL =
  "https://storage.googleapis.com/shared-parts-bucket/templates/supplier_parts_template.xlsx";

export default function SupplierPartsMain() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [supplier, setSupplier] = useState(null);
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(0);
  const [importOpen, setImportOpen] = useState(false);

  const [form] = Form.useForm();
  const [adding, setAdding] = useState(false);

  // выбранная деталь для нижнего дока
  const [selectedPart, setSelectedPart] = useState(null);

  // deep-link параметры
  const [params] = useSearchParams();
  const focusId = params.get("focus"); // supplier_part_id для авто-открытия
  const supplierIdParam = params.get("supplierId"); // выбрать поставщика без фокуса

  // при смене поставщика — сбрасываем выбор и поиск
  useEffect(() => {
    setSelectedPart(null);
    setSearch("");
  }, [supplier?.id]);

  const clearSupplier = () => {
    setSupplier(null);
    setSelectedPart(null);
    setSearch("");
    setVersion((v) => v + 1);
  };

  const supplierSummary = useMemo(() => {
    if (!supplier) return null;
    const title = supplier.company || supplier.name;
    const countryLabel = supplier.country
      ? getCountryLabel(supplier.country, "ru")
      : null;

    return (
      <Space wrap size={[8, 8]}>
        <Tag color="geekblue">Поставщик: {title}</Tag>
        {countryLabel ? <Tag>{countryLabel}</Tag> : null}
        {supplier.phone ? <Tag>{supplier.phone}</Tag> : null}
        {supplier.email ? <Tag>{supplier.email}</Tag> : null}
        <Button size="small" onClick={clearSupplier} icon={<ReloadOutlined />}>
          Сбросить
        </Button>
      </Space>
    );
  }, [supplier]);

  const handleImportClick = () => {
    if (!supplier?.id) {
      message.warning("Сначала выберите поставщика");
      return;
    }
    setImportOpen(true);
  };

  const handleAdd = async () => {
    if (!supplier?.id) {
      message.warning("Сначала выберите поставщика");
      return;
    }
    try {
      const v = await form.validateFields();
      setAdding(true);
      await axios.post("/supplier-parts", {
        supplier_id: supplier.id,
        supplier_part_number: v.supplier_part_number,
        description: v.description || null,
        comment: v.comment || null,        // 👈 отправляем комментарий
        lead_time_days: v.lead_time_days ?? null,
      });
      message.success("Деталь поставщика создана");
      form.resetFields();
      setVersion((x) => x + 1);
    } catch (e) {
      if (e?.response?.data?.message) message.error(e.response.data.message);
      else if (!e?.errorFields) {
        console.error(e);
        message.error("Не удалось создать деталь");
      }
    } finally {
      setAdding(false);
    }
  };

  // Инициализация только по supplierId (когда нет focus)
  useEffect(() => {
    const initSupplierOnly = async () => {
      const sid = supplierIdParam && Number(supplierIdParam);
      if (!sid || focusId) return;
      try {
        const { data } = await axios.get(`/part-suppliers/${sid}`);
        if (!data) return;
        setSupplier({
          id: data.id,
          company: data.company || data.name || `#${data.id}`,
          country: data.country || null,
          phone: data.phone || null,
          email: data.email || null,
        });
        setVersion((v) => v + 1);
      } catch (e) {
        console.error("supplierId init failed", e);
      }
    };
    initSupplierOnly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierIdParam, focusId]);

  // Инициализация по focus=ID (открыть конкретную деталь)
  useEffect(() => {
    const initFromFocus = async () => {
      const id = focusId && Number(focusId);
      if (!id) return;
      try {
        const { data } = await axios.get(`/supplier-parts/${id}`);
        if (!data) return;

        setSupplier({
          id: data.supplier_id,
          company:
            data.supplier_name ||
            data.company ||
            data.name ||
            `#${data.supplier_id}`,
          country: data.supplier_country || null,
          phone: data.supplier_phone || null,
          email: data.supplier_email || null,
        });

        setVersion((v) => v + 1);
        setSelectedPart({ id: data.id, ...data });

        setTimeout(() => {
          const row = document.querySelector(`[data-row-key="${id}"]`);
          if (row) row.scrollIntoView({ block: "center", behavior: "smooth" });
        }, 150);
      } catch (e) {
        console.error("focus open failed", e);
      }
    };
    initFromFocus();
  }, [focusId]);

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card bodyStyle={{ paddingTop: 8 }}>
        {/* Ряд 1: выбор поставщика и действия */}
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12}>
            <Space wrap>
              <Button icon={<TeamOutlined />} onClick={() => setPickerOpen(true)}>
                {supplier ? "Изменить поставщика" : "Выбрать поставщика"}
              </Button>
              {supplierSummary}
            </Space>
          </Col>

          <Col
            xs={24}
            md={12}
            style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
          >
            <Button
              icon={<ImportOutlined />}
              onClick={handleImportClick}
              disabled={!supplier}
            >
              Импорт
            </Button>
          </Col>
        </Row>

        {/* Поиск */}
        <div className="table-section">
          <TableToolbar
            placeholder="Поиск по номеру/описанию/комплектам…"
            search={search}
            onSearch={setSearch}
            disabled={!supplier}
          />
        </div>

        {/* Форма добавления */}
        <div className="table-section">
          <Form form={form} layout="inline" disabled={!supplier}>
            <Form.Item
              name="supplier_part_number"
              label="№ у поставщика"
              rules={[{ required: true, message: "Укажите номер" }]}
            >
              <Input placeholder="например, P-12345" style={{ width: 240 }} />
            </Form.Item>

            <Form.Item name="description" label="Описание" style={{ flex: 1 }}>
              <Input placeholder="Короткое описание" style={{ minWidth: 220 }} />
            </Form.Item>

            <Form.Item name="comment" label="Комментарий" style={{ flex: 1 }}>
              <Input
                placeholder="Внутренний комментарий"
                style={{ minWidth: 220 }}
              />
            </Form.Item>

            <Form.Item name="lead_time_days" label="Срок поставки, дней">
              <InputNumber
                min={0}
                max={365}
                style={{ width: 140 }}
                placeholder="например, 30"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
                loading={adding}
                disabled={!supplier}
              >
                Добавить деталь
              </Button>
            </Form.Item>
          </Form>
        </div>

        {/* Таблица */}
        <SupplierPartsTable
          supplierId={supplier?.id || null}
          search={search}
          version={version}
          onReload={() => setVersion((v) => v + 1)}
          selectedId={selectedPart?.id || null}
          onSelectPart={setSelectedPart}
        />
      </Card>

      {/* Нижняя панель с вкладками по выбранной детали */}
      <SupplierPartDock
        part={selectedPart}
        onChanged={() => setVersion((v) => v + 1)}
      />

      {/* Drawer выбора поставщика */}
      <SupplierPickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(s) => {
          setSupplier(s);
          setPickerOpen(false);
          setVersion((v) => v + 1);
        }}
        initialSupplierId={supplier?.id ?? null}
      />

      {/* Импорт */}
      <ImportModal
        open={importOpen}
        type="supplier_parts"
        templateUrl={SUPPLIER_TEMPLATE_URL}
        extraParams={{ supplier_id: supplier?.id }}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          setImportOpen(false);
          setVersion((v) => v + 1);
          message.success("Импорт выполнен");
        }}
      />
    </Space>
  );
}
