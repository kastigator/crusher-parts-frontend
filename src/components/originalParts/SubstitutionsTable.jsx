import React, { useEffect, useMemo, useState } from "react";
import { Table, message, Empty, Tooltip } from "antd";
import axios from "@/api/axiosInstance";
import ValueDisplay from "@/components/common/ValueDisplay";

export default function SubstitutionsTable({ part, originalPartId }) {
  const partId = useMemo(() => {
    if (originalPartId) return originalPartId;
    return part?.id;
  }, [originalPartId, part?.id]);

  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!partId) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/original-part-substitutions", {
        params: { part_id: partId },
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e?.response?.status === 404) {
        setRows([]);
      } else {
        console.error("Ошибка загрузки замен:", e);
        message.error("Не удалось загрузить замены");
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRows(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partId]);

  if (!loading && rows && rows.length === 0) {
    return (
      <div className="subtable-shell">
        <Empty description="Замен пока нет" />
      </div>
    );
  }

  const columns = [
    {
      title: "Группа",
      dataIndex: "group_code",
      width: 140,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Тип",
      dataIndex: "relation_type",
      width: 140,
      render: (v) => <ValueDisplay value={v} />,
    },
    {
      title: "Cat #",
      dataIndex: "cat_number",
      width: 180,
      render: (v, r) =>
        r?.cat_number_tooltip ? (
          <Tooltip title={r.cat_number_tooltip}>
            <span>{v}</span>
          </Tooltip>
        ) : (
          <ValueDisplay value={v} />
        ),
    },
    {
      title: "Описание",
      dataIndex: "description",
      render: (v) =>
        v ? (
          <Tooltip title={v}>
            <span
              style={{
                display: "inline-block",
                maxWidth: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {v}
            </span>
          </Tooltip>
        ) : (
          <ValueDisplay value={null} />
        ),
    },
  ];

  return (
    <div className="subtable-shell">
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        pagination={false}
        dataSource={rows || []}
        columns={columns}
        scroll={{ x: true }}
      />
    </div>
  );
}
