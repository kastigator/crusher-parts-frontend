import React, { useEffect, useState } from "react"
import { Card, Space, Form, Input, Button, Tabs, message } from "antd"
import axios from "@/api/axiosInstance"
import ClientsTable from "./ClientsTable"
import BillingAddressesTable from "./BillingAddressesTable"
import ShippingAddressesTable from "./ShippingAddressesTable"
import BankDetailsTable from "./BankDetailsTable"
import TableToolbar from "@/components/common/TableToolbar"

const { TabPane } = Tabs

export default function ClientsMain() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [expandedClientId, setExpandedClientId] = useState(null)
  const [activeTab, setActiveTab] = useState("billing")
  const [newClient, setNewClient] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await axios.get("/clients")
      setData(res.data)
    } catch (err) {
      console.error("Ошибка загрузки клиентов:", err)
      message.error("Не удалось загрузить клиентов")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAdd = async () => {
    if (!newClient?.company_name) {
      message.warning("Название компании обязательно")
      return
    }

    try {
      const res = await axios.post("/clients", {
        ...newClient,
        phone: newClient.phone || "",
        email: newClient.email || "",
      })
      message.success("Клиент добавлен")
      setNewClient(null)
      fetchData()
    } catch (err) {
      console.error("Ошибка при добавлении клиента:", err)
      message.error("Не удалось добавить клиента")
    }
  }

  const filtered = data.filter(
    (r) =>
      r.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.contact_person?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={16}>
      <Card title="Клиенты" bodyStyle={{ paddingTop: 0 }}>
        <TableToolbar
          filterValue={search}
          onFilterChange={setSearch}
          searchPlaceholder="Поиск по названию или контакту"
        />

        <Form layout="inline" style={{ marginBottom: 16 }} onFinish={handleAdd}>
          <Form.Item label="Компания">
            <Input
              value={newClient?.company_name || ""}
              onChange={(e) =>
                setNewClient((prev) => ({ ...prev, company_name: e.target.value }))
              }
              placeholder="Название"
            />
          </Form.Item>

          <Form.Item label="Контактное лицо">
            <Input
              value={newClient?.contact_person || ""}
              onChange={(e) =>
                setNewClient((prev) => ({ ...prev, contact_person: e.target.value }))
              }
              placeholder="ФИО"
            />
          </Form.Item>

          <Form.Item label="Телефон">
            <Input
              value={newClient?.phone || ""}
              onChange={(e) =>
                setNewClient((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="+7..."
            />
          </Form.Item>

          <Form.Item label="Email">
            <Input
              value={newClient?.email || ""}
              onChange={(e) =>
                setNewClient((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="example@mail.com"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Добавить
            </Button>
          </Form.Item>
        </Form>

        <ClientsTable
          data={filtered}
          loading={loading}
          expandedClientId={expandedClientId}
          setExpandedClientId={setExpandedClientId}
        />

        {expandedClientId && (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            style={{ marginTop: 24 }}
          >
            <TabPane tab="Юридические адреса" key="billing">
              <BillingAddressesTable clientId={expandedClientId} />
            </TabPane>
            <TabPane tab="Адреса доставки" key="shipping">
              <ShippingAddressesTable clientId={expandedClientId} />
            </TabPane>
            <TabPane tab="Банковские реквизиты" key="bank">
              <BankDetailsTable clientId={expandedClientId} />
            </TabPane>
          </Tabs>
        )}
      </Card>
    </Space>
  )
}
