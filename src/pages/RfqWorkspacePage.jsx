import React, { useEffect, useMemo, useRef, useState } from "react"
import { Button, Card, Checkbox, Form, Input, Modal, Radio, Select, Space, Steps, Table, Tabs, Tag, Tooltip, Tree, Typography, message } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import PageWrapper from "@/components/common/PageWrapper"
import axios from "@/api/axiosInstance"
import confirmAction from "@/utils/confirmAction"

const { Text } = Typography

const formatDate = (value) => {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleDateString("ru-RU")
  } catch {
    return "-"
  }
}

const STEP_LABELS = [
  "RFQ",
  "Поставщики",
  "Ответы",
  "Выбор",
  "Экономика",
  "КП",
  "Контракт",
  "PO",
]

const STEP_TO_TAB = [
  "rfq",
  "suppliers",
  "responses",
  "selection",
  "economics",
  "sales",
  "contracts",
  "po",
]

const TAB_TO_STEP = STEP_TO_TAB.reduce((acc, key, index) => {
  acc[key] = index
  return acc
}, {
  coverage: 2,
})

const statusToColor = (value) => {
  if (!value) return "default"
  if (value === "sent") return "blue"
  if (value === "responded") return "green"
  if (value === "draft") return "default"
  return "gold"
}

const buildBomTree = (rows = []) => {
  if (!rows.length) return []
  const nodes = new Map()
  rows.forEach((row) => {
    const description = row.description_ru || row.description_en || ""
    const qty = Number(row.mult_qty)
    const qtyLabel = Number.isFinite(qty) ? ` x${qty}` : ""
    nodes.set(String(row.node_id), {
      key: String(row.node_id),
      title: `${row.cat_number || row.node_id}${description ? ` — ${description}` : ""}${qtyLabel}`,
      children: [],
      level: row.level,
      path: row.path,
    })
  })

  rows.forEach((row) => {
    if (!row.path || row.level === 0) return
    const parts = String(row.path).split(">")
    if (parts.length < 2) return
    const parentId = parts[parts.length - 2]
    const parent = nodes.get(parentId)
    const node = nodes.get(String(row.node_id))
    if (parent && node) {
      parent.children.push(node)
    }
  })

  const rootRow = rows.find((row) => row.level === 0) || rows[0]
  const rootNode = nodes.get(String(rootRow.node_id))
  return rootNode ? [rootNode] : []
}

export default function RfqWorkspacePage() {
  const [rfqs, setRfqs] = useState([])
  const [requests, setRequests] = useState([])
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeRfqId, setActiveRfqId] = useState(null)
  const [activeRfq, setActiveRfq] = useState(null)
  const [filterClientId, setFilterClientId] = useState(null)
  const [filterRequestNumber, setFilterRequestNumber] = useState("")

  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [responses, setResponses] = useState([])
  const [structure, setStructure] = useState(null)
  const [coverage, setCoverage] = useState(null)
  const [selections, setSelections] = useState([])
  const [selectionLines, setSelectionLines] = useState([])
  const [shipmentGroups, setShipmentGroups] = useState([])
  const [landedCosts, setLandedCosts] = useState([])
  const [salesQuotes, setSalesQuotes] = useState([])
  const [contracts, setContracts] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [activeTabKey, setActiveTabKey] = useState("rfq")
  const [bundleModal, setBundleModal] = useState({
    open: false,
    item: null,
    bundles: [],
    loading: false,
    activeBundleId: null,
    bundleSummary: null,
  })
  const [bomTrees, setBomTrees] = useState({})

  const [createForm] = Form.useForm()
  const autoFillRef = useRef(new Set())

  useEffect(() => {
    setActiveTabKey("rfq")
  }, [activeRfqId])

  const loadRfqs = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/rfqs")
      setRfqs(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRfqs()
    const loadRequests = async () => {
      try {
        const { data } = await axios.get("/client-requests")
        setRequests(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error(e)
      }
    }
    loadRequests()
  }, [])

  const loadRevisions = async (requestId) => {
    if (!requestId) {
      setRevisions([])
      return
    }
    try {
      const { data } = await axios.get(`/client-requests/${requestId}/revisions`)
      setRevisions(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить ревизии")
    }
  }

  const handleCreateRfq = async (values) => {
    if (!values.client_request_revision_id) {
      message.warning("Выберите ревизию заявки")
      return
    }
    try {
      const { data } = await axios.post("/rfqs", {
        client_request_revision_id: values.client_request_revision_id,
        note: values.note || null,
        rfq_number: values.rfq_number || null,
      })
      if (data?.id) {
        await axios.post(`/rfqs/${data.id}/items/bulk`)
      }
      message.success("RFQ создан")
      createForm.resetFields()
      await loadRfqs()
      if (data?.id) {
        setActiveRfqId(data.id)
      }
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать RFQ")
    }
  }

  const handleDeleteRfq = async (rfqId) => {
    const { confirmed } = await confirmAction({
      title: "Удалить RFQ?",
      text: "Будут удалены ответы поставщиков и связанные расчеты.",
      icon: "warning",
      confirmLabel: "Удалить",
    })
    if (!confirmed) return
    try {
      await axios.delete(`/rfqs/${rfqId}`)
      if (Number(activeRfqId) === Number(rfqId)) {
        setActiveRfqId(null)
      }
      await loadRfqs()
      message.success("RFQ удален")
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить RFQ")
    }
  }

  useEffect(() => {
    if (!activeRfqId) {
      setActiveRfq(null)
      setItems([])
      setSuppliers([])
      setResponses([])
      setStructure(null)
      setSelections([])
      setSelectionLines([])
      setShipmentGroups([])
      setLandedCosts([])
      setSalesQuotes([])
      setContracts([])
      setPurchaseOrders([])
      return
    }

    let cancelled = false
    const loadDetails = async () => {
      try {
        const rfq = rfqs.find((row) => Number(row.id) === Number(activeRfqId)) || null
        setActiveRfq(rfq || null)

        const [
          itemsResp,
          suppliersResp,
          responsesResp,
          structureResp,
          coverageResp,
          selectionsResp,
          groupsResp,
          landedResp,
          quotesResp,
          contractsResp,
          poResp,
        ] = await Promise.all([
          axios.get(`/rfqs/${activeRfqId}/items`),
          axios.get(`/rfqs/${activeRfqId}/suppliers`),
          axios.get("/supplier-responses"),
          axios.get(`/rfqs/${activeRfqId}/structure`),
          axios.get("/coverage", { params: { rfq_id: activeRfqId } }),
          axios.get("/selection"),
          axios.get("/economics/shipment-groups"),
          axios.get("/economics/landed-costs"),
          axios.get("/sales-quotes"),
          rfq?.client_id ? axios.get("/contracts", { params: { client_id: rfq.client_id } }) : Promise.resolve({ data: [] }),
          axios.get("/purchase-orders"),
        ])

        if (cancelled) return

        let itemList = Array.isArray(itemsResp.data) ? itemsResp.data : []
        const supplierList = Array.isArray(suppliersResp.data) ? suppliersResp.data : []
        const responseList = Array.isArray(responsesResp.data) ? responsesResp.data : []
        const structurePayload = structureResp?.data || null
        const coveragePayload = coverageResp?.data || null
        const selectionList = Array.isArray(selectionsResp.data) ? selectionsResp.data : []
        const groupList = Array.isArray(groupsResp.data) ? groupsResp.data : []
        const landedList = Array.isArray(landedResp.data) ? landedResp.data : []
        const quoteList = Array.isArray(quotesResp.data) ? quotesResp.data : []
        const contractList = Array.isArray(contractsResp.data) ? contractsResp.data : []
        const poList = Array.isArray(poResp.data) ? poResp.data : []

        const rfqResponses = responseList.filter((row) => Number(row.rfq_id) === Number(activeRfqId))
        const rfqSelections = selectionList.filter((row) => Number(row.rfq_id) === Number(activeRfqId))
        const rfqGroups = groupList.filter((row) => Number(row.rfq_id) === Number(activeRfqId))
        const rfqLanded = landedList.filter((row) => Number(row.rfq_id) === Number(activeRfqId))
        const rfqQuotes = rfq?.client_request_revision_id
          ? quoteList.filter((row) => Number(row.client_request_revision_id) === Number(rfq.client_request_revision_id))
          : []
        const rfqContracts = rfqQuotes.length
          ? contractList.filter((row) => rfqQuotes.some((q) => Number(q.id) === Number(row.sales_quote_id)))
          : []
        const selectionIds = rfqSelections.map((row) => row.id)
        const rfqPos = selectionIds.length
          ? poList.filter((row) => selectionIds.includes(Number(row.selection_id)))
          : []

        if (!itemList.length && !autoFillRef.current.has(activeRfqId)) {
          autoFillRef.current.add(activeRfqId)
          try {
            await axios.post(`/rfqs/${activeRfqId}/items/bulk`)
            const refreshed = await axios.get(`/rfqs/${activeRfqId}/items`)
            itemList = Array.isArray(refreshed.data) ? refreshed.data : []
            const refreshedStructure = await axios.get(`/rfqs/${activeRfqId}/structure`)
            if (!cancelled) {
              setStructure(refreshedStructure?.data || null)
            }
          } catch (e) {
            console.error(e)
          }
        }

        setItems(itemList)
        setSuppliers(supplierList)
        setResponses(rfqResponses)
        setStructure(structurePayload)
        setCoverage(coveragePayload)
        setSelections(rfqSelections)
        setShipmentGroups(rfqGroups)
        setLandedCosts(rfqLanded)
        setSalesQuotes(rfqQuotes)
        setContracts(rfqContracts)
        setPurchaseOrders(rfqPos)

        if (rfqSelections.length) {
          const latestSelection = rfqSelections[0]
          const linesResp = await axios.get(`/selection/${latestSelection.id}/lines`)
          if (!cancelled) {
            setSelectionLines(Array.isArray(linesResp.data) ? linesResp.data : [])
          }
        } else {
          setSelectionLines([])
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e)
        }
      }
    }

    loadDetails()
    return () => {
      cancelled = true
    }
  }, [activeRfqId, rfqs])

  const refreshStructure = async () => {
    if (!activeRfqId) return
    try {
      const { data } = await axios.get(`/rfqs/${activeRfqId}/structure`)
      setStructure(data || null)
    } catch (e) {
      console.error(e)
      message.error("Не удалось обновить структуру")
    }
  }

  const openBundleModal = async (item) => {
    if (!item?.original_part_id) {
      message.warning("Нет привязки к оригинальной детали")
      return
    }
    setBundleModal({
      open: true,
      item,
      bundles: [],
      loading: true,
      activeBundleId: null,
      bundleSummary: null,
    })
    try {
      const { data } = await axios.get("/supplier-bundles", {
        params: { original_part_id: item.original_part_id },
      })
      setBundleModal((prev) => ({
        ...prev,
        bundles: Array.isArray(data) ? data : [],
        loading: false,
      }))
    } catch (e) {
      console.error(e)
      setBundleModal((prev) => ({ ...prev, loading: false }))
      message.error("Не удалось загрузить комплекты")
    }
  }

  const loadBundleSummary = async (bundleId) => {
    if (!bundleId) return
    setBundleModal((prev) => ({ ...prev, activeBundleId: bundleId, bundleSummary: null }))
    try {
      const { data } = await axios.get(`/supplier-bundles/${bundleId}/summary`)
      setBundleModal((prev) => ({ ...prev, bundleSummary: data || null }))
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить состав комплекта")
    }
  }

  const updateStrategy = async (item, patch, rebuild = false) => {
    if (!activeRfqId || !item?.rfq_item_id) return
    try {
      await axios.put(`/rfqs/${activeRfqId}/items/${item.rfq_item_id}/strategy`, {
        ...patch,
        rebuild_components: rebuild ? 1 : 0,
      })
      if (rebuild) {
        await refreshStructure()
      } else {
        setStructure((prev) => {
          if (!prev?.items?.length) return prev
          const nextItems = prev.items.map((row) => {
            if (Number(row.rfq_item_id) !== Number(item.rfq_item_id)) return row
            return {
              ...row,
              strategy: {
                ...row.strategy,
                ...patch,
              },
            }
          })
          return { ...prev, items: nextItems }
        })
      }
    } catch (e) {
      console.error(e)
      message.error("Не удалось обновить стратегию")
    }
  }

  const rebuildComponents = async (item) => {
    if (!activeRfqId || !item?.rfq_item_id) return
    try {
      await axios.post(`/rfqs/${activeRfqId}/items/${item.rfq_item_id}/components/rebuild`, {
        mode: item?.strategy?.mode || "SINGLE",
      })
      await refreshStructure()
      message.success("Компоненты обновлены")
    } catch (e) {
      console.error(e)
      message.error("Не удалось пересобрать компоненты")
    }
  }

  const createBundleFromBom = async (item) => {
    if (!item?.original_part_id) {
      message.warning("Сначала привяжите оригинальную деталь")
      return
    }
    if (!item?.has_bom || !item?.components?.length) {
      message.warning("Для позиции нет BOM")
      return
    }

    const { confirmed } = await confirmAction({
      title: "Создать комплект из BOM?",
      text: "Создадим новый комплект и добавим роли из BOM. Связи с деталями поставщиков можно заполнить позже.",
      icon: "question",
      confirmLabel: "Создать",
    })
    if (!confirmed) return

    try {
      const title = item.original_cat_number || item.client_part_number || `OP-${item.original_part_id}`
      const note = activeRfq?.rfq_number ? `RFQ ${activeRfq.rfq_number}` : "RFQ Workspace"
      const { data } = await axios.post("/supplier-bundles", {
        original_part_id: item.original_part_id,
        title: `Комплект ${title}`,
        note,
      })

      const bundleId = data?.id
      if (!bundleId) {
        message.error("Комплект создан, но id не получен")
        return
      }

      const bomComponents = item.components.filter((comp) => comp.source_type === "BOM")
      if (bomComponents.length) {
        await Promise.all(
          bomComponents.map((comp, index) =>
            axios.post(`/supplier-bundles/${bundleId}/items`, {
              role_label: comp.cat_number || comp.description || `Позиция ${index + 1}`,
              qty: comp.component_qty || 1,
              sort_order: index + 1,
            })
          )
        )
      }

      message.success("Комплект создан")
      await refreshStructure()
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать комплект")
    }
  }

  const loadBomTree = async (originalPartId, force = false) => {
    if (!originalPartId) return
    if (!force && bomTrees[originalPartId]?.data) return
    setBomTrees((prev) => ({
      ...prev,
      [originalPartId]: { loading: true, data: prev[originalPartId]?.data || null },
    }))
    try {
      const { data } = await axios.get(`/original-part-bom/tree/${originalPartId}`)
      const treeData = buildBomTree(Array.isArray(data) ? data : [])
      setBomTrees((prev) => ({
        ...prev,
        [originalPartId]: { loading: false, data: treeData },
      }))
    } catch (e) {
      console.error(e)
      setBomTrees((prev) => ({
        ...prev,
        [originalPartId]: { loading: false, data: null },
      }))
      message.error("Не удалось загрузить BOM дерево")
    }
  }

  const coverageRows = useMemo(() => {
    if (!coverage?.items?.length) return []
    const rows = []
    coverage.items.forEach((item) => {
      const base = {
        rfq_item_id: item.rfq_item_id,
        line_number: item.line_number,
        item_description: item.description || item.client_description || "-",
        requested_qty: item.requested_qty,
        uom: item.uom || "-",
        strategy_mode: item.strategy?.mode || "-",
      }
      item.components.forEach((comp) => {
        const responses = Array.isArray(comp.responses) ? comp.responses : []
        const priced = responses.filter((r) => Number.isFinite(Number(r.price)))
        let best = null
        priced.forEach((r) => {
          if (!best || Number(r.price) < Number(best.price)) {
            best = r
          }
        })
        rows.push({
          key: `${item.rfq_item_id}-${comp.rfq_item_component_id || comp.original_part_id}`,
          ...base,
          component_cat_number: comp.cat_number || "-",
          component_description: comp.description || "-",
          required_qty: comp.required_qty ?? "-",
          suppliers_count: comp.suppliers_count ?? 0,
          responses_count: responses.length,
          best_supplier: best?.supplier_name || "-",
          best_price: best?.price ?? "-",
          best_currency: best?.currency || "",
          response_preview: responses.slice(0, 3).map((r) => r.supplier_name).join(", "),
        })
      })
    })
    return rows
  }, [coverage])

  const clientFilterOptions = useMemo(() => {
    const map = new Map()
    rfqs.forEach((r) => {
      if (!r.client_id) return
      if (!map.has(r.client_id)) {
        map.set(r.client_id, r.client_name || `Клиент #${r.client_id}`)
      }
    })
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
  }, [rfqs])

  const requestOptions = useMemo(
    () =>
      requests.map((r) => ({
        value: r.id,
        label: `${r.client_name || "Клиент"} · ${r.internal_number || r.client_reference || `#${r.id}`}`,
      })),
    [requests]
  )

  const revisionOptions = useMemo(
    () =>
      revisions.map((rev) => ({
        value: rev.id,
        label: `Rev ${rev.rev_number}${rev.created_at ? ` · ${rev.created_at}` : ""}`,
      })),
    [revisions]
  )

  const filteredRfqs = useMemo(() => {
    const needle = String(filterRequestNumber || "").trim().toLowerCase()
    return rfqs.filter((rfq) => {
      if (filterClientId && Number(rfq.client_id) !== Number(filterClientId)) {
        return false
      }
      if (!needle) return true
      const haystack = [
        rfq.client_request_number,
        rfq.client_reference,
        rfq.client_request_id,
        rfq.rfq_number,
      ]
        .filter((v) => v !== null && v !== undefined)
        .map((v) => String(v).toLowerCase())
        .join(" ")
      return haystack.includes(needle)
    })
  }, [rfqs, filterClientId, filterRequestNumber])

  const flowStatus = useMemo(() => {
    const steps = [
      items.length > 0,
      suppliers.length > 0,
      responses.length > 0,
      selections.length > 0,
      landedCosts.length > 0 || shipmentGroups.length > 0,
      salesQuotes.length > 0,
      contracts.length > 0,
      purchaseOrders.length > 0,
    ]
    const current = Math.max(steps.findIndex((value) => !value), 0)
    const finished = steps.every(Boolean)
    return { steps, current: finished ? steps.length - 1 : current }
  }, [
    items.length,
    suppliers.length,
    responses.length,
    selections.length,
    landedCosts.length,
    shipmentGroups.length,
    salesQuotes.length,
    contracts.length,
    purchaseOrders.length,
  ])

  const structureItems = structure?.items || []
  const activeStep = TAB_TO_STEP[activeTabKey] ?? 0

  const rfqColumns = [
    { title: "Клиент", dataIndex: "client_name", width: 220 },
    {
      title: "Заявка",
      dataIndex: "client_request_number",
      width: 160,
      render: (value, record) =>
        value || record.client_reference || `#${record.client_request_id}`,
    },
    {
      title: "RFQ",
      dataIndex: "rfq_number",
      width: 140,
      render: (value, record) => value || `RFQ-${record.id}`,
    },
    { title: "Rev", dataIndex: "rev_number", width: 70 },
    {
      title: "Статус",
      dataIndex: "status",
      width: 120,
      render: (value) => <Tag color={statusToColor(value)}>{value || "draft"}</Tag>,
    },
    {
      title: "Создано",
      dataIndex: "created_at",
      width: 120,
      render: formatDate,
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 90,
      render: (_, record) => (
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={(event) => {
            event.stopPropagation()
            handleDeleteRfq(record.id)
          }}
        />
      ),
    },
  ]

  return (
    <PageWrapper
      title="RFQ Workspace"
      helpText="Сквозной поток по RFQ: от заявки до заказа поставщику."
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card size="small" title="Создать RFQ">
          <Form form={createForm} layout="vertical" onFinish={handleCreateRfq}>
            <Space wrap align="start">
              <Form.Item label="Заявка" name="client_request_id">
                <Select
                  style={{ width: 260 }}
                  options={requestOptions}
                  showSearch
                  optionFilterProp="label"
                  onChange={(val) => {
                    createForm.setFieldsValue({ client_request_revision_id: null })
                    loadRevisions(val)
                  }}
                />
              </Form.Item>
              <Form.Item
                label="Ревизия"
                name="client_request_revision_id"
                rules={[{ required: true, message: "Выберите ревизию" }]}
              >
                <Select style={{ width: 180 }} options={revisionOptions} />
              </Form.Item>
              <Form.Item label="Номер RFQ" name="rfq_number">
                <Input style={{ width: 180 }} placeholder="Например RFQ-21" />
              </Form.Item>
              <Form.Item label="Комментарий" name="note">
                <Input style={{ width: 240 }} />
              </Form.Item>
              <Form.Item style={{ marginTop: 30 }}>
                <Button type="primary" htmlType="submit">
                  Создать RFQ
                </Button>
              </Form.Item>
            </Space>
          </Form>
        </Card>

        <Card size="small" title="RFQ список">
          <Space wrap align="center" style={{ marginBottom: 12 }}>
            <Select
              style={{ width: 220 }}
              options={clientFilterOptions}
              placeholder="Фильтр по клиенту"
              allowClear
              showSearch
              optionFilterProp="label"
              value={filterClientId || undefined}
              onChange={(value) => setFilterClientId(value || null)}
            />
            <Input
              style={{ width: 220 }}
              placeholder="Номер заявки / RFQ"
              allowClear
              value={filterRequestNumber}
              onChange={(event) => setFilterRequestNumber(event.target.value)}
            />
          </Space>
          <Table
            rowKey="id"
            columns={rfqColumns}
            dataSource={filteredRfqs}
            loading={loading}
            pagination={{ pageSize: 12 }}
            onRow={(record) => ({
              onClick: () => setActiveRfqId(record.id),
            })}
            rowClassName={(record) =>
              Number(record.id) === Number(activeRfqId) ? "ant-table-row-selected" : ""
            }
          />
        </Card>

        {activeRfq ? (
          <Card size="small" title="Рабочая зона">
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Space wrap align="center" style={{ justifyContent: "space-between" }}>
                <Space wrap align="center">
                  <Text strong>
                    {activeRfq.rfq_number || `RFQ-${activeRfq.id}`}
                  </Text>
                  <Tag color={statusToColor(activeRfq.status)}>
                    {activeRfq.status || "draft"}
                  </Tag>
                  <Text type="secondary">
                    {activeRfq.client_name || "Клиент"}
                  </Text>
                  <Text type="secondary">
                    Rev {activeRfq.rev_number || "-"}
                  </Text>
                </Space>
              </Space>

              <Steps
                size="small"
                current={activeStep}
                onChange={(index) => {
                  const nextKey = STEP_TO_TAB[index]
                  if (nextKey) setActiveTabKey(nextKey)
                }}
                items={STEP_LABELS.map((label, index) => ({
                  title: label,
                  status: flowStatus.steps[index] ? "finish" : index === flowStatus.current ? "process" : "wait",
                }))}
              />

              <Tabs
                activeKey={activeTabKey}
                onChange={setActiveTabKey}
                items={[
                  {
                    key: "rfq",
                    label: "RFQ",
                    children: (
                      <Table
                        rowKey="rfq_item_id"
                        loading={!structure && !!activeRfqId}
                        dataSource={structureItems}
                        pagination={false}
                        expandable={{
                          onExpand: (expanded, record) => {
                            if (expanded && record?.has_bom) {
                              loadBomTree(record.original_part_id)
                            }
                          },
                          expandedRowRender: (record) => (
                            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                              <Space wrap align="center">
                                <Text strong>Стратегия</Text>
                                <Radio.Group
                                  value={record.strategy?.mode || "SINGLE"}
                                  onChange={(event) =>
                                    updateStrategy(record, { mode: event.target.value }, true)
                                  }
                                  disabled={!record.original_part_id}
                                >
                                  <Radio.Button value="SINGLE">Single</Radio.Button>
                                  <Radio.Button value="BOM" disabled={!record.has_bom}>
                                    BOM
                                  </Radio.Button>
                                  <Radio.Button value="MIXED" disabled={!record.has_bom}>
                                    Mixed
                                  </Radio.Button>
                                </Radio.Group>
                                <Tooltip title="Разрешить OEM-предложения">
                                  <Checkbox
                                    checked={!!record.strategy?.allow_oem}
                                    disabled={!record.original_part_id}
                                    onChange={(event) =>
                                      updateStrategy(record, { allow_oem: event.target.checked ? 1 : 0 })
                                    }
                                  >
                                    OEM
                                  </Checkbox>
                                </Tooltip>
                                <Tooltip title="Разрешить аналоги">
                                  <Checkbox
                                    checked={!!record.strategy?.allow_analog}
                                    disabled={!record.original_part_id}
                                    onChange={(event) =>
                                      updateStrategy(record, { allow_analog: event.target.checked ? 1 : 0 })
                                    }
                                  >
                                    Аналоги
                                  </Checkbox>
                                </Tooltip>
                                <Tooltip title="Разрешить комплекты поставщика">
                                  <Checkbox
                                    checked={!!record.strategy?.allow_kit}
                                    disabled={!record.original_part_id}
                                    onChange={(event) =>
                                      updateStrategy(record, { allow_kit: event.target.checked ? 1 : 0 })
                                    }
                                  >
                                    Комплекты
                                  </Checkbox>
                                </Tooltip>
                                <Tooltip title="Разрешить частичное покрытие BOM">
                                  <Checkbox
                                    checked={!!record.strategy?.allow_partial}
                                    disabled={!record.has_bom || !record.original_part_id}
                                    onChange={(event) =>
                                      updateStrategy(record, { allow_partial: event.target.checked ? 1 : 0 })
                                    }
                                  >
                                    Частично
                                  </Checkbox>
                                </Tooltip>
                                <Tooltip title="Обновить компоненты по выбранной стратегии">
                                  <Button onClick={() => rebuildComponents(record)}>
                                    Пересобрать структуру
                                  </Button>
                                </Tooltip>
                                <Tooltip title="Создать новый комплект из BOM (если комплекта ещё нет)">
                                  <Button
                                    disabled={!record.has_bom || record.bundle_count > 0}
                                    onClick={() => createBundleFromBom(record)}
                                  >
                                    Создать комплект
                                  </Button>
                                </Tooltip>
                                <Button
                                  disabled={!record.bundle_count}
                                  onClick={() => openBundleModal(record)}
                                >
                                  Показать комплекты
                                </Button>
                              </Space>

                              <Table
                                rowKey={(row) =>
                                  row.rfq_item_component_id ||
                                  `${record.rfq_item_id}-${row.original_part_id}-${row.source_type}`
                                }
                                dataSource={record.components || []}
                                pagination={false}
                                size="small"
                                columns={[
                                  { title: "Компонент", dataIndex: "cat_number", width: 160 },
                                  { title: "Описание", dataIndex: "description" },
                                  {
                                    title: "Источник",
                                    dataIndex: "source_type",
                                    width: 120,
                                    render: (value) => <Tag>{value || "BOM"}</Tag>,
                                  },
                                  { title: "Кол-во", dataIndex: "required_qty", width: 100 },
                                  {
                                    title: "Комплекты",
                                    dataIndex: "bundle_count",
                                    width: 110,
                                    render: (value) =>
                                      value ? <Tag color="blue">{value}</Tag> : "-",
                                  },
                                ]}
                              />
                              {record.has_bom ? (
                                <Card
                                  size="small"
                                  title="BOM дерево"
                                  extra={
                                    <Button
                                      size="small"
                                      onClick={() => loadBomTree(record.original_part_id, true)}
                                    >
                                      Обновить дерево
                                    </Button>
                                  }
                                >
                                  <Tree
                                    treeData={bomTrees[record.original_part_id]?.data || []}
                                    defaultExpandAll
                                  />
                                  {!bomTrees[record.original_part_id]?.data &&
                                  !bomTrees[record.original_part_id]?.loading ? (
                                    <Text type="secondary">Дерево не загружено.</Text>
                                  ) : null}
                                </Card>
                              ) : null}
                            </Space>
                          ),
                        }}
                        columns={[
                          { title: "№", dataIndex: "line_number", width: 60 },
                          {
                            title: "Кат. номер",
                            dataIndex: "original_cat_number",
                            width: 160,
                            render: (value, record) => value || record.client_part_number || "-",
                          },
                          { title: "Описание", dataIndex: "client_description" },
                          { title: "Кол-во", dataIndex: "requested_qty", width: 90 },
                          { title: "Ед.", dataIndex: "uom", width: 70 },
                          {
                            title: "BOM",
                            dataIndex: "has_bom",
                            width: 80,
                            render: (value) => (value ? "Да" : "-"),
                          },
                          {
                            title: "Комплекты",
                            dataIndex: "bundle_count",
                            width: 110,
                            render: (value) => (value ? value : "-"),
                          },
                          {
                            title: "Стратегия",
                            dataIndex: "strategy",
                            width: 160,
                            render: (value) => value?.mode || "SINGLE",
                          },
                        ]}
                      />
                    ),
                  },
                  {
                    key: "suppliers",
                    label: "Поставщики",
                    children: (
                      <Table
                        rowKey="id"
                        dataSource={suppliers}
                        pagination={false}
                        columns={[
                          { title: "Поставщик", dataIndex: "supplier_name" },
                          { title: "Статус", dataIndex: "status", width: 120 },
                          { title: "Дата", dataIndex: "invited_at", width: 120, render: formatDate },
                          { title: "Комментарий", dataIndex: "note" },
                        ]}
                      />
                    ),
                  },
                  {
                    key: "responses",
                    label: "Ответы",
                    children: (
                      <Table
                        rowKey="id"
                        dataSource={responses}
                        pagination={false}
                        columns={[
                          { title: "Поставщик", dataIndex: "supplier_name" },
                          { title: "Статус", dataIndex: "status", width: 120 },
                          { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
                        ]}
                      />
                    ),
                  },
                  {
                    key: "coverage",
                    label: "Coverage",
                    children: (
                      <Table
                        rowKey="key"
                        dataSource={coverageRows}
                        pagination={false}
                        columns={[
                          { title: "RFQ", dataIndex: "line_number", width: 70 },
                          { title: "Позиция", dataIndex: "item_description" },
                          { title: "Компонент", dataIndex: "component_cat_number", width: 160 },
                          { title: "Описание", dataIndex: "component_description" },
                          { title: "Кол-во", dataIndex: "required_qty", width: 90 },
                          { title: "Стратегия", dataIndex: "strategy_mode", width: 100 },
                          { title: "Поставщики", dataIndex: "suppliers_count", width: 110 },
                          { title: "Ответы", dataIndex: "responses_count", width: 90 },
                          {
                            title: "Лучшее",
                            dataIndex: "best_price",
                            width: 140,
                            render: (value, record) =>
                              value === "-" ? "-" : `${value} ${record.best_currency}`.trim(),
                          },
                          { title: "Поставщик", dataIndex: "best_supplier", width: 160 },
                        ]}
                      />
                    ),
                  },
                  {
                    key: "selection",
                    label: "Selection",
                    children: (
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Table
                          rowKey="id"
                          dataSource={selections}
                          pagination={false}
                          columns={[
                            { title: "Статус", dataIndex: "status", width: 120 },
                            { title: "Комментарий", dataIndex: "note" },
                            { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
                          ]}
                        />
                        <Table
                          rowKey="id"
                          dataSource={selectionLines}
                          pagination={false}
                          columns={[
                            { title: "RFQ item", dataIndex: "rfq_item_id", width: 90 },
                            { title: "Компонент", dataIndex: "component_cat_number", width: 160 },
                            { title: "Поставщик", dataIndex: "supplier_name", width: 180 },
                            { title: "Предложение", dataIndex: "supplier_part_number", width: 160 },
                            { title: "Тип", dataIndex: "offer_type", width: 90 },
                            {
                              title: "Цена",
                              dataIndex: "price",
                              width: 120,
                              render: (value, record) =>
                                value == null ? "-" : `${value} ${record.currency || ""}`.trim(),
                            },
                            { title: "Qty", dataIndex: "qty", width: 80 },
                            { title: "Комментарий", dataIndex: "decision_note" },
                          ]}
                        />
                      </Space>
                    ),
                  },
                  {
                    key: "economics",
                    label: "Экономика",
                    children: (
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Table
                          rowKey="id"
                          dataSource={shipmentGroups}
                          pagination={false}
                          columns={[
                            { title: "Группа", dataIndex: "name" },
                            { title: "Маршрут", dataIndex: "origin_location" },
                            { title: "Транспорт", dataIndex: "transport_mode", width: 120 },
                          ]}
                        />
                        <Table
                          rowKey="id"
                          dataSource={landedCosts}
                          pagination={false}
                          columns={[
                            { title: "Снимок", dataIndex: "name" },
                            { title: "Итого", dataIndex: "landed_total", width: 120 },
                            { title: "Валюта", dataIndex: "currency", width: 90 },
                          ]}
                        />
                      </Space>
                    ),
                  },
                  {
                    key: "sales",
                    label: "КП",
                    children: (
                      <Table
                        rowKey="id"
                        dataSource={salesQuotes}
                        pagination={false}
                        columns={[
                          { title: "Статус", dataIndex: "status", width: 120 },
                          { title: "Валюта", dataIndex: "currency", width: 90 },
                          { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
                        ]}
                      />
                    ),
                  },
                  {
                    key: "contracts",
                    label: "Контракт",
                    children: (
                      <Table
                        rowKey="id"
                        dataSource={contracts}
                        pagination={false}
                        columns={[
                          { title: "Номер", dataIndex: "contract_number" },
                          { title: "Статус", dataIndex: "status", width: 120 },
                          { title: "Дата", dataIndex: "contract_date", width: 120, render: formatDate },
                        ]}
                      />
                    ),
                  },
                  {
                    key: "po",
                    label: "PO",
                    children: (
                      <Table
                        rowKey="id"
                        dataSource={purchaseOrders}
                        pagination={false}
                        columns={[
                          { title: "Поставщик", dataIndex: "supplier_name" },
                          { title: "Статус", dataIndex: "status", width: 120 },
                          { title: "Ссылка", dataIndex: "supplier_reference" },
                          { title: "Создано", dataIndex: "created_at", width: 120, render: formatDate },
                        ]}
                      />
                    ),
                  },
                ]}
              />
            </Space>
          </Card>
        ) : (
          <Card size="small">
            <Text type="secondary">Выберите RFQ для просмотра рабочего пространства.</Text>
          </Card>
        )}
      </Space>
      <Modal
        open={bundleModal.open}
        onCancel={() =>
          setBundleModal({
            open: false,
            item: null,
            bundles: [],
            loading: false,
            activeBundleId: null,
            bundleSummary: null,
          })
        }
        footer={null}
        width={820}
        title={
          bundleModal.item
            ? `Комплекты для ${bundleModal.item.original_cat_number || bundleModal.item.client_part_number || "позиции"}`
            : "Комплекты"
        }
      >
        <Table
          rowKey="id"
          dataSource={bundleModal.bundles}
          loading={bundleModal.loading}
          pagination={false}
          rowSelection={{
            type: "radio",
            selectedRowKeys: bundleModal.activeBundleId ? [bundleModal.activeBundleId] : [],
            onChange: (keys) => loadBundleSummary(keys?.[0]),
          }}
          columns={[
            { title: "Название", dataIndex: "title" },
            { title: "Позиции", dataIndex: "items_count", width: 110 },
            { title: "Примечание", dataIndex: "note" },
          ]}
        />
        {bundleModal.bundleSummary ? (
          <Card size="small" style={{ marginTop: 12 }} title="Состав комплекта">
            <Table
              rowKey="link_id"
              dataSource={bundleModal.bundleSummary.options || []}
              pagination={false}
              columns={[
                { title: "Роль", dataIndex: "role_label", width: 160 },
                { title: "Поставщик", dataIndex: "supplier_name", width: 200 },
                { title: "Номер", dataIndex: "supplier_part_number", width: 140 },
                { title: "Кол-во", dataIndex: "qty", width: 90 },
                {
                  title: "По умолчанию",
                  dataIndex: "is_default",
                  width: 120,
                  render: (value) => (value ? <Tag color="green">Да</Tag> : "-"),
                },
              ]}
            />
          </Card>
        ) : null}
      </Modal>
    </PageWrapper>
  )
}
