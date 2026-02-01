import React, { useEffect, useMemo, useState, useCallback, Suspense, lazy } from "react"
import { Card, Space, Button, Tree, Typography, Tooltip, Empty, Divider, Tag, message } from "antd"
import {
  BranchesOutlined,
} from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import MaterialsTable from "./MaterialsTable"
import MaterialsImportModal from "./MaterialsImportModal"
import MaterialFormModal from "./MaterialFormModal"
import createTablePagination from "@/utils/tablePagination"
import TableToolbar from "@/components/common/TableToolbar"

const MaterialDetailsDrawer = lazy(() => import("./MaterialDetailsDrawer"))

const { Text } = Typography

export default function MaterialsMain() {
  const [categories, setCategories] = useState([])
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [catLoading, setCatLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [search, setSearch] = useState("")
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState(null)

  const [cursor, setCursor] = useState({ limit: 200, offset: 0 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const loadCategories = useCallback(async () => {
    setCatLoading(true)
    try {
      const { data } = await axios.get("/materials/categories")
      setCategories(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("Не удалось загрузить категории материалов", e)
      message.error("Не удалось загрузить категории")
    } finally {
      setCatLoading(false)
    }
  }, [])

  const loadMaterials = useCallback(
    async (opts = {}) => {
      const params = {
        limit: opts.limit ?? cursor.limit,
        offset: opts.offset ?? cursor.offset,
      }
      if (selectedCategory) params.category_id = selectedCategory
      if (opts.search?.trim?.() || search.trim()) {
        params.q = (opts.search ?? search).trim()
      }

      setLoading(true)
      try {
        const { data } = await axios.get("/materials", { params })
        setMaterials(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error("Ошибка загрузки материалов", e)
        message.error("Не удалось загрузить материалы")
      } finally {
        setLoading(false)
      }
    },
    [cursor.limit, cursor.offset, search, selectedCategory]
  )

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    loadMaterials({ offset: 0 })
    setPage(1)
  }, [selectedCategory, search, loadMaterials])

  const treeData = useMemo(() => {
    const byParent = categories.reduce((acc, c) => {
      const key = c.parent_id || 0
      if (!acc[key]) acc[key] = []
      acc[key].push(c)
      return acc
    }, {})

    const build = (parentId = 0) =>
      (byParent[parentId] || []).map((c) => ({
        title: (
          <Space size={6}>
            <Text>{c.name}</Text>
            <Tag size="small" color="geekblue">
              {c.materials_count || 0}
            </Tag>
          </Space>
        ),
        key: c.id,
        children: build(c.id),
      }))

    return build(0)
  }, [categories])

  const onSelectCategory = (keys) => {
    const key = keys?.[0]
    setSelectedCategory(key || null)
    setCursor((prev) => ({ ...prev, offset: 0 }))
    setPage(1)
  }

  const handleRefresh = () => {
    loadCategories()
    loadMaterials()
    setPage(1)
  }

  const handleRowClick = (record) => {
    setSelectedMaterial(record)
    setDetailsOpen(true)
  }

  const handleImported = () => {
    setImportOpen(false)
    loadCategories()
    loadMaterials()
  }

  const handleCreate = () => {
    setFormData(null)
    setFormOpen(true)
  }

  const handleEdit = async (record) => {
    try {
      const { data } = await axios.get(`/materials/${record.id}`)
      setFormData(data)
      setFormOpen(true)
    } catch (e) {
      console.error("Не удалось загрузить материал для редактирования", e)
      message.error("Не удалось загрузить материал")
    }
  }

  const handleSubmitForm = async (payload) => {
    if (formData?.id) {
      await axios.put(`/materials/${formData.id}`, payload)
      message.success("Материал обновлён")
    } else {
      await axios.post("/materials", payload)
      message.success("Материал создан")
    }
    setFormOpen(false)
    setFormData(null)
    loadCategories()
    loadMaterials()
  }

  const handleDelete = async (record) => {
    try {
      await axios.delete(`/materials/${record.id}`)
      message.success("Материал удалён")
      loadCategories()
      loadMaterials()
    } catch (e) {
      console.error("Ошибка удаления материала", e)
      message.error("Не удалось удалить материал")
    }
  }

  const pagination = useMemo(
    () =>
      createTablePagination({
        page,
        pageSize,
        total: materials.length,
        setPage,
        setPageSize,
      }),
    [page, pageSize, materials.length]
  )

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize
    return materials.slice(start, start + pageSize)
  }, [materials, page, pageSize])

  const hasSelection = !!selectedCategory

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card bodyStyle={{ paddingTop: 8 }}>
        <div className="table-section" style={{ marginTop: 0 }}>
          <TableToolbar
            placeholder="Поиск: название, код, стандарт, описание"
            search={search}
            onSearch={(v) => setSearch(v)}
            onRefresh={handleRefresh}
            onAdd={handleCreate}
            onImport={() => setImportOpen(true)}
            searchWidth="clamp(280px, 42vw, 620px)"
            searchEnterButton="Найти"
          />
        </div>

        <Space align="start" size={16} style={{ width: "100%" }}>
          <Card
            style={{ width: 280, minHeight: 480 }}
            bodyStyle={{ padding: 12 }}
            title={
              <Space>
                <BranchesOutlined />
                <span>Категории</span>
              </Space>
            }
            extra={
              <Tooltip title="Снять фильтр">
                <Button
                  size="small"
                  onClick={() => {
                    setSelectedCategory(null)
                    loadMaterials({ offset: 0 })
                  }}
                  disabled={!hasSelection}
                >
                  Сбросить
                </Button>
              </Tooltip>
            }
          >
            {treeData.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={catLoading ? "Загрузка..." : "Категории не найдены"}
              />
            ) : (
              <Tree
                selectable
                selectedKeys={selectedCategory ? [selectedCategory] : []}
                treeData={treeData}
                onSelect={onSelectCategory}
                showIcon={false}
                defaultExpandAll
              />
            )}
          </Card>

          <Card style={{ flex: 1 }} bodyStyle={{ padding: 0 }}>
            <MaterialsTable
              data={paginatedData}
              loading={loading}
              onRowClick={handleRowClick}
              onEdit={handleEdit}
              onDelete={handleDelete}
              pagination={pagination}
            />
            {materials.length === 0 && !loading && (
              <>
                <Divider style={{ margin: 0 }} />
                <Empty
                  style={{ margin: "24px 0" }}
                  description="Нет материалов по выбранному фильтру"
                />
              </>
            )}
          </Card>
        </Space>
      </Card>

      <Suspense fallback={null}>
        <MaterialDetailsDrawer
          open={detailsOpen}
          material={selectedMaterial}
          onClose={() => setDetailsOpen(false)}
        />
      </Suspense>

      <MaterialsImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={handleImported}
      />

      <MaterialFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setFormData(null)
        }}
        onSubmit={handleSubmitForm}
        initialData={formData}
        categories={categories}
      />
    </Space>
  )
}
