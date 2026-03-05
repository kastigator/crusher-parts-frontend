import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Drawer, Row, Col, Card, Input, Button, List, Space, message, Modal, Typography } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "@/api/axiosInstance";

const { Text } = Typography;

export default function ManufacturerModelPicker({
  open,
  onClose,
  onPick,                        // (manufacturer, model) => void
  initialManufacturerId = null,
  initialModelId = null,
  allowManufacturerOnly = false,
}) {
  // data
  const [manufacturers, setManufacturers] = useState([]);
  const [models, setModels] = useState([]);

  // selection
  const [mfId, setMfId] = useState(initialManufacturerId);
  const [mdId, setMdId] = useState(initialModelId);

  // search
  const [mfQ, setMfQ] = useState("");
  const [mdQ, setMdQ] = useState("");

  // inputs for create
  const [mfNew, setMfNew] = useState("");
  const [mdNew, setMdNew] = useState("");

  // loading flags
  const [loadingMf, setLoadingMf] = useState(false);
  const [loadingMd, setLoadingMd] = useState(false);

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

  useEffect(() => { if (open) loadManufacturers(); }, [open, loadManufacturers]);
  useEffect(() => {
    if (!open) return;
    if (mfId) loadModels(mfId);
    else setModels([]);
    setMdId(null);
  }, [open, mfId, loadModels]);

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

  // choose
  const handlePick = () => {
    const mf = manufacturers.find(m => m.id === mfId) || null;
    const md = models.find(m => m.id === mdId) || null;
    if (!mf) { message.warning("Выберите производителя"); return; }
    if (!allowManufacturerOnly && !md) { message.warning("Выберите модель"); return; }
    onPick?.(mf, md);
    onClose?.();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={800}
      title="Производители и модели"
      destroyOnClose
      extra={<Button type="primary" onClick={handlePick} disabled={!mfId || (!allowManufacturerOnly && !mdId)}>Выбрать</Button>}
    >
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
    </Drawer>
  );
}
