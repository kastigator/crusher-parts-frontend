// src/components/users/TabsTable.jsx
import React, { useEffect, useState } from "react"
import {
  Table,
  Input,
  Button,
  Space,
  Form,
  Tooltip,
  Modal,
  message
} from "antd"
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlusOutlined,
  AppstoreOutlined
} from "@ant-design/icons"
import * as Icons from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import { useTabs } from "@/context/TabsContext"
import CyrillicToTranslit from "cyrillic-to-translit-js"
import ActionButtons from "@/components/common/ActionButtons"
import confirmAction from "@/utils/confirmAction" // ✅ добавили

const translit = new CyrillicToTranslit()
const iconOptions = Object.keys(Icons).filter((key) => key.endsWith("Outlined"))

export default function TabsTable() {
  const { reloadTabs } = useTabs()
  const [data, setData] = useState([])
  const [editingKey, setEditingKey] = useState("")
  const [form] = Form.useForm()
  const [newRow, setNewRow] = useState({
    name: "",
    tab_name: "",
    path: "",
    icon: ""
  })
  const [iconModalOpen, setIconModalOpen] = useState(false)
  const [iconTargetKey, setIconTargetKey] = useState(null)
  const [iconSearch, setIconSearch] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchTabs()
  }, [])

  const fetchTabs = async () => {
    setLoading(true)
    try {
      const res = await axios.get("/tabs")
      setData(res.data.sort((a, b) => a.sort_order - b.sort_order))
    } catch (err) {
      console.error("Ошибка загрузки:", err)
    } finally {
      setLoading(false)
    }
  }

  const isEditing = (record) => record.id === editingKey

  const edit = (record) => {
    form.setFieldsValue({ ...record })
    setEditingKey(record.id)
  }

  const cancel = () => setEditingKey("")

  const save = async (id) => {
    try {
      const row = await form.validateFields()
      await axios.put(`/tabs/${id}`, row)
      setEditingKey("")
      fetchTabs()
      reloadTabs()
      message.success("Сохранено")
    } catch (err) {
      console.error("Ошибка сохранения:", err)
      message.error("Ошибка")
    }
  }

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction(`Удалить вкладку "${record.name}"?`)
    if (!confirmed) return

    try {
      await axios.delete(`/tabs/${record.id}`)
      fetchTabs()
      reloadTabs()
      message.success("Удалено")
    } catch (err) {
      console.error("Ошибка удаления:", err)
      message.error("Не удалось удалить вкладку")
    }
  }

  const handleCreate = async () => {
    if (!newRow.name) return
    try {
      await axios.post("/tabs", newRow)
      setNewRow({ name: "", tab_name: "", path: "", icon: "" })
      fetchTabs()
      reloadTabs()
      message.success("Вкладка создана")
    } catch (err) {
      console.error("Ошибка создания:", err)
      message.error("Ошибка при добавлении")
    }
  }

  const handleInput = (key, value) => {
    const name = key === "name" ? value : newRow.name
    const slug = translit.transform(name, "_")
    setNewRow((prev) => ({
      ...prev,
      [key]: value,
      tab_name: key === "name" ? slug : prev.tab_name,
      path: key === "name" ? "/" + slug.replace(/_/g, "-") : prev.path
    }))
  }

  const moveRow = async (id, direction) => {
    const index = data.findIndex((r) => r.id === id)
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= data.length) return

    const updated = [...data]
    const [moved] = updated.splice(index, 1)
    updated.splice(targetIndex, 0, moved)

    await axios.put(
      "/tabs/order",
      updated.map((r, i) => ({ id: r.id, sort_order: i + 1 }))
    )
    fetchTabs()
    reloadTabs()
  }

  const openIconModal = (rowKey) => {
    setIconTargetKey(rowKey)
    setIconSearch("")
    setIconModalOpen(true)
  }

  const selectIcon = async (icon) => {
    try {
      if (iconTargetKey === "new") {
        setNewRow((prev) => ({ ...prev, icon }))
      } else {
        const record = data.find((r) => r.id === iconTargetKey)
        if (!record) return

        const safe = (v) => (v === undefined ? null : v)

        await axios.put(`/tabs/${record.id}`, {
          name: safe(record.name),
          tab_name: safe(record.tab_name),
          path: safe(record.path),
          icon
        })
        message.success("Иконка обновлена")
        fetchTabs()
        reloadTabs()
      }
    } catch (err) {
      console.error("Ошибка при обновлении иконки:", err)
      message.error("Не удалось обновить иконку")
    } finally {
      setIconModalOpen(false)
    }
  }

  const filteredIcons = iconOptions.filter((icon) =>
    icon.toLowerCase().includes(iconSearch.toLowerCase())
  )

  const columns = [
    { title: "Название", dataIndex: "name", editable: true },
    { title: "Тех. имя", dataIndex: "tab_name", editable: true },
    { title: "Путь", dataIndex: "path", editable: true },
    {
      title: "Иконка",
      dataIndex: "icon",
      editable: true,
      render: (value, record) => (
        <Button
          icon={
            value && Icons[value]
              ? React.createElement(Icons[value])
              : <AppstoreOutlined />
          }
          onClick={() => openIconModal(record.id)}
        >
          {value || "Выбрать"}
        </Button>
      )
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_, record) => {
        const editing = isEditing(record)
        return (
          <Space>
            {!editing && (
              <>
                <Tooltip title="Вверх">
                  <Button
                    icon={<ArrowUpOutlined />}
                    onClick={() => moveRow(record.id, "up")}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title="Вниз">
                  <Button
                    icon={<ArrowDownOutlined />}
                    onClick={() => moveRow(record.id, "down")}
                    size="small"
                  />
                </Tooltip>
              </>
            )}
            <ActionButtons
              onSave={editing ? () => save(record.id) : undefined}
              onCancel={editing ? cancel : undefined}
              onDelete={!editing ? () => handleDelete(record) : undefined}
              size="small"
            />
          </Space>
        )
      }
    }
  ]

  const mergedColumns = columns.map((col) =>
    !col.editable
      ? col
      : {
          ...col,
          onCell: (record) => ({
            record,
            inputType: "text",
            dataIndex: col.dataIndex,
            title: col.title,
            editing: isEditing(record),
            onDoubleClick: () => edit(record)
          })
        }
  )

  const EditableCell = ({
    editing,
    dataIndex,
    record,
    children,
    ...restProps
  }) => (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          initialValue={record[dataIndex]}
        >
          <Input onPressEnter={() => save(record.id)} />
        </Form.Item>
      ) : (
        children
      )}
    </td>
  )

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Название"
          value={newRow.name}
          onChange={(e) => handleInput("name", e.target.value)}
        />
        <Input
          placeholder="Тех. имя"
          value={newRow.tab_name}
          onChange={(e) => handleInput("tab_name", e.target.value)}
        />
        <Input
          placeholder="Путь"
          value={newRow.path}
          onChange={(e) => handleInput("path", e.target.value)}
        />
        <Button
          icon={
            newRow.icon && Icons[newRow.icon]
              ? React.createElement(Icons[newRow.icon])
              : <AppstoreOutlined />
          }
          onClick={() => openIconModal("new")}
        >
          {newRow.icon || "Выбрать"}
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Добавить
        </Button>
      </Space>

      <Form form={form} component={false}>
        <Table
          components={{ body: { cell: EditableCell } }}
          bordered
          rowKey="id"
          dataSource={data}
          columns={mergedColumns}
          pagination={false}
          loading={loading}
        />
      </Form>

      <Modal
        open={iconModalOpen}
        title="Выберите иконку"
        onCancel={() => setIconModalOpen(false)}
        footer={null}
        width={800}
      >
        <Input
          placeholder="Поиск иконки..."
          value={iconSearch}
          onChange={(e) => setIconSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            maxHeight: "60vh",
            overflowY: "auto"
          }}
        >
          {filteredIcons.map((icon) => (
            <Button
              key={icon}
              icon={React.createElement(Icons[icon])}
              onClick={() => selectIcon(icon)}
              style={{ width: 120 }}
            >
              {icon.replace("Outlined", "")}
            </Button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
