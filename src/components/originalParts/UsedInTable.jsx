import React, { useEffect, useState } from "react";
import { Table, message } from "antd";
import axios from "@/api/axiosInstance";

export default function UsedInTable({ partId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!partId) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/original-part-bom/used-in", {
        params: { child_id: partId },
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      message.error("Не удалось загрузить список родителей (где используется)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [partId]);

  return (
    <Table
      rowKey={(r) => `${r.parent_id}:${r.child_id}`}
      size="small"
      loading={loading}
      pagination={false}
      dataSource={rows}
      columns={[
        { title: "Parent Cat #", dataIndex: "parent_cat_number", width: 160 },
        {
          title: "Родитель",
          render: (_, r) => r.parent_description_ru || r.parent_description_en || "—",
        },
        {
          title: "Кол-во в родителе",
          dataIndex: "quantity",
          width: 160,
          render: (v) => Number(v ?? 0).toFixed(4),
        },
      ]}
      locale={{ emptyText: "Не используется ни в одной сборке" }}
    />
  );
}
