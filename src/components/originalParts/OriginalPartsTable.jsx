// src/components/originalParts/OriginalPartsTable.jsx
import React, { useMemo, useState } from "react";
import { Table, Input, InputNumber, Tabs, message, Tooltip } from "antd";
import axios from "@/api/axiosInstance";
import ValueDisplay from "@/components/common/ValueDisplay";
import ActionButtons from "@/components/common/ActionButtons";
import FullHistoryDialog from "@/components/common/FullHistoryDialog";
import confirmAction from "@/utils/confirmAction";

import BomTable from "./BomTable";
import BomTree from "./BomTree";
import SubstitutionsTable from "./SubstitutionsTable";
import UsedInTable from "./UsedInTable";
import TnvedPicker from "@/components/fields/TnvedPicker";

export default function OriginalPartsTable({ data, loading, modelId, onReload, onRemove }) {
  const [editing, setEditing] = useState(null); // { id, field } | null
  const [draft, setDraft] = useState(null);
  const [historyForId, setHistoryForId] = useState(null);

  const isEditingCell = (record, field) =>
    editing && editing.id === record.id && editing.field === field;

  const startEditCell = (record, field) => {
    setEditing({ id: record.id, field });
    setDraft({ ...record });
  };
  const cancelEdit = () => { setEditing(null); setDraft(null); };

  const norm = (field, value) => {
    if (value === "" || value === undefined) return null;
    if (field === "weight_kg") {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    return typeof value === "string" ? value.trim() : value;
  };

  const saveField = async (record, field, rawValue) => {
    const value = norm(field, rawValue);
    const current = norm(field, record[field]);
    if (value === current) return cancelEdit();

    try {
      await axios.put(`/original-parts/${record.id}`, { [field]: value });
      message.success("Сохранено");
      cancelEdit();
      await onReload?.();
    } catch (err) {
      if (err?.response?.status === 409) {
        message.error("Дубликат Part number в этой модели");
      } else {
        message.error(err?.response?.data?.message || "Не удалось сохранить");
      }
      cancelEdit();
    }
  };

  const saveTnved = async (record, picked) => {
    try {
      const body = picked && picked.id ? { tnved_code_id: picked.id } : { tnved_code_id: null };
      await axios.patch(`/original-parts/${record.id}/tnved`, body);
      message.success(picked ? "Код ТН ВЭД обновлён" : "Код ТН ВЭД снят");
      cancelEdit();
      await onReload?.();
    } catch (err) {
      message.error(err?.response?.data?.message || "Не удалось сохранить ТН ВЭД");
      cancelEdit();
    }
  };

  const deleteRow = async (record) => {
    const { confirmed } = await confirmAction("Удалить деталь?");
    if (!confirmed) return;
    try {
      await axios.delete(`/original-parts/${record.id}`);
      message.success("Деталь удалена");
      if (onRemove) onRemove(record.id);
      else await onReload?.();
    } catch (err) {
      if (err?.response?.status === 409) {
        message.error("Удаление невозможно: есть связанные записи");
      } else {
        message.error("Не удалось удалить");
      }
    }
  };

  const renderTextInput = (record, field, { autoFocus = true, multiline = false } = {}) =>
    multiline ? (
      <Input.TextArea
        rows={3}
        value={draft?.[field] ?? ""}
        onChange={(e) => setDraft((p) => ({ ...p, [field]: e.target.value }))}
        onBlur={() => saveField(record, field, draft?.[field] ?? "")}
        onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
        autoSize={{ minRows: 2, maxRows: 6 }}
        autoFocus={autoFocus}
      />
    ) : (
      <Input
        value={draft?.[field] ?? ""}
        onChange={(e) => setDraft((p) => ({ ...p, [field]: e.target.value }))}
        onPressEnter={() => saveField(record, field, draft?.[field] ?? "")}
        onBlur={() => saveField(record, field, draft?.[field] ?? "")}
        onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
        autoFocus={autoFocus}
      />
    );

  const renderNumberInput = (record, field) => (
    <InputNumber
      min={0}
      step={0.001}
      style={{ width: "100%" }}
      value={draft?.[field] ?? record[field] ?? null}
      onChange={(val) => setDraft((p) => ({ ...p, [field]: val }))}
      onBlur={() => saveField(record, field, draft?.[field])}
      onPressEnter={() => saveField(record, field, draft?.[field])}
      autoFocus
    />
  );

  const renderTnvedDisplay = (record) => {
    const codeText =
      record.tnved_code_text ??
      record.tnved_code ??
      (record.tnved_code_id ? String(record.tnved_code_id) : null);
    if (!codeText) return <ValueDisplay value={null} />;
    return <Tooltip title={record.tnved_description || null}><span>{codeText}</span></Tooltip>;
  };

  const renderTnvedEditor = (record) => {
    const valueObj =
      record.tnved_code_id || record.tnved_code_text
        ? { id: record.tnved_code_id ?? null, code: record.tnved_code_text ?? null }
        : null;
    return (
      <div onKeyDown={(e) => e.key === "Escape" && cancelEdit()} style={{ minWidth: 240 }}>
        <TnvedPicker value={valueObj} onChange={(picked) => saveTnved(record, picked)} allowClear autoFocus />
      </div>
    );
  };

  const renderTechDisplay = (record) => {
    const v = record.tech_description;
    if (!v) return <ValueDisplay value={null} />;
    return (
      <Tooltip title={v}>
        <span style={{ display:"inline-block", maxWidth:420, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {v}
        </span>
      </Tooltip>
    );
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  const columns = useMemo(() => [
    {
      title: "Part number",
      dataIndex: "cat_number",
      width: 180,
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "cat_number") }),
      render: (_, r) => isEditingCell(r, "cat_number") ? renderTextInput(r, "cat_number") : <ValueDisplay value={r.cat_number} />
    },
    {
      title: "Описание (RU)",
      dataIndex: "description_ru",
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "description_ru") }),
      render: (_, r) => isEditingCell(r, "description_ru") ? renderTextInput(r, "description_ru", { multiline:true }) : <ValueDisplay value={r.description_ru} />
    },
    {
      title: "Description (EN)",
      dataIndex: "description_en",
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "description_en") }),
      render: (_, r) => isEditingCell(r, "description_en") ? renderTextInput(r, "description_en", { multiline:true }) : <ValueDisplay value={r.description_en} />
    },
    {
      title: "Тех. описание",
      dataIndex: "tech_description",
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "tech_description") }),
      render: (_, r) => isEditingCell(r, "tech_description") ? renderTextInput(r, "tech_description", { multiline:true }) : renderTechDisplay(r)
    },
    {
      title: "Вес, кг",
      dataIndex: "weight_kg",
      width: 110,
      align: "right",
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "weight_kg") }),
      render: (_, r) => isEditingCell(r, "weight_kg") ? renderNumberInput(r, "weight_kg") : <ValueDisplay value={r.weight_kg} />
    },
    {
      title: "ТН ВЭД",
      dataIndex: "tnved_code_text",
      width: 240,
      onCell: (record) => ({ onDoubleClick: () => startEditCell(record, "tnved_code") }),
      render: (_, r) => isEditingCell(r, "tnved_code") ? renderTnvedEditor(r) : renderTnvedDisplay(r)
    },
    {
      title: "Сборка",
      dataIndex: "is_assembly",
      width: 100,
      align: "center",
      render: (_, r) => (r.children_count > 0 ? `Да (${r.children_count})` : "Нет")
    },
    {
      title: "Действия",
      key: "actions",
      width: 140,
      render: (_, r) => (
        <ActionButtons
          onHistory={() => setHistoryForId(r.id)}
          onDelete={() => deleteRow(r)}
          size="small"
        />
      )
    }
  ], [editing, draft]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // ⬇️ ключ: фиксируем ширину expand-колонки и «вдвигаем» подтаблицу
  const EXPAND_COL_W = 48;

  const expandedRowRender = (part) => {
    if (!part?.id) return null;
    return (
      <div className="parts-subtable subtable-inset">
        <Tabs
          defaultActiveKey="bom"
          destroyInactiveTabPane
          items={[
            { key: "bom",     label: "BOM (таблица)",     children: <BomTable parent={part} modelId={modelId} onReload={onReload} /> },
            { key: "tree",    label: "BOM (дерево)",       children: <BomTree  rootId={part.id} /> },
            { key: "usedin",  label: "Где используется",   children: <UsedInTable partId={part.id} /> },
            { key: "subs",    label: "Замены (комплекты)", children: <SubstitutionsTable originalPartId={part.id} /> },
          ]}
        />
      </div>
    );
  };

  return (
    <>
      <Table
        className="op-table parts-table"
        rowKey="id"
        dataSource={data}
        columns={columns}
        loading={loading}
        expandable={{ expandedRowRender, columnWidth: EXPAND_COL_W }}
        pagination={{ pageSize: 10 }}
        size="middle"
        // пробрасываем ширину колонки expand в CSS-переменную
        style={{ "--op-expand-w": `${EXPAND_COL_W}px` }}
      />

      {historyForId && (
        <FullHistoryDialog
          entityType="original_parts"
          entityId={historyForId}
          onClose={() => setHistoryForId(null)}
        />
      )}
    </>
  );
}
