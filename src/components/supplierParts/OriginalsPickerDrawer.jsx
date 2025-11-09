import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Drawer,
  Table,
  Input,
  Space,
  Button,
  Checkbox,
  Tag,
  Typography,
  message,
  Tooltip,
} from "antd";
import {
  SearchOutlined,
  LinkOutlined,
  ReloadOutlined,
  ApartmentOutlined,
  StopOutlined,
} from "@ant-design/icons";
import axios from "@/api/axiosInstance";
import ManufacturerModelPicker from "@/components/originalParts/ManufacturerModelPicker";

const { Text } = Typography;

/**
 * Drawer-подборщик оригинальных деталей.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - excludeIds?: number[]      // ids оригиналов, уже привязанных (делаем disabled)
 * - onPick?: (rows: any[]) => void  // вызовется при подтверждении "Привязать выбранные"
 */
export default function OriginalsPickerDrawer({
  open,
  onClose,
  excludeIds = [],
  onPick,
}) {
  const [manufacturer, setManufacturer] = useState(null);
  const [model, setModel] = useState(null);

  const [pickerOpen, setPickerOpen] = useState(false);

  const [q, setQ] = useState("");
  const [onlyAssemblies, setOnlyAssemblies] = useState(false);
  const [onlyParts, setOnlyParts] = useState(false);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const abortRef = useRef(null);

  const cancelIfRunning = () => {
    try {
      abortRef.current?.abort?.();
    } catch {}
    abortRef.current = null;
  };

  const fetchList = useCallback(async () => {
    if (!open) return;

    // Без фильтров и поиска не тянем всю БД
    if (!model?.id && !manufacturer?.id && !q.trim()) {
      setRows([]);
      return;
    }

    cancelIfRunning();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = {};
      if (manufacturer?.id) params.manufacturer_id = manufacturer.id;
      if (model?.id) params.equipment_model_id = model.id;
      if (q.trim()) params.q = q.trim();
      if (onlyAssemblies) params.only_assemblies = 1;
      if (onlyParts) params.only_parts = 1;

      const { data } = await axios.get("/original-parts", {
        params,
        signal: controller.signal,
      });
      const list = Array.isArray(data) ? data : [];

      const excl = new Set((excludeIds || []).map(Number));
      const filtered = list.map((r) => ({
        ...r,
        _disabled: excl.has(Number(r.id)),
      }));

      setRows(filtered);
    } catch (e) {
      if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;
      console.error(e);
      message.error("Не удалось загрузить оригинальные детали");
    } finally {
      setLoading(false);
    }
  }, [
    open,
    manufacturer?.id,
    model?.id,
    q,
    onlyAssemblies,
    onlyParts,
    excludeIds,
  ]);

  // авто-загрузка при изменении фильтров/поиска
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
        title: "Part number",
        dataIndex: "cat_number",
        key: "cat_number",
        width: 180,
        render: (v, r) => (
          <Space direction="vertical" size={2}>
            <Space size={6} wrap>
              <Text strong>{v}</Text>
              {r._disabled && (
                <Tooltip title="Уже привязано — выбор отключён">
                  <StopOutlined style={{ opacity: 0.65 }} />
                </Tooltip>
              )}
            </Space>
            <Space size={6} wrap>
              {r.manufacturer_name && (
                <Tag color="geekblue">{r.manufacturer_name}</Tag>
              )}
              {r.model_name && <Tag>{r.model_name}</Tag>}
              {r.children_count > 0 && <Tag color="gold">Сборка</Tag>}
            </Space>
          </Space>
        ),
      },
      {
        title: "Описание",
        dataIndex: "description_ru",
        key: "description_ru",
        ellipsis: true,
        render: (v, r) =>
          v || r.description_en || r.tech_description || (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: "ТН ВЭД",
        dataIndex: "tnved_code_text",
        key: "tnved_code_text",
        width: 120,
        render: (v) =>
          v ? (
            <Tag color="processing">{v}</Tag>
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
    ],
    []
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record) => ({
      disabled: record._disabled === true,
    }),
  };

  const selectedRows = useMemo(() => {
    const map = new Map(rows.map((r) => [r.id, r]));
    return selectedRowKeys.map((id) => map.get(id)).filter(Boolean);
  }, [selectedRowKeys, rows]);

  const onRow = (record) => ({
    onDoubleClick: () => {
      if (record._disabled) return;
      setSelectedRowKeys((prev) => {
        const has = prev.includes(record.id);
        if (has) return prev.filter((k) => k !== record.id);
        return [...prev, record.id];
      });
    },
  });

  const rowClassName = (record) =>
    record._disabled ? "row-disabled" : "";

  const doPick = () => {
    if (!selectedRows.length) {
      message.info("Ничего не выбрано");
      return;
    }
    onPick?.(selectedRows);
  };

  const handleClose = () => {
    setSelectedRowKeys([]);
    cancelIfRunning();
    onClose?.();
  };

  const resetFilters = () => {
    setQ("");
    setOnlyAssemblies(false);
    setOnlyParts(false);
    // производителя/модель НЕ сбрасываем — это основное ограничение каталога
    fetchList();
  };

  const toolbar = (
    <Space style={{ width: "100%", marginBottom: 8 }} wrap align="center">
      <Input
        allowClear
        style={{ width: 280 }}
        placeholder="Поиск по номеру и описанию"
        value={q}
        prefix={<SearchOutlined />}
        onChange={(e) => setQ(e.target.value)}
        onPressEnter={fetchList}
      />

      <Checkbox
        checked={onlyAssemblies}
        onChange={(e) => {
          setOnlyAssemblies(e.target.checked);
          if (e.target.checked) setOnlyParts(false);
        }}
      >
        Только сборки
      </Checkbox>

      <Checkbox
        checked={onlyParts}
        onChange={(e) => {
          setOnlyParts(e.target.checked);
          if (e.target.checked) setOnlyAssemblies(false);
        }}
      >
        Только детали
      </Checkbox>

      <Space style={{ marginLeft: "auto" }} wrap align="center">
        {manufacturer && (
          <Tag color="geekblue">Производитель: {manufacturer.name}</Tag>
        )}
        {model && <Tag color="blue">Модель: {model.model_name}</Tag>}

        <Button
          icon={<ApartmentOutlined />}
          onClick={() => setPickerOpen(true)}
        >
          Выбрать произв./модель
        </Button>

        {(q || onlyAssemblies || onlyParts) && (
          <Button icon={<ReloadOutlined />} onClick={resetFilters}>
            Сбросить фильтры
          </Button>
        )}

        <Text type="secondary">
          Найдено: <Text strong>{rows.length}</Text>
        </Text>
      </Space>
    </Space>
  );

  return (
    <>
      <Drawer
        title="Подбор оригинальных деталей"
        open={open}
        onClose={handleClose}
        destroyOnClose
        width={1000}
        extra={
          <Space>
            <Text type="secondary">
              Выбрано: <Text strong>{selectedRows.length}</Text>
            </Text>
            <Button
              type="primary"
              icon={<LinkOutlined />}
              disabled={!selectedRows.length}
              onClick={doPick}
            >
              Привязать выбранные
            </Button>
          </Space>
        }
      >
        {toolbar}

        <Table
          size="middle"
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          rowSelection={rowSelection}
          onRow={onRow}
          rowClassName={rowClassName}
          pagination={{ pageSize: 12, showSizeChanger: false }}
        />
      </Drawer>

      <ManufacturerModelPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(mf, md) => {
          setManufacturer(mf);
          setModel(md);
        }}
      />
    </>
  );
}
