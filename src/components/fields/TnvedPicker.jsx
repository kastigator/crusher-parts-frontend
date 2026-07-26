import React, { useEffect, useMemo, useRef, useState } from "react";
import { Select, Spin, Drawer, Table, Input, Space, Button, Tag, Divider, Typography, Empty } from "antd";
import { SearchOutlined, AppstoreOutlined, BulbOutlined } from "@ant-design/icons";
import axios from "@/api/axiosInstance";

const LS_KEY = "tnved_recent_v1";

function loadRecents() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.slice(0, 10) : [];
  } catch {
    return [];
  }
}

function saveRecent(item) {
  if (!item?.id) return;
  const prev = loadRecents().filter((x) => x.id !== item.id);
  const next = [item, ...prev].slice(0, 10);
  try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore storage errors */ }
}

export default function TnvedPicker({
  value,            // { id, code, description } | number | null
  onChange,         // (obj|null) => void
  placeholder = "Найти код ТН ВЭД…",
  allowClear = true,
  autoFocus = false,
  style,
  catalogPositionId = null,
  showReferenceButton = false,
}) {
  // ---- базовый инлайн-поиск
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);
  const dref = useRef();

  const normValue = useMemo(() => {
    if (!value) return undefined;
    if (typeof value === "number") return value;
    if (typeof value === "object" && value.id) return value.id;
    return undefined;
  }, [value]);

  const [recents, setRecents] = useState(loadRecents());
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionTokens, setSuggestionTokens] = useState([]);

  const fetchSearch = async (q) => {
    if (!q || !q.trim()) { setOpts([]); return; }
    setLoading(true);
    try {
      const { data } = await axios.get("/tnved-codes/search", { params: { q } });
      setOpts(Array.isArray(data) ? data : []);
    } catch {
      setOpts([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = (q) => {
    clearTimeout(dref.current);
    dref.current = setTimeout(() => fetchSearch(q), 250);
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!catalogPositionId) {
        setSuggestions([]);
        setSuggestionTokens([]);
        return;
      }
      setSuggestionsLoading(true);
      try {
        const { data } = await axios.get(`/catalog-positions/${catalogPositionId}/tnved-suggestions`);
        if (!alive) return;
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
        setSuggestionTokens(Array.isArray(data?.tokens) ? data.tokens : []);
      } catch (err) {
        console.error("GET /catalog-positions/:id/tnved-suggestions error:", err);
        if (alive) {
          setSuggestions([]);
          setSuggestionTokens([]);
        }
      } finally {
        if (alive) setSuggestionsLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [catalogPositionId]);

  // опции для Select (две группы: Недавние + Результаты)
  const recentOptions = recents.map((r) => ({
    value: r.id,
    label: `${r.code}${r.description ? " — " + r.description : ""}`,
    raw: r,
    _group: "recent",
  }));
  const resultOptions = opts.map((r) => ({
    value: r.id,
    label: `${r.code}${r.description ? " — " + r.description : ""}`,
    raw: r,
    _group: "result",
  }));
  const currentOption =
    value && typeof value === "object" && value.id && ![...recentOptions, ...resultOptions].some((item) => item.value === value.id)
      ? [{
          label: "Выбрано",
          options: [{
            value: value.id,
            label: `${value.code || value.id}${value.description ? " — " + value.description : ""}`,
            raw: value,
            _group: "current",
          }],
        }]
      : [];

  const groupedOptions = [
    ...currentOption,
    ...(recentOptions.length ? [{ label: "Недавние", options: recentOptions }] : []),
    { label: "Результаты", options: resultOptions },
  ];

  // ---- расширенный поиск (Drawer)
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [tLoading, setTLoading] = useState(false);
  const [pickedRow, setPickedRow] = useState(null);
  const [prefix, setPrefix] = useState(""); // фильтр по префиксу кода

  const loadAll = async () => {
    setTLoading(true);
    try {
      const { data } = await axios.get("/tnved-codes"); // все (ожидаем, что объём приемлемый)
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setTLoading(false);
    }
  };

  const searchDrawer = async (query) => {
    setTLoading(true);
    try {
      if (!query?.trim()) {
        await loadAll();
      } else {
        const { data } = await axios.get("/tnved-codes/search", { params: { q: query } });
        setRows(Array.isArray(data) ? data : []);
      }
    } finally {
      setTLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    // при первом открытии — загрузим всё
    loadAll();
  }, [open]);

  const filteredRows = useMemo(() => {
    if (!prefix) return rows;
    const p = prefix.replace(/\D/g, "");
    return rows.filter((r) => String(r.code || "").startsWith(p));
  }, [rows, prefix]);

  const columns = [
    { title: "Код", dataIndex: "code", width: 140 },
    { title: "Описание", dataIndex: "description" },
    { title: "Пошлина (%)", dataIndex: "duty_rate", width: 120, align: "right" },
    { title: "Примечания", dataIndex: "notes", ellipsis: true },
  ];

  // ---- обработчики
  const handlePick = (item) => {
    if (!item) {
      onChange?.(null);
      return;
    }
    const payload = { id: item.id, code: item.code, description: item.description };
    saveRecent(payload);
    setRecents(loadRecents());
    onChange?.(payload);
  };

  const renderCodeSummary = (item) => {
    if (!item?.code) return null;
    return (
      <Space direction="vertical" size={2} style={{ width: "100%" }}>
        <Space wrap size={6}>
          <Typography.Text strong>{item.code}</Typography.Text>
          {item.duty_rate !== undefined && item.duty_rate !== null ? <Tag>Пошлина {Number(item.duty_rate).toLocaleString("ru-RU")}%</Tag> : null}
        </Space>
        {item.description ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {item.description}
          </Typography.Text>
        ) : null}
      </Space>
    );
  };

  const currentValueLabel = value && typeof value === "object" ? `${value.code || ""}${value.description ? " — " + value.description : ""}` : "";

  return (
    <>
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Space.Compact style={{ width: "100%" }}>
          <Select
            showSearch
            allowClear={allowClear}
            filterOption={false}               // серверный поиск
            placeholder={placeholder}
            notFoundContent={loading ? <Spin size="small" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Начните вводить описание детали" />}
            onSearch={debouncedSearch}
            options={groupedOptions}
            value={normValue}
            onChange={(val, option) => {
              if (val == null) return handlePick(null);
              const raw = option?.raw || { id: val };
              handlePick(raw);
            }}
            style={style}
            autoFocus={autoFocus}
            title={currentValueLabel}
            // важно для стабильности попапа в таблицах/модалках
            getPopupContainer={() => document.body}
            dropdownMatchSelectWidth={false}
            virtual={false}
            listHeight={320}
            optionRender={(option) => renderCodeSummary(option.data.raw)}
          />
          {showReferenceButton ? (
            <Button type="default" onClick={() => setOpen(true)} icon={<AppstoreOutlined />}>
              Справочник
            </Button>
          ) : null}
        </Space.Compact>

        {catalogPositionId ? (
          <div
            style={{
              border: "1px solid #f0f0f0",
              borderRadius: 6,
              padding: 8,
              background: "#fafafa",
            }}
          >
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              <Space size={6} wrap>
                <BulbOutlined style={{ color: "#1677ff" }} />
                <Typography.Text strong style={{ fontSize: 12 }}>
                  Рекомендации по похожим позициям
                </Typography.Text>
                {suggestionsLoading ? <Spin size="small" /> : null}
                {suggestionTokens.slice(0, 4).map((token) => (
                  <Tag key={token}>{token}</Tag>
                ))}
              </Space>

              {!suggestionsLoading && !suggestions.length ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Пока нет заполненных похожих карточек. Можно найти код текстом выше.
                </Typography.Text>
              ) : null}

              {suggestions.slice(0, 4).map((item) => (
                <div
                  key={`${item.source}-${item.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: 8,
                    alignItems: "start",
                    padding: "7px 8px",
                    border: "1px solid #f0f0f0",
                    borderRadius: 6,
                    background: "#fff",
                  }}
                >
                  <Space direction="vertical" size={2} style={{ minWidth: 0 }}>
                    <Space size={6} wrap>
                      <Typography.Text strong>{item.code}</Typography.Text>
                      <Typography.Text>{item.description || "—"}</Typography.Text>
                      <Tag color={item.source === "same_bom" ? "blue" : item.source === "catalog" ? "green" : "default"}>
                        {item.source_label}
                      </Tag>
                    </Space>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {item.usage_count ? `Встречается: ${item.usage_count}` : "Кандидат"}
                      {item.examples?.length
                        ? ` · пример: ${[
                            item.examples[0].manufacturer_part_number,
                            item.examples[0].name,
                            item.examples[0].model_name,
                          ]
                            .filter(Boolean)
                            .join(" / ")}`
                        : ""}
                    </Typography.Text>
                  </Space>
                  <Button size="small" onClick={() => handlePick(item)}>
                    Применить
                  </Button>
                </div>
              ))}
            </Space>
          </div>
        ) : null}
      </Space>

      {showReferenceButton ? (
        <Drawer
          title="Справочник кодов ТН ВЭД"
          open={open}
          onClose={() => setOpen(false)}
          width={880}
          destroyOnHidden
        >
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Space wrap>
              <Input
                style={{ width: 360 }}
                prefix={<SearchOutlined />}
                placeholder="Искать по коду или описанию…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onPressEnter={() => searchDrawer(q)}
                allowClear
              />
              <Button onClick={() => searchDrawer(q)}>Искать</Button>

              <Divider type="vertical" />

              <span>Префикс кода:</span>
              <Space.Compact>
                {["", "2", "4", "6"].map((len, idx) => {
                  if (len === "") {
                    return (
                      <Button key={idx} onClick={() => setPrefix("")}>
                        Все
                      </Button>
                    );
                  }
                  return (
                    <Button
                      key={idx}
                      onClick={() => {
                        const base = (q && /^\d/.test(q)) ? q : "";
                        const pr = (base || "").replace(/\D/g, "").slice(0, Number(len));
                        setPrefix(pr);
                      }}
                    >
                      {len} цифры
                    </Button>
                  );
                })}
              </Space.Compact>

              {prefix && <Tag color="geekblue">Префикс: {prefix}</Tag>}
            </Space>

            <Table
              rowKey="id"
              size="middle"
              columns={columns}
              loading={tLoading}
              dataSource={filteredRows}
              pagination={{ pageSize: 12 }}
              rowSelection={{
                type: "radio",
                selectedRowKeys: pickedRow ? [pickedRow.id] : [],
                onChange: (_, rows) => setPickedRow(rows[0]),
              }}
              onRow={(record) => ({
                onDoubleClick: () => {
                  setPickedRow(record);
                  handlePick(record);
                  setOpen(false);
                },
              })}
            />

            <Space style={{ justifyContent: "flex-end", width: "100%" }}>
              <Button onClick={() => { setPickedRow(null); handlePick(null); }}>
                Очистить
              </Button>
              <Button
                type="primary"
                disabled={!pickedRow}
                onClick={() => { handlePick(pickedRow); setOpen(false); }}
              >
                Выбрать
              </Button>
            </Space>
          </Space>
        </Drawer>
      ) : null}
    </>
  );
}
