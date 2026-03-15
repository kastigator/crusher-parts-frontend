import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Drawer, Row, Col, Card, Input, Button, List, Space, message, Modal, Typography, Tabs, Empty, Tree, Tag } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "@/api/axiosInstance";

const { Text } = Typography;

const NODE_TYPE_LABELS = {
  ROOT: "Корень",
  CATEGORY: "Категория",
  SUBCATEGORY: "Подкатегория",
  EQUIPMENT_TYPE: "Тип оборудования",
  MANUFACTURER_GROUP: "Группа производителей",
  MODEL_GROUP: "Группа моделей",
};

export default function ManufacturerModelPicker({
  open,
  onClose,
  onPick,                        // (manufacturer, model, meta?) => void
  initialManufacturerId = null,
  initialModelId = null,
  allowManufacturerOnly = false,
}) {
  const [activeTab, setActiveTab] = useState("manufacturer");
  // data
  const [manufacturers, setManufacturers] = useState([]);
  const [models, setModels] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientUnits, setClientUnits] = useState([]);
  const [classifierTree, setClassifierTree] = useState([]);
  const [classifierModels, setClassifierModels] = useState([]);

  // selection
  const [mfId, setMfId] = useState(initialManufacturerId);
  const [mdId, setMdId] = useState(initialModelId);
  const [clientId, setClientId] = useState(null);
  const [equipmentUnitId, setEquipmentUnitId] = useState(null);
  const [classifierNodeId, setClassifierNodeId] = useState(null);
  const [classifierModelId, setClassifierModelId] = useState(null);

  // search
  const [mfQ, setMfQ] = useState("");
  const [mdQ, setMdQ] = useState("");
  const [clientQ, setClientQ] = useState("");
  const [unitQ, setUnitQ] = useState("");
  const [classifierQ, setClassifierQ] = useState("");

  // inputs for create
  const [mfNew, setMfNew] = useState("");
  const [mdNew, setMdNew] = useState("");

  // loading flags
  const [loadingMf, setLoadingMf] = useState(false);
  const [loadingMd, setLoadingMd] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingClassifier, setLoadingClassifier] = useState(false);
  const [loadingClassifierModels, setLoadingClassifierModels] = useState(false);

  const buildTreeData = useCallback((nodes) => {
    return (nodes || []).map((node) => ({
      key: String(node.id),
      title: (
        <Space size={6}>
          <span>{node.name}</span>
              {node.node_type ? (
                <Tag bordered={false} color="blue">
                  {NODE_TYPE_LABELS[node.node_type] || node.node_type}
                </Tag>
              ) : null}
        </Space>
      ),
      children: buildTreeData(node.children || []),
    }));
  }, []);

  // ====== load manufacturers
  const loadManufacturers = useCallback(async () => {
    setLoadingMf(true);
    try {
      const { data } = await axios.get("/equipment-manufacturers");
      setManufacturers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e); message.error("Не удалось загрузить производителей");
    } finally { setLoadingMf(false); }
  }, []);

  // ====== load models by manufacturer
  const loadModels = useCallback(async (manufacturer_id) => {
    setLoadingMd(true);
    try {
      const { data } = await axios.get("/equipment-models", { params: { manufacturer_id } });
      setModels(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e); message.error("Не удалось загрузить модели");
    } finally { setLoadingMd(false); }
  }, []);

  const loadClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const { data } = await axios.get("/clients", { params: { limit: 500 } });
      setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      message.error("Не удалось загрузить клиентов");
    } finally {
      setLoadingClients(false);
    }
  }, []);

  const loadClientUnits = useCallback(async (nextClientId) => {
    if (!nextClientId) {
      setClientUnits([]);
      return;
    }
    setLoadingUnits(true);
    try {
      const { data } = await axios.get("/client-equipment-units", {
        params: { client_id: nextClientId, limit: 500 },
      });
      setClientUnits(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      message.error("Не удалось загрузить оборудование клиента");
    } finally {
      setLoadingUnits(false);
    }
  }, []);

  const loadClassifierTree = useCallback(async () => {
    setLoadingClassifier(true);
    try {
      const { data } = await axios.get("/equipment-classifier-nodes", {
        params: { tree: 1, limit: 5000 },
      });
      setClassifierTree(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      message.error("Не удалось загрузить классификатор");
    } finally {
      setLoadingClassifier(false);
    }
  }, []);

  const loadClassifierModels = useCallback(async (nextNodeId) => {
    if (!nextNodeId) {
      setClassifierModels([]);
      return;
    }
    setLoadingClassifierModels(true);
    try {
      const { data } = await axios.get("/equipment-models", {
        params: { classifier_node_id: nextNodeId },
      });
      setClassifierModels(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      message.error("Не удалось загрузить модели классификатора");
    } finally {
      setLoadingClassifierModels(false);
    }
  }, []);

  useEffect(() => { if (open) loadManufacturers(); }, [open, loadManufacturers]);
  useEffect(() => { if (open) loadClients(); }, [open, loadClients]);
  useEffect(() => { if (open) loadClassifierTree(); }, [open, loadClassifierTree]);
  useEffect(() => {
    if (!open) return;
    if (mfId) loadModels(mfId);
    else setModels([]);
    setMdId(null);
  }, [open, mfId, loadModels]);
  useEffect(() => {
    if (!open) return;
    loadClientUnits(clientId);
    setEquipmentUnitId(null);
  }, [open, clientId, loadClientUnits]);
  useEffect(() => {
    if (!open) return;
    loadClassifierModels(classifierNodeId);
    setClassifierModelId(null);
  }, [open, classifierNodeId, loadClassifierModels]);

  // ====== create / delete manufacturer
  const createManufacturer = async () => {
    const name = mfNew.trim();
    if (!name) return;
    try {
      const { data } = await axios.post("/equipment-manufacturers", { name });
      message.success("Производитель создан");
      setManufacturers(prev => [data, ...prev]);
      setMfId(data.id);
      setMfNew("");
    } catch (e) {
      console.error(e); message.error("Не удалось создать производителя");
    }
  };

  const deleteManufacturer = (id) => {
    Modal.confirm({
      title: "Удалить производителя?",
      content: "Связанные модели и детали будут удалены каскадом.",
      okType: "danger",
      onOk: async () => {
        try {
          await axios.delete(`/equipment-manufacturers/${id}`);
          setManufacturers(prev => prev.filter(x => x.id !== id));
          if (mfId === id) { setMfId(null); setModels([]); setMdId(null); }
          message.success("Производитель удалён");
        } catch (e) {
          if (e?.response?.status === 409) message.error("Нельзя удалить: есть связанные записи");
          else { console.error(e); message.error("Не удалось удалить производителя"); }
        }
      }
    });
  };

  // ====== create / delete model
  const createModel = async () => {
    const model_name = mdNew.trim();
    if (!mfId) { message.warning("Сначала выберите производителя"); return; }
    if (!model_name) return;
    try {
      const { data } = await axios.post("/equipment-models", { manufacturer_id: mfId, model_name });
      message.success("Модель создана");
      setModels(prev => [data, ...prev]);
      setMdId(data.id);
      setMdNew("");
    } catch (e) {
      console.error(e); message.error("Не удалось создать модель");
    }
  };

  const deleteModel = (id) => {
    Modal.confirm({
      title: "Удалить модель?",
      content: "Все детали этой модели будут удалены каскадом.",
      okType: "danger",
      onOk: async () => {
        try {
          await axios.delete(`/equipment-models/${id}`);
          setModels(prev => prev.filter(x => x.id !== id));
          if (mdId === id) setMdId(null);
          message.success("Модель удалена");
        } catch (e) {
          if (e?.response?.status === 409) message.error("Нельзя удалить: есть связанные записи");
          else { console.error(e); message.error("Не удалось удалить модель"); }
        }
      }
    });
  };

  // filters
  const mfFiltered = useMemo(() => {
    const q = mfQ.trim().toLowerCase();
    return q ? manufacturers.filter(m => (m.name || "").toLowerCase().includes(q)) : manufacturers;
  }, [manufacturers, mfQ]);

  const mdFiltered = useMemo(() => {
    const q = mdQ.trim().toLowerCase();
    return q ? models.filter(m => (m.model_name || "").toLowerCase().includes(q)) : models;
  }, [models, mdQ]);

  const clientsFiltered = useMemo(() => {
    const q = clientQ.trim().toLowerCase();
    return q
      ? clients.filter((c) => (c.company_name || "").toLowerCase().includes(q))
      : clients;
  }, [clients, clientQ]);

  const unitsFiltered = useMemo(() => {
    const q = unitQ.trim().toLowerCase();
    return q
      ? clientUnits.filter((u) =>
          [
            u.serial_number,
            u.model_name,
            u.manufacturer_name,
            u.site_name,
            u.internal_name,
          ]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : clientUnits;
  }, [clientUnits, unitQ]);

  const filteredClassifierTree = useMemo(() => {
    const q = classifierQ.trim().toLowerCase();
    if (!q) return buildTreeData(classifierTree);

    const filterNodes = (nodes) =>
      (nodes || [])
        .map((node) => {
          const children = filterNodes(node.children || []);
          const selfMatch = String(node.name || "").toLowerCase().includes(q);
          if (!selfMatch && !children.length) return null;
          return {
            ...node,
            children,
          };
        })
        .filter(Boolean);

    return buildTreeData(filterNodes(classifierTree));
  }, [classifierTree, classifierQ, buildTreeData]);

  const classifierModelsFiltered = useMemo(() => {
    const q = mdQ.trim().toLowerCase();
    return q
      ? classifierModels.filter((m) =>
          [m.model_name, m.manufacturer_name, m.model_code]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        )
      : classifierModels;
  }, [classifierModels, mdQ]);

  // choose
  const handlePick = () => {
    if (activeTab === "client") {
      const client = clients.find((c) => c.id === clientId) || null;
      const unit = clientUnits.find((u) => u.id === equipmentUnitId) || null;
      if (!client || !unit) {
        message.warning("Выберите клиента и конкретную единицу оборудования");
        return;
      }
      const mf = { id: unit.manufacturer_id || null, name: unit.manufacturer_name };
      const md = {
        id: unit.equipment_model_id,
        model_name: unit.model_name,
        manufacturer_id: unit.manufacturer_id || null,
      };
      onPick?.(mf, md, { mode: "client", client, equipmentUnit: unit });
      onClose?.();
      return;
    }

    if (activeTab === "classifier") {
      const model = classifierModels.find((m) => m.id === classifierModelId) || null;
      if (!model) {
        message.warning("Выберите модель оборудования из классификатора");
        return;
      }
      const mf = { id: model.manufacturer_id, name: model.manufacturer_name };
      const md = {
        id: model.id,
        model_name: model.model_name,
        manufacturer_id: model.manufacturer_id,
      };
      const node = findClassifierNode(classifierTree, classifierNodeId);
      onPick?.(mf, md, { mode: "classifier", classifierNode: node || null });
      onClose?.();
      return;
    }

    const mf = manufacturers.find(m => m.id === mfId) || null;
    const md = models.find(m => m.id === mdId) || null;
    if (!mf) { message.warning("Выберите производителя"); return; }
    if (!allowManufacturerOnly && !md) { message.warning("Выберите модель"); return; }
    onPick?.(mf, md, { mode: "manufacturer" });
    onClose?.();
  };

  const findClassifierNode = (nodes, id) => {
    for (const node of nodes || []) {
      if (Number(node.id) === Number(id)) return node;
      const inChildren = findClassifierNode(node.children || [], id);
      if (inChildren) return inChildren;
    }
    return null;
  };

  const selectedClient = clients.find((c) => c.id === clientId) || null;
  const selectedUnit = clientUnits.find((u) => u.id === equipmentUnitId) || null;
  const selectedClassifierNode = findClassifierNode(classifierTree, classifierNodeId);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={980}
      title="Контекст каталога OEM деталей"
      destroyOnClose
      extra={<Button type="primary" onClick={handlePick}>Выбрать</Button>}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "manufacturer",
            label: "По производителю и модели",
            children: (
              <Row gutter={16}>
        <Col span={10}>
          <Card title="Производители" size="small" extra={<Text type="secondary">{manufacturers.length}</Text>}>
            <Space.Compact style={{ width: "100%", marginBottom: 8 }}>
              <Input
                placeholder="Поиск производителя"
                value={mfQ}
                onChange={(e) => setMfQ(e.target.value)}
                allowClear
              />
            </Space.Compact>
            <Space.Compact style={{ width: "100%", marginBottom: 8 }}>
              <Input
                placeholder="Новый производитель"
                value={mfNew}
                onChange={(e) => setMfNew(e.target.value)}
                onPressEnter={createManufacturer}
              />
              <Button icon={<PlusOutlined />} onClick={createManufacturer}>Добавить</Button>
            </Space.Compact>
            <List
              bordered
              loading={loadingMf}
              dataSource={mfFiltered}
              renderItem={item => (
                <List.Item
                  onClick={() => setMfId(item.id)}
                  style={{ cursor: "pointer", background: item.id === mfId ? "#e6f4ff" : undefined }}
                  actions={[
                    <Button
                      key="del"
                      type="text"
                      icon={<DeleteOutlined />}
                      danger
                      onClick={(e) => { e.stopPropagation(); deleteManufacturer(item.id); }}
                    />
                  ]}
                >
                  {item.name}
                </List.Item>
              )}
              style={{ maxHeight: 420, overflow: "auto" }}
            />
          </Card>
        </Col>

        <Col span={14}>
          <Card
            title={mfId ? "Модели выбранного производителя" : "Сначала выберите производителя"}
            size="small"
            extra={<Text type="secondary">{models.length}</Text>}
          >
            <Space.Compact style={{ width: "100%", marginBottom: 8 }}>
              <Input
                placeholder="Поиск модели"
                value={mdQ}
                onChange={(e) => setMdQ(e.target.value)}
                allowClear
                disabled={!mfId}
              />
            </Space.Compact>
            <Space.Compact style={{ width: "100%", marginBottom: 8 }}>
              <Input
                placeholder="Новая модель"
                value={mdNew}
                onChange={(e) => setMdNew(e.target.value)}
                onPressEnter={createModel}
                disabled={!mfId}
              />
              <Button icon={<PlusOutlined />} onClick={createModel} disabled={!mfId}>Добавить</Button>
            </Space.Compact>
            <List
              bordered
              loading={loadingMd}
              dataSource={mdFiltered}
              renderItem={item => (
                <List.Item
                  onClick={() => setMdId(item.id)}
                  style={{ cursor: mfId ? "pointer" : "not-allowed", background: item.id === mdId ? "#e6f4ff" : undefined }}
                  actions={[
                    <Button
                      key="del"
                      type="text"
                      icon={<DeleteOutlined />}
                      danger
                      onClick={(e) => { e.stopPropagation(); deleteModel(item.id); }}
                    />
                  ]}
                >
                  {item.model_name}
                </List.Item>
              )}
              style={{ maxHeight: 420, overflow: "auto" }}
            />
          </Card>
        </Col>
      </Row>
            ),
          },
          {
            key: "client",
            label: "По клиенту и серийнику",
            children: (
              <Row gutter={16}>
                <Col span={9}>
                  <Card title="Клиенты" size="small" extra={<Text type="secondary">{clients.length}</Text>}>
                    <Input
                      placeholder="Поиск клиента"
                      value={clientQ}
                      onChange={(e) => setClientQ(e.target.value)}
                      allowClear
                      style={{ marginBottom: 8 }}
                    />
                    <List
                      bordered
                      loading={loadingClients}
                      dataSource={clientsFiltered}
                      renderItem={(item) => (
                        <List.Item
                          onClick={() => setClientId(item.id)}
                          style={{ cursor: "pointer", background: item.id === clientId ? "#e6f4ff" : undefined }}
                        >
                          {item.company_name}
                        </List.Item>
                      )}
                      style={{ maxHeight: 460, overflow: "auto" }}
                    />
                  </Card>
                </Col>
                <Col span={15}>
                  <Card
                    title={selectedClient ? `Оборудование клиента: ${selectedClient.company_name}` : "Сначала выберите клиента"}
                    size="small"
                    extra={<Text type="secondary">{clientUnits.length}</Text>}
                  >
                    <Input
                      placeholder="Поиск по модели, серийному номеру, площадке"
                      value={unitQ}
                      onChange={(e) => setUnitQ(e.target.value)}
                      allowClear
                      disabled={!clientId}
                      style={{ marginBottom: 8 }}
                    />
                    {selectedUnit ? (
                      <div style={{ marginBottom: 8 }}>
                        <Space wrap>
                          <Tag color="geekblue">{selectedUnit.manufacturer_name || "—"}</Tag>
                          <Tag color="blue">{selectedUnit.model_name || "—"}</Tag>
                          <Tag>{selectedUnit.serial_number || "без серийника"}</Tag>
                          {selectedUnit.manufacture_year ? <Tag>{selectedUnit.manufacture_year}</Tag> : null}
                        </Space>
                      </div>
                    ) : null}
                    <List
                      bordered
                      loading={loadingUnits}
                      dataSource={unitsFiltered}
                      locale={{ emptyText: clientId ? "У клиента пока нет оборудования" : "Сначала выберите клиента" }}
                      renderItem={(item) => (
                        <List.Item
                          onClick={() => setEquipmentUnitId(item.id)}
                          style={{ cursor: clientId ? "pointer" : "not-allowed", background: item.id === equipmentUnitId ? "#e6f4ff" : undefined }}
                        >
                          <Space direction="vertical" size={0}>
                            <Text strong>{item.manufacturer_name} / {item.model_name}</Text>
                            <Text type="secondary">
                              {item.serial_number || "без серийного номера"}
                              {item.site_name ? ` / ${item.site_name}` : ""}
                              {item.manufacture_year ? ` / г.в.${item.manufacture_year}` : ""}
                            </Text>
                          </Space>
                        </List.Item>
                      )}
                      style={{ maxHeight: 460, overflow: "auto" }}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: "classifier",
            label: "По типу оборудования",
            children: (
              <Row gutter={16}>
                <Col span={11}>
                  <Card title="Типы оборудования" size="small" extra={<Text type="secondary">Сначала выберите инженерный тип</Text>}>
                    <Input
                      placeholder="Поиск типа оборудования"
                      value={classifierQ}
                      onChange={(e) => setClassifierQ(e.target.value)}
                      allowClear
                      style={{ marginBottom: 8 }}
                    />
                    {filteredClassifierTree.length ? (
                      <Tree
                        treeData={filteredClassifierTree}
                        defaultExpandAll
                        selectedKeys={classifierNodeId ? [String(classifierNodeId)] : []}
                        onSelect={(keys) => setClassifierNodeId(Number(keys?.[0] || 0) || null)}
                        height={470}
                      />
                    ) : (
                      <Empty description={loadingClassifier ? "Загрузка..." : "Ничего не найдено"} />
                    )}
                  </Card>
                </Col>
                <Col span={13}>
                  <Card
                    title={selectedClassifierNode ? `Модели для типа: ${selectedClassifierNode.name}` : "Сначала выберите тип оборудования"}
                    size="small"
                    extra={<Text type="secondary">{classifierModels.length}</Text>}
                  >
                    <Input
                      placeholder="Поиск модели"
                      value={mdQ}
                      onChange={(e) => setMdQ(e.target.value)}
                      allowClear
                      disabled={!classifierNodeId}
                      style={{ marginBottom: 8 }}
                    />
                    <List
                      bordered
                      loading={loadingClassifierModels}
                      dataSource={classifierModelsFiltered}
                      locale={{ emptyText: classifierNodeId ? "Для этого типа оборудования моделей пока нет" : "Сначала выберите тип оборудования" }}
                      renderItem={(item) => (
                        <List.Item
                          onClick={() => setClassifierModelId(item.id)}
                          style={{ cursor: classifierNodeId ? "pointer" : "not-allowed", background: item.id === classifierModelId ? "#e6f4ff" : undefined }}
                        >
                          <Space direction="vertical" size={0}>
                            <Text strong>{item.manufacturer_name} / {item.model_name}</Text>
                            <Text type="secondary">{item.model_code || item.classifier_node_name || "—"}</Text>
                          </Space>
                        </List.Item>
                      )}
                      style={{ maxHeight: 470, overflow: "auto" }}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </Drawer>
  );
}
