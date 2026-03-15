import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Tag,
  Table,
  Tree,
  Typography,
  message,
} from "antd"
import axios from "@/api/axiosInstance"

const NODE_TYPE_OPTIONS = [
  { value: "ROOT", label: "Корень" },
  { value: "CATEGORY", label: "Категория" },
  { value: "SUBCATEGORY", label: "Подкатегория" },
  { value: "EQUIPMENT_TYPE", label: "Тип оборудования" },
  { value: "MANUFACTURER_GROUP", label: "Группа производителей" },
  { value: "MODEL_GROUP", label: "Группа моделей" },
]

const NODE_TYPE_LABELS = Object.fromEntries(NODE_TYPE_OPTIONS.map((item) => [item.value, item.label]))

const EMPTY_FORM = {
  name: "",
  code: "",
  node_type: "CATEGORY",
  sort_order: 0,
  is_active: true,
  notes: "",
}

const buildTreeData = (nodes) =>
  (nodes || []).map((node) => ({
    key: String(node.id),
    title: (
      <Space size={6}>
        <span>{node.name}</span>
        <Tag bordered={false} color={node.is_active ? "blue" : "default"}>
          {NODE_TYPE_LABELS[node.node_type] || node.node_type}
        </Tag>
      </Space>
    ),
    children: buildTreeData(node.children || []),
  }))

const flattenTree = (nodes, map = new Map()) => {
  ;(nodes || []).forEach((node) => {
    map.set(Number(node.id), node)
    flattenTree(node.children || [], map)
  })
  return map
}

export default function EquipmentClassifierMain() {
  const navigate = useNavigate()
  const [treeRows, setTreeRows] = useState([])
  const [treeQuery, setTreeQuery] = useState("")
  const [workspaceQuery, setWorkspaceQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [workspace, setWorkspace] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [manufacturerModalOpen, setManufacturerModalOpen] = useState(false)
  const [manufacturers, setManufacturers] = useState([])
  const [modelSaving, setModelSaving] = useState(false)
  const [manufacturerSaving, setManufacturerSaving] = useState(false)
  const [editingNode, setEditingNode] = useState(null)
  const [parentForCreate, setParentForCreate] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [form] = Form.useForm()
  const [modelForm] = Form.useForm()
  const [manufacturerForm] = Form.useForm()

  const loadTree = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/equipment-classifier-nodes", {
        params: { tree: 1, limit: 5000 },
      })
      setTreeRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-classifier-nodes error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить классификатор")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTree()
  }, [loadTree])

  const loadWorkspace = useCallback(async (nodeId) => {
    if (!nodeId) {
      setWorkspace(null)
      return
    }
    setWorkspaceLoading(true)
    try {
      const { data } = await axios.get(`/equipment-classifier-nodes/${nodeId}/workspace`)
      setWorkspace(data || null)
    } catch (err) {
      console.error("GET /equipment-classifier-nodes/:id/workspace error:", err)
      message.error(err?.response?.data?.message || "Не удалось загрузить workspace узла")
      setWorkspace(null)
    } finally {
      setWorkspaceLoading(false)
    }
  }, [])

  const loadManufacturers = useCallback(async () => {
    try {
      const { data } = await axios.get("/equipment-manufacturers")
      setManufacturers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("GET /equipment-manufacturers error:", err)
      message.error("Не удалось загрузить производителей")
    }
  }, [])

  useEffect(() => {
    if (selectedId) loadWorkspace(selectedId)
    else setWorkspace(null)
  }, [selectedId, loadWorkspace])

  useEffect(() => {
    setWorkspaceQuery("")
  }, [selectedId])

  const nodeMap = useMemo(() => flattenTree(treeRows), [treeRows])
  const selectedNode = selectedId ? nodeMap.get(Number(selectedId)) || null : null
  const filteredTreeRows = useMemo(() => {
    const q = treeQuery.trim().toLowerCase()
    if (!q) return treeRows

    const filterNodes = (nodes) =>
      (nodes || [])
        .map((node) => {
          const children = filterNodes(node.children || [])
          const selfMatch =
            String(node.name || "").toLowerCase().includes(q) ||
            String(node.code || "").toLowerCase().includes(q)
          if (!selfMatch && !children.length) return null
          return { ...node, children }
        })
        .filter(Boolean)

    return filterNodes(treeRows)
  }, [treeRows, treeQuery])

  const treeData = useMemo(() => buildTreeData(filteredTreeRows), [filteredTreeRows])

  const openCreateRoot = () => {
    setEditingNode(null)
    setParentForCreate(null)
    form.setFieldsValue({ ...EMPTY_FORM, node_type: "ROOT" })
    setModalOpen(true)
  }

  const openCreateChild = () => {
    if (!selectedNode) {
      message.warning("Сначала выберите родительский узел")
      return
    }
    setEditingNode(null)
    setParentForCreate(selectedNode)
    form.setFieldsValue({ ...EMPTY_FORM, node_type: "CATEGORY" })
    setModalOpen(true)
  }

  const openEdit = () => {
    if (!selectedNode) {
      message.warning("Сначала выберите узел")
      return
    }
    setParentForCreate(null)
    setEditingNode(selectedNode)
    form.setFieldsValue({
      name: selectedNode.name || "",
      code: selectedNode.code || "",
      node_type: selectedNode.node_type || "CATEGORY",
      sort_order: selectedNode.sort_order || 0,
      is_active: !!selectedNode.is_active,
      notes: selectedNode.notes || "",
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        parent_id: editingNode ? editingNode.parent_id : parentForCreate?.id || null,
        name: values.name,
        code: values.code || null,
        node_type: values.node_type,
        sort_order: values.sort_order ?? 0,
        is_active: values.is_active ? 1 : 0,
        notes: values.notes || null,
      }

      setSaving(true)
      if (editingNode?.id) {
        await axios.put(`/equipment-classifier-nodes/${editingNode.id}`, payload)
        message.success("Узел классификатора обновлён")
      } else {
        await axios.post("/equipment-classifier-nodes", payload)
        message.success("Узел классификатора создан")
      }
      setModalOpen(false)
      await loadTree()
    } catch (err) {
      if (err?.errorFields) return
      console.error("save equipment classifier node error:", err)
      message.error(err?.response?.data?.message || "Не удалось сохранить узел классификатора")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedNode?.id) return
    try {
      await axios.delete(`/equipment-classifier-nodes/${selectedNode.id}`)
      message.success("Узел классификатора удалён")
      setSelectedId(null)
      await loadTree()
    } catch (err) {
      console.error("delete equipment classifier node error:", err)
      message.error(err?.response?.data?.message || "Не удалось удалить узел классификатора")
    }
  }

  const openCreateModel = () => {
    if (!selectedNode) {
      message.warning("Сначала выберите узел классификатора")
      return
    }
    modelForm.resetFields()
    loadManufacturers()
    setModelModalOpen(true)
  }

  const openCreateManufacturer = () => {
    manufacturerForm.resetFields()
    setManufacturerModalOpen(true)
  }

  const handleCreateModel = async () => {
    if (!selectedNode) return
    try {
      const values = await modelForm.validateFields()
      setModelSaving(true)
      await axios.post("/equipment-models", {
        manufacturer_id: values.manufacturer_id,
        model_name: values.model_name,
        classifier_node_id: selectedNode.id,
        model_code: values.model_code || null,
        notes: values.notes || null,
      })
      message.success("Модель создана в выбранном узле")
      setModelModalOpen(false)
      await loadWorkspace(selectedNode.id)
    } catch (err) {
      if (err?.errorFields) return
      console.error("POST /equipment-models error:", err)
      message.error(err?.response?.data?.message || "Не удалось создать модель")
    } finally {
      setModelSaving(false)
    }
  }

  const handleCreateManufacturer = async () => {
    try {
      const values = await manufacturerForm.validateFields()
      setManufacturerSaving(true)
      const { data } = await axios.post("/equipment-manufacturers", {
        name: values.name,
        country: values.country || null,
        website: values.website || null,
        notes: values.notes || null,
      })
      message.success("Производитель создан")
      await loadManufacturers()
      if (data?.id) {
        modelForm.setFieldsValue({ manufacturer_id: data.id })
      }
      setManufacturerModalOpen(false)
    } catch (err) {
      if (err?.errorFields) return
      console.error("POST /equipment-manufacturers error:", err)
      message.error(err?.response?.data?.message || "Не удалось создать производителя")
    } finally {
      setManufacturerSaving(false)
    }
  }

  const workspaceStats = workspace?.stats || {}
  const rawWorkspaceModels = Array.isArray(workspace?.models) ? workspace.models : []
  const rawWorkspaceManufacturers = Array.isArray(workspace?.manufacturers) ? workspace.manufacturers : []
  const rawWorkspaceUnits = Array.isArray(workspace?.client_equipment_units) ? workspace.client_equipment_units : []
  const workspaceNeedle = workspaceQuery.trim().toLowerCase()

  const workspaceModels = useMemo(() => {
    if (!workspaceNeedle) return rawWorkspaceModels
    return rawWorkspaceModels.filter((row) =>
      [
        row.manufacturer_name,
        row.model_name,
        row.model_code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(workspaceNeedle),
    )
  }, [rawWorkspaceModels, workspaceNeedle])

  const workspaceUnits = useMemo(() => {
    if (!workspaceNeedle) return rawWorkspaceUnits
    return rawWorkspaceUnits.filter((row) =>
      [
        row.client_name,
        row.manufacturer_name,
        row.model_name,
        row.model_code,
        row.serial_number,
        row.site_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(workspaceNeedle),
    )
  }, [rawWorkspaceUnits, workspaceNeedle])

  const workspaceManufacturers = useMemo(() => {
    if (!workspaceNeedle) return rawWorkspaceManufacturers
    return rawWorkspaceManufacturers.filter((row) =>
      String(row.name || "").toLowerCase().includes(workspaceNeedle),
    )
  }, [rawWorkspaceManufacturers, workspaceNeedle])

  const manufacturersColumns = [
    {
      title: "Производитель",
      dataIndex: "name",
      render: (value) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: "Модели",
      dataIndex: "models_count",
      width: 100,
      align: "center",
    },
    {
      title: "Машины клиентов",
      dataIndex: "units_count",
      width: 140,
      align: "center",
    },
    {
      title: "OEM детали",
      dataIndex: "oem_parts_count",
      width: 120,
      align: "center",
    },
  ]

  const modelsColumns = [
    {
      title: "Производитель",
      dataIndex: "manufacturer_name",
      width: 180,
    },
    {
      title: "Модель",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.model_name || "—"}</Typography.Text>
          <Typography.Text type="secondary">{row.model_code || "—"}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Машины клиентов",
      dataIndex: "units_count",
      width: 140,
      align: "center",
    },
    {
      title: "OEM детали",
      dataIndex: "oem_parts_count",
      width: 120,
      align: "center",
    },
    {
      title: "Действия",
      key: "actions",
      width: 260,
      render: (_, row) => (
        <Space wrap>
          <Button
            size="small"
            onClick={() =>
              navigate(
                `/original-parts?manufacturer_id=${encodeURIComponent(
                  row.manufacturer_id || "",
                )}&equipment_model_id=${encodeURIComponent(row.id || "")}`,
              )
            }
          >
            OEM каталог
          </Button>
        </Space>
      ),
    },
  ]

  const unitsColumns = [
    {
      title: "Клиент",
      dataIndex: "client_name",
      render: (value) => <Typography.Text strong>{value || "—"}</Typography.Text>,
    },
    {
      title: "Машина",
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <span>{row.manufacturer_name || "—"} / {row.model_name || "—"}</span>
          <Typography.Text type="secondary">{row.model_code || "—"}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Серийный номер",
      dataIndex: "serial_number",
      render: (value) => value || "—",
    },
    {
      title: "Год",
      dataIndex: "manufacture_year",
      width: 100,
      align: "center",
      render: (value) => value || "—",
    },
    {
      title: "Площадка",
      dataIndex: "site_name",
      render: (value) => value || "—",
    },
    {
      title: "Действия",
      key: "actions",
      width: 260,
      render: (_, row) => (
        <Space wrap>
          <Button size="small" onClick={() => navigate(`/clients/${row.client_id}`)}>
            Клиент
          </Button>
          <Button
            size="small"
            onClick={() =>
              navigate(
                `/original-parts?manufacturer_id=${encodeURIComponent(
                  row.manufacturer_id || "",
                )}&equipment_model_id=${encodeURIComponent(row.equipment_model_id || "")}`,
              )
            }
          >
            OEM каталог
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card size="small">
        <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
          <Space wrap>
            <Tag color="blue">Узлов: {nodeMap.size}</Tag>
            <Tag color="green">Корней: {treeRows.length}</Tag>
          </Space>
          <Space wrap>
            <Button onClick={loadTree}>Обновить</Button>
            <Button onClick={openCreateRoot}>Добавить корневой узел</Button>
            <Button type="primary" onClick={openCreateChild} disabled={!selectedNode}>
              Добавить дочерний
            </Button>
            <Button onClick={openCreateModel} disabled={!selectedNode}>
              Создать модель в узле
            </Button>
            <Button onClick={openEdit} disabled={!selectedNode}>
              Изменить
            </Button>
            <Popconfirm
              title="Удалить узел классификатора?"
              description={selectedNode?.name || ""}
              okText="Удалить"
              cancelText="Отмена"
              onConfirm={handleDelete}
              disabled={!selectedNode}
            >
              <Button danger disabled={!selectedNode}>
                Удалить
              </Button>
            </Popconfirm>
          </Space>
        </Space>
      </Card>

      <Row gutter={[12, 12]} align="top">
        <Col xs={24} xl={8}>
          <Card
            title="Дерево классификатора"
            size="small"
            bodyStyle={{ minHeight: 520 }}
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Input
                allowClear
                placeholder="Поиск по названию или коду узла"
                value={treeQuery}
                onChange={(event) => setTreeQuery(event.target.value)}
              />
            {treeData.length ? (
              <Tree
                selectedKeys={selectedId ? [String(selectedId)] : []}
                onSelect={(keys) => setSelectedId(keys?.[0] || null)}
                treeData={treeData}
                defaultExpandAll
              />
            ) : (
              <Empty description={treeQuery ? "Поиск не дал совпадений" : "Классификатор пока пуст"} />
            )}
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={16}>
          <Card
            title="Workspace выбранного узла"
            size="small"
            bodyStyle={{ minHeight: 520 }}
          >
            {!selectedNode ? (
              <Empty description="Выберите узел слева" />
            ) : (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="Название">
                    {selectedNode.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Тип узла">
                    {NODE_TYPE_LABELS[selectedNode.node_type] || selectedNode.node_type}
                  </Descriptions.Item>
                  <Descriptions.Item label="Код">
                    {selectedNode.code || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Родитель">
                    {selectedNode.parent_id ? nodeMap.get(Number(selectedNode.parent_id))?.name || selectedNode.parent_id : "Корневой уровень"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Статус">
                    {selectedNode.is_active ? "Активен" : "Неактивен"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Дочерних узлов">
                    {selectedNode.children_count ?? (selectedNode.children || []).length ?? 0}
                  </Descriptions.Item>
                  <Descriptions.Item label="Заметки" span={2}>
                    {selectedNode.notes || "—"}
                  </Descriptions.Item>
                </Descriptions>

                <Space wrap size={24}>
                  <Statistic title="Узлов в поддереве" value={Number(workspaceStats.subtree_nodes_count) || 0} loading={workspaceLoading} />
                  <Statistic title="Производителей" value={Number(workspaceStats.manufacturers_count) || 0} loading={workspaceLoading} />
                  <Statistic title="Моделей" value={Number(workspaceStats.models_count) || 0} loading={workspaceLoading} />
                  <Statistic title="Машин клиентов" value={Number(workspaceStats.units_count) || 0} loading={workspaceLoading} />
                  <Statistic title="OEM деталей" value={Number(workspaceStats.oem_parts_count) || 0} loading={workspaceLoading} />
                </Space>

              <Space wrap>
                <Button
                  type="primary"
                  onClick={() => navigate(`/original-parts?classifier_node_id=${encodeURIComponent(selectedNode.id)}`)}
                >
                    Открыть OEM каталог
                  </Button>
                <Button onClick={openCreateModel}>
                  Создать модель в этом узле
                </Button>
              </Space>

              <Input
                allowClear
                placeholder="Поиск в узле: производитель, модель, код, клиент, серийный номер"
                value={workspaceQuery}
                onChange={(event) => setWorkspaceQuery(event.target.value)}
              />

              <Card size="small" title={`Производители (${workspaceManufacturers.length})`}>
                  <Table
                    size="small"
                    rowKey="id"
                    columns={manufacturersColumns}
                    dataSource={workspaceManufacturers}
                    loading={workspaceLoading}
                    pagination={false}
                    locale={{ emptyText: "В этом узле пока нет производителей с моделями" }}
                    scroll={{ x: 640 }}
                  />
                </Card>

                <Card size="small" title={`Модели (${workspaceModels.length})`}>
                  <Table
                    size="small"
                    rowKey="id"
                    columns={modelsColumns}
                    dataSource={workspaceModels}
                    loading={workspaceLoading}
                    pagination={false}
                    locale={{ emptyText: "В этом узле пока нет моделей" }}
                    scroll={{ x: 860 }}
                  />
                </Card>

                <Card size="small" title={`Машины клиентов (${workspaceUnits.length})`}>
                  <Table
                    size="small"
                    rowKey="id"
                    columns={unitsColumns}
                    dataSource={workspaceUnits}
                    loading={workspaceLoading}
                    pagination={false}
                    locale={{ emptyText: "Для моделей этого узла пока нет машин клиентов" }}
                    scroll={{ x: 920 }}
                  />
                </Card>
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        open={modalOpen}
        title={
          editingNode
            ? "Редактирование узла классификатора"
            : parentForCreate
              ? `Новый дочерний узел для "${parentForCreate.name}"`
              : "Новый корневой узел"
        }
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={editingNode ? "Сохранить" : "Создать"}
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={EMPTY_FORM}>
          <Form.Item
            label="Название"
            name="name"
            rules={[{ required: true, message: "Укажите название узла" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Код" name="code">
            <Input />
          </Form.Item>
          <Form.Item label="Тип узла" name="node_type">
            <Select options={NODE_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item label="Порядок сортировки" name="sort_order">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Заметки" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Активен" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={modelModalOpen}
        title={selectedNode ? `Новая модель для узла "${selectedNode.name}"` : "Новая модель"}
        onCancel={() => setModelModalOpen(false)}
        onOk={handleCreateModel}
        confirmLoading={modelSaving}
        okText="Создать"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={modelForm} layout="vertical">
          <Form.Item
            label="Производитель"
            name="manufacturer_id"
            rules={[{ required: true, message: "Выберите производителя" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={manufacturers.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </Form.Item>
          <Button type="link" style={{ paddingLeft: 0, marginTop: -8 }} onClick={openCreateManufacturer}>
            + Новый производитель
          </Button>
          <Form.Item
            label="Модель"
            name="model_name"
            rules={[{ required: true, message: "Укажите модель" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Код модели" name="model_code">
            <Input />
          </Form.Item>
          <Form.Item label="Заметки" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={manufacturerModalOpen}
        title="Новый производитель оборудования"
        onCancel={() => setManufacturerModalOpen(false)}
        onOk={handleCreateManufacturer}
        confirmLoading={manufacturerSaving}
        okText="Создать"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={manufacturerForm} layout="vertical">
          <Form.Item
            label="Название"
            name="name"
            rules={[{ required: true, message: "Укажите производителя" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Страна" name="country">
            <Input />
          </Form.Item>
          <Form.Item label="Сайт" name="website">
            <Input />
          </Form.Item>
          <Form.Item label="Заметки" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
