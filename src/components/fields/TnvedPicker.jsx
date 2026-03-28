import React, { useEffect, useMemo, useRef, useState } from "react";
import { Select, Spin, Drawer, Table, Input, Space, Button, Tag, Divider } from "antd";
import { SearchOutlined, AppstoreOutlined } from "@ant-design/icons";
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

  const groupedOptions = [
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

  return (
    <>
      <Space.Compact style={{ width: "100%" }}>
        <Select
          showSearch
          allowClear={allowClear}
          filterOption={false}               // серверный поиск
          placeholder={placeholder}
          notFoundContent={loading ? <Spin size="small" /> : null}
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
          // важно для стабильности попапа в таблицах/модалках
          getPopupContainer={() => document.body}
          dropdownMatchSelectWidth={false}
          virtual={false}
          listHeight={280}
        />
        <Button type="default" onClick={() => setOpen(true)} icon={<AppstoreOutlined />} />
      </Space.Compact>

      <Drawer
        title="Коды ТН ВЭД — расширенный поиск"
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
                      // если есть выбранная строка — возьмём её префикс; иначе — просто обрежем текущий ввод
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
    </>
  );
}
