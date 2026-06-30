import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Input,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tree,
  Typography,
  message,
} from "antd"
import { Link } from "react-router-dom"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"

const { Paragraph, Text } = Typography

const catalogLinks = [
  { path: "/clients", label: "Клиенты" },
  { path: "/suppliers", label: "Поставщики" },
  { path: "/supplier-parts", label: "Детали поставщиков" },
  { path: "/equipment-classifier", label: "Классификатор" },
  { path: "/materials", label: "Материалы" },
  { path: "/tnved-codes", label: "Коды ТН ВЭД" },
  { path: "/logistics-route-templates", label: "Шаблоны доставки" },
]

const countMeta = [
  {
    key: "equipment_models_without_classifier",
    title: "Модели без классификатора",
    tone: "red",
    description: "Модель есть, но не лежит в дереве оборудования.",
  },
  {
    key: "oem_missing_logistics",
    title: "OEM без веса/габаритов",
    tone: "gold",
    description: "Нет полного логистического набора по fitment.",
  },
  {
    key: "supplier_parts_missing_logistics",
    title: "Supplier parts без веса/габаритов",
    tone: "gold",
    description: "Нет веса или одной из габаритных величин.",
  },
]

const toneToColor = {
  red: "#cf1322",
  orange: "#d46b08",
  gold: "#d48806",
  blue: "#1677ff",
}

const nodeTypeLabels = {
  ROOT: "Корень",
  CATEGORY: "Категория",
  SUBCATEGORY: "Подкатегория",
  EQUIPMENT_TYPE: "Тип",
  MANUFACTURER_GROUP: "Группа производителей",
  MODEL_GROUP: "Группа моделей",
}

const flattenTree = (nodes, map = new Map()) => {
  ;(nodes || []).forEach((node) => {
    map.set(Number(node.id), node)
    flattenTree(node.children || [], map)
  })
  return map
}

const filterTree = (nodes, query) => {
  const q = String(query || "").trim().toLowerCase()
  if (!q) return nodes || []

  return (nodes || [])
    .map((node) => {
      const children = filterTree(node.children || [], q)
      const selfMatch =
        String(node.name || "").toLowerCase().includes(q) ||
        String(node.code || "").toLowerCase().includes(q) ||
        String(nodeTypeLabels[node.node_type] || node.node_type || "").toLowerCase().includes(q)
      if (!selfMatch && !children.length) return null
      return { ...node, children }
    })
    .filter(Boolean)
}

const buildClassifierTreeData = (nodes) =>
  (nodes || []).map((node) => ({
    key: String(node.id),
    title: (
      <Space size={6}>
        <span>{node.name}</span>
        <Tag bordered={false} color={node.is_active ? "blue" : "default"}>
          {nodeTypeLabels[node.node_type] || node.node_type}
        </Tag>
      </Space>
    ),
    children: buildClassifierTreeData(node.children || []),
  }))

export default function CatalogsPage() {
  const [health, setHealth] = useState(null)
  const [loadingHealth, setLoadingHealth] = useState(false)
  const [classifierTree, setClassifierTree] = useState([])
  const [loadingClassifier, setLoadingClassifier] = useState(false)
  const [classifierQuery, setClassifierQuery] = useState("")
  const [assigningModel, setAssigningModel] = useState(null)
  const [selectedClassifierId, setSelectedClassifierId] = useState(null)
  const [savingClassifier, setSavingClassifier] = useState(false)

  const loadHealth = useCallback(async () => {
    setLoadingHealth(true)
    try {
      const { data } = await axios.get("/catalog-health/summary", { params: { limit: 12 } })
      setHealth(data || null)
    } catch (err) {
      console.error("GET /catalog-health/summary error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить качество каталогов")
    } finally {
      setLoadingHealth(false)
    }
  }, [])

  useEffect(() => {
    loadHealth()
  }, [loadHealth])

  const loadClassifierTree = useCallback(async () => {
    setLoadingClassifier(true)
    try {
      const { data } = await axios.get("/equipment-classifier-nodes", {
        params: { tree: 1, limit: 5000 },
      })
      setClassifierTree(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-classifier-nodes error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить классификатор")
    } finally {
      setLoadingClassifier(false)
    }
  }, [])

  useEffect(() => {
    loadClassifierTree()
  }, [loadClassifierTree])

  const counts = health?.counts || {}
  const queues = health?.queues || {}
  const totalIssues = useMemo(
    () => countMeta.reduce((sum, item) => sum + Number(counts[item.key] || 0), 0),
    [counts],
  )
  const classifierMap = useMemo(() => flattenTree(classifierTree), [classifierTree])
  const filteredClassifierTree = useMemo(
    () => filterTree(classifierTree, classifierQuery),
    [classifierTree, classifierQuery],
  )
  const classifierTreeData = useMemo(
    () => buildClassifierTreeData(filteredClassifierTree),
    [filteredClassifierTree],
  )
  const selectedClassifier = selectedClassifierId ? classifierMap.get(Number(selectedClassifierId)) || null : null

  const openAssignClassifier = (row) => {
    setAssigningModel(row)
    setSelectedClassifierId(null)
    setClassifierQuery("")
  }

  const closeAssignClassifier = () => {
    if (savingClassifier) return
    setAssigningModel(null)
    setSelectedClassifierId(null)
    setClassifierQuery("")
  }

  const saveModelClassifier = async () => {
    if (!assigningModel?.id) return
    if (!selectedClassifierId) {
      message.warning("Выберите узел классификатора")
      return
    }

    setSavingClassifier(true)
    try {
      await axios.put(`/equipment-models/${assigningModel.id}`, {
        classifier_node_id: selectedClassifierId,
      })
      message.success("Модель привязана к классификатору")
      setAssigningModel(null)
      setSelectedClassifierId(null)
      setClassifierQuery("")
      await loadHealth()
    } catch (err) {
      console.error("PUT /equipment-models/:id classifier error:", err)
      message.error(err?.response?.data?.message || "Не удалось назначить классификатор")
    } finally {
      setSavingClassifier(false)
    }
  }

  const modelColumns = [
    {
      title: "Модель",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{row.manufacturer_name} / {row.model_name}</Text>
          <Text type="secondary">{row.model_code || "—"}</Text>
        </Space>
      ),
    },
    { title: "OEM", dataIndex: "oem_parts_count", width: 90, align: "center" },
    { title: "Машин", dataIndex: "client_units_count", width: 90, align: "center" },
    {
      title: "Действие",
      width: 120,
      render: (_, row) => (
        <Button size="small" onClick={() => openAssignClassifier(row)}>
          Назначить
        </Button>
      ),
    },
  ]

  return (
    <PageWrapper
      title="Каталоги"
      helpText="Каталоги, справочники и контроль качества связей."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card>
          <Space align="start" style={{ width: "100%", justifyContent: "space-between" }}>
            <div>
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                Качество каталогов
              </Typography.Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Контрольный слой показывает, где центральная логика еще не собрана:
                классификатор оборудования, связи поставщиков и логистика.
              </Paragraph>
            </div>
            <Button onClick={loadHealth} loading={loadingHealth}>
              Обновить
            </Button>
          </Space>
          <Alert
            style={{ marginTop: 16 }}
            type={totalIssues > 0 ? "warning" : "success"}
            showIcon
            message={
              totalIssues > 0
                ? `Найдено ${totalIssues} задач качества каталогов`
                : "Критичные очереди качества каталогов пустые"
            }
            description="Это не ошибки выполнения процесса, а очередь нормализации master data."
          />
          <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
            {countMeta.map((item) => (
              <Col key={item.key} xs={24} sm={12} lg={8} xl={6}>
                <Card size="small" style={{ height: "100%" }}>
                  <Statistic
                    title={item.title}
                    value={Number(counts[item.key] || 0)}
                    valueStyle={{ color: toneToColor[item.tone] || undefined }}
                  />
                  <Text type="secondary">{item.description}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card title="Модели без классификатора" loading={loadingHealth}>
              <Table
                size="small"
                rowKey="id"
                columns={modelColumns}
                dataSource={queues.equipment_models_without_classifier || []}
                pagination={false}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Разделы каталогов">
          <Paragraph style={{ marginBottom: 16 }}>
            Выберите раздел каталога для работы с данными.
          </Paragraph>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {catalogLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "block",
                  padding: "10px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  color: "#111827",
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </Card>
      </Space>

      <Drawer
        title="Назначить классификатор модели"
        open={!!assigningModel}
        onClose={closeAssignClassifier}
        width={520}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={closeAssignClassifier} disabled={savingClassifier}>
              Отмена
            </Button>
            <Button
              type="primary"
              onClick={saveModelClassifier}
              loading={savingClassifier}
              disabled={!selectedClassifierId}
            >
              Сохранить
            </Button>
          </Space>
        }
      >
        {assigningModel ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card size="small">
              <Space direction="vertical" size={0}>
                <Text type="secondary">Модель</Text>
                <Text strong>
                  {assigningModel.manufacturer_name} / {assigningModel.model_name}
                </Text>
                <Text type="secondary">{assigningModel.model_code || "Без кода модели"}</Text>
              </Space>
            </Card>

            <Input
              allowClear
              placeholder="Поиск по названию, коду или типу узла"
              value={classifierQuery}
              onChange={(event) => setClassifierQuery(event.target.value)}
            />

            {classifierTreeData.length ? (
              <Tree
                blockNode
                defaultExpandAll={!!classifierQuery}
                height={460}
                selectedKeys={selectedClassifierId ? [String(selectedClassifierId)] : []}
                treeData={classifierTreeData}
                onSelect={(keys) => setSelectedClassifierId(Number(keys?.[0] || 0) || null)}
              />
            ) : (
              <Empty description={loadingClassifier ? "Загрузка классификатора..." : "Ничего не найдено"} />
            )}

            {selectedClassifier ? (
              <Alert
                type="info"
                showIcon
                message={`Будет назначен узел: ${selectedClassifier.name}`}
                description={nodeTypeLabels[selectedClassifier.node_type] || selectedClassifier.node_type}
              />
            ) : null}
          </Space>
        ) : null}
      </Drawer>
    </PageWrapper>
  )
}
