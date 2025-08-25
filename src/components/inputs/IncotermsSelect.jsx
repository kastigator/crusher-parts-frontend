// src/inputs/IncotermsSelect.jsx
import React from "react";
import { Select, Tooltip } from "antd";

const TERMS = [
  { code: "EXW", name: "Ex Works" },
  { code: "FCA", name: "Free Carrier" },
  { code: "FAS", name: "Free Alongside Ship" },
  { code: "FOB", name: "Free On Board" },
  { code: "CFR", name: "Cost and Freight" },
  { code: "CIF", name: "Cost, Insurance & Freight" },
  { code: "CPT", name: "Carriage Paid To" },
  { code: "CIP", name: "Carriage and Insurance Paid" },
  { code: "DAP", name: "Delivered At Place" },
  { code: "DPU", name: "Delivered at Place Unloaded" },
  { code: "DDP", name: "Delivered Duty Paid" },
];

const OPTIONS = TERMS.map(t => ({
  value: t.code,
  label: `${t.code} — ${t.name}`,
}));

export default function IncotermsSelect({
  value,
  onChange,
  allowClear = true,
  style,
  ...rest
}) {
  return (
    <Tooltip title="Incoterms 2020">
      <Select
        showSearch
        allowClear={allowClear}
        placeholder="Incoterms"
        value={value || undefined}
        onChange={(v) => onChange?.(v ?? null)}
        options={OPTIONS}
        filterOption={(input, option) =>
          (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
        }
        style={{ minWidth: 220, ...style }}
        {...rest}
      />
    </Tooltip>
  );
}
