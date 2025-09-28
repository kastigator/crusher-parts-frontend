import React, { useEffect, useMemo, useState } from "react";
import { Table, message, Empty } from "antd";
import axios from "@/api/axiosInstance";

const fmt4 = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

export default function BomExploded({ root }) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!root?.id) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`/original-part-bom/tree/${root.id}`);
      setTree(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Ошибка загрузки Exploded:", e);
      message.error("Не удалось загрузить данные для Exploded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root?.id]);

  const exploded = useMemo(() => {
    const map = new Map();
    for (const r of tree) {
      if (r.node_id === root?.id) continue;
      const key = r.node_id;
      const current = map.get(key) || {
        node_id: key,
        cat_number: r.cat_number,
        description_en: r.description_en,
        description_ru: r.description_ru,
        total_qty: 0,
      };
      current.total_qty += Number(r.mult_qty || 0);
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) =>
      String(a.cat_number || "").localeCompare(String(b.cat_number || ""))
    );
  }, [tree, root?.id]);

  const columns = [
    { title: "Cat #", dataIndex: "cat_number", width: 160 },
    { title: "Описание", render: (_, r) => r.description_ru || r.description_en || "—" },
    {
      title: "Итого кол-во",
      dataIndex: "total_qty",
      width: 160,
      align: "right",
      render: (v) => fmt4.format(Number(v ?? 0)),
    },
  ];

  if (!loading && exploded.length === 0) {
    return <Empty description="Нет дочерних позиций" style={{ margin: 12 }} />;
  }

  return (
    <Table
      rowKey="node_id"
      size="small"
      loading={loading}
      pagination={false}
      dataSource={exploded}
      columns={columns}
      scroll={{ x: true }}
    />
  );
}
