// src/components/supplierParts/SupplierPartsMain.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Card, Row, Col, Space, Button, Tag, message, Input, Form } from "antd";
import { TeamOutlined, ReloadOutlined, ImportOutlined, PlusOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";          // ✅ добавлено
import TableToolbar from "@/components/common/TableToolbar";
import SupplierPickerDrawer from "./SupplierPickerDrawer";
import SupplierPartsTable from "./SupplierPartsTable";
import SupplierPartDock from "./SupplierPartDock";
import ImportModal from "@/components/common/ImportModal";
import axios from "@/api/axiosInstance";

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

  // ✅ deep-link ?focus=<supplier_part_id>
  const [params] = useSearchParams();
  const focusId = params.get("focus");

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
    return (
      <Space wrap size={[8, 8]}>
        <Tag color="geekblue">Поставщик: {title}</Tag>
        {supplier.country ? <Tag>{supplier.country}</Tag> : null}
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

  // ✅ эффект глубокого перехода ?focus=ID
  useEffect(() => {
    const initFromFocus = async () => {
      const id = focusId && Number(focusId);
      if (!id) return;
      try {
        // Желательно иметь этот эндпоинт:
        //   GET /supplier-parts/:id -> { id, supplier_id, supplier_name, ... }
        const { data } = await axios.get(`/supplier-parts/${id}`);
        if (!data) return;

        // 1) выставляем поставщика (минимальный набор полей)
        setSupplier({
          id: data.supplier_id,
          company: data.supplier_name || data.company || data.name || `#${data.supplier_id}`,
        });

        // 2) заставим таблицу перечитать строки выбранного поставщика
        setVersion((v) => v + 1);

        // 3) выделим нужную деталь внизу
        setSelectedPart({ id: data.id, ...data });

        // 4) мягко прокрутим к строке, когда она появится в DOM
        // дадим таблице один кадр на ререндер
        requestAnimationFrame(() => {
          const row = document.querySelector(`[data-row-key="${id}"]`);
          if (row) row.scrollIntoView({ block: "center", behavior: "smooth" });
        });
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
            <Button icon={<ImportOutlined />} onClick={handleImportClick} disabled={!supplier}>
              Импорт
            </Button>
          </Col>
        </Row>

        {/* Поиск */}
        <div className="table-section">
          <TableToolbar
            placeholder="Поиск по номеру/описанию…"
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
              <Input placeholder="Короткое описание" style={{ minWidth: 260 }} />
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
      <SupplierPartDock part={selectedPart} onChanged={() => setVersion((v) => v + 1)} />

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
