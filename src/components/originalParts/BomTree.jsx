import React, { useEffect, useState } from "react";
import { Empty, Tree, message } from "antd";
import axios from "@/api/axiosInstance";

function mapToTree(nodes) {
  // backend выдаёт плоский массив с полями: id, cat_number, description_ru, children:[...]
  const toNode = (n) => ({
    key: n.id,
    title: n.cat_number + (n.description_ru ? ` — ${n.description_ru}` : ""),
    children: (n.children || []).map(toNode),
  });
  return nodes?.length ? nodes.map(toNode) : [];
}

export default function BomTree({ rootId, version }) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!rootId) { setTree([]); return; }
    setLoading(true);
    try {
      const { data } = await axios.get(`/original-part-bom/tree/${rootId}`);
      setTree(mapToTree(Array.isArray(data) ? data : [data]));
    } catch (e) {
      console.error(e);
      message.error("Не удалось загрузить дерево BOM");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [rootId, version]);

  if (!rootId) return <Empty description="Выберите деталь выше" />;
  return tree.length ? <Tree treeData={tree} loading={loading} defaultExpandAll /> :
    <Empty description="Дерево пусто" />;
}
