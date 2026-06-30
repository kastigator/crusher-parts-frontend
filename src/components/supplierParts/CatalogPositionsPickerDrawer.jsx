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
  StopOutlined,
} from "@ant-design/icons";
import axios from "@/api/axiosInstance";

const { Text } = Typography;

/**
 * Drawer-подборщик позиций классификатора и BOM.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - excludeIds?: number[]      // ids позиций, уже привязанных
 * - onPick?: (rows: any[]) => void  // вызовется при подтверждении "Привязать выбранные"
 */
export default function CatalogPositionsPickerDrawer({
  open,
  onClose,
  excludeIds = [],
  title = "Подбор позиций каталога",
  confirmLabel = "Привязать выбранные",
  onPick,
}) {
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
    } catch {
      // ignore abort errors
    }
    abortRef.current = null;
  };

  const fetchList = useCallback(async () => {
    if (!open) return;

    // Без поиска не тянем весь каталог.
    if (!q.trim()) {
      setRows([]);
      return;
    }

    cancelIfRunning();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = {};
      if (q.trim()) params.q = q.trim();
      if (onlyAssemblies) params.only_assemblies = 1;
      if (onlyParts) params.only_parts = 1;
      params.limit = 100;

      const { data } = await axios.get("/catalog-positions", {
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
      message.error("Не удалось загрузить позиции каталога");
    } finally {
      setLoading(false);
    }
  }, [open, q, onlyAssemblies, onlyParts, excludeIds]);

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
        title: "Номер / код",
        dataIndex: "manufacturer_part_number",
        key: "manufacturer_part_number",
        width: 180,
        render: (v, r) => (
          <Space direction="vertical" size={2}>
            <Space size={6} wrap>
              <Text strong>{v || r.position_code || "—"}</Text>
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
              {r.source_kind === "model_bom" && <Tag color="blue">BOM модели</Tag>}
              {r.position_kind === "assembly" && <Tag color="gold">Сборка</Tag>}
            </Space>
          </Space>
        ),
      },
      {
        title: "Название",
        dataIndex: "display_name",
        key: "display_name",
        ellipsis: true,
        render: (v, r) =>
          r.display_name_ru || r.display_name_en || v || r.description || (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: "Раздел",
        dataIndex: "classifier_node_name",
        key: "classifier_node_name",
        width: 220,
        render: (v) => v || <Text type="secondary">—</Text>,
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
    fetchList();
  };

  const toolbar = (
    <Space style={{ width: "100%", marginBottom: 8 }} wrap align="center">
      <Input
        allowClear
        style={{ width: 280 }}
        placeholder="Номер, название, раздел классификатора"
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
        title={title}
        open={open}
        onClose={handleClose}
        destroyOnHidden
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
              {confirmLabel}
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

    </>
  );
}
