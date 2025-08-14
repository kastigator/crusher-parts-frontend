import React, { useEffect, useState } from "react"
import { Row, Col, Input, Button, Checkbox, message, Card } from "antd"
import axios from "@/api/axiosInstance"
import SupplierBankDetailsTable from "./SupplierBankDetailsTable"
import TableToolbar from "@/components/common/TableToolbar"
import CurrencySelect from "@/components/inputs/CurrencySelect"

export default function SupplierBankDetailsMain({ supplierId, onChanged }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [newBank, setNewBank] = useState({
    bank_name: "",
    account_number: "",
    currency: "", // ISO3: EUR, USD, ...
    bic: "",
    iban: "",
    correspondent_account: "",
    bank_address: "",
    additional_info: "",
    is_primary_for_currency: false,
  })

  const fetchData = async () => {
    if (!supplierId) return
    setLoading(true)
    try {
      const res = await axios.get("/supplier-bank-details", {
        params: { supplier_id: supplierId },
      })
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Ошибка загрузки реквизитов:", err)
      message.error("Не удалось загрузить реквизиты")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  const handleAdd = async () => {
    if (!supplierId) return
    const payload = {
      supplier_id: supplierId,
      bank_name: newBank.bank_name?.trim(),
      account_number: newBank.account_number?.trim(),
      currency: newBank.currency?.trim().toUpperCase().slice(0, 3) || null,
      bic: newBank.bic?.trim() || null,
      iban: newBank.iban?.trim() || null,
      correspondent_account: newBank.correspondent_account?.trim() || null,
      bank_address: newBank.bank_address?.trim() || null,
      additional_info: newBank.additional_info?.trim() || null,
      is_primary_for_currency: newBank.is_primary_for_currency ? 1 : 0,
    }

    if (!payload.bank_name || !payload.account_number) {
      message.warning("Введите банк и расчётный счёт")
      return
    }

    setSubmitting(true)
    try {
      const { data: created } = await axios.post("/supplier-bank-details", payload)
      // мгновенно в таблицу
      setData((prev) => [created, ...prev])
      setNewBank({
        bank_name: "",
        account_number: "",
        currency: "",
        bic: "",
        iban: "",
        correspondent_account: "",
        bank_address: "",
        additional_info: "",
        is_primary_for_currency: false,
      })
      message.success("Реквизиты добавлены")
      onChanged?.()
    } catch (err) {
      console.error("Ошибка добавления реквизитов:", err)
      message.error(err?.response?.data?.message || "Не удалось добавить реквизиты")
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = search
    ? data.filter((x) =>
        [x.bank_name, x.account_number, x.currency, x.bic, x.iban]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : data

  if (!supplierId) return null

  return (
    <>
      <TableToolbar
        placeholder="Поиск по банку, счёту, валюте, BIC"
        search={search}
        onSearch={setSearch}
      />

      <Card size="small" style={{ marginTop: 8, marginBottom: 12 }}>
        <Row gutter={12} align="middle" style={{ marginBottom: 8 }}>
          <Col span={6}>
            <Input
              placeholder="* Банк"
              value={newBank.bank_name}
              onChange={(e) => setNewBank((p) => ({ ...p, bank_name: e.target.value }))}
              onPressEnter={handleAdd}
            />
          </Col>

          <Col span={6}>
            <Input
              placeholder="* Расч. счёт"
              value={newBank.account_number}
              onChange={(e) => setNewBank((p) => ({ ...p, account_number: e.target.value }))}
              onPressEnter={handleAdd}
            />
          </Col>

          <Col span={4}>
            <CurrencySelect
              value={newBank.currency}
              onChange={(v) => setNewBank((p) => ({ ...p, currency: v || "" }))}
              TextFieldProps={{ size: "small", label: "Валюта" }}
            />
          </Col>

          <Col span={4}>
            <Input
              placeholder="BIC"
              value={newBank.bic}
              onChange={(e) => setNewBank((p) => ({ ...p, bic: e.target.value }))}
              onPressEnter={handleAdd}
            />
          </Col>

          <Col span={4}>
            <Input
              placeholder="IBAN"
              value={newBank.iban}
              onChange={(e) => setNewBank((p) => ({ ...p, iban: e.target.value }))}
              onPressEnter={handleAdd}
            />
          </Col>
        </Row>

        <Row gutter={12} align="middle" style={{ marginBottom: 8 }}>
          <Col span={6}>
            <Input
              placeholder="Корр. счёт"
              value={newBank.correspondent_account}
              onChange={(e) => setNewBank((p) => ({ ...p, correspondent_account: e.target.value }))}
              onPressEnter={handleAdd}
            />
          </Col>
          <Col span={8}>
            <Input
              placeholder="Адрес банка"
              value={newBank.bank_address}
              onChange={(e) => setNewBank((p) => ({ ...p, bank_address: e.target.value }))}
              onPressEnter={handleAdd}
            />
          </Col>
          <Col span={6}>
            <Input
              placeholder="Доп. информация"
              value={newBank.additional_info}
              onChange={(e) => setNewBank((p) => ({ ...p, additional_info: e.target.value }))}
              onPressEnter={handleAdd}
            />
          </Col>
          <Col span={4}>
            <Checkbox
              checked={newBank.is_primary_for_currency}
              onChange={(e) =>
                setNewBank((p) => ({ ...p, is_primary_for_currency: e.target.checked }))
              }
            >
              Основной для валюты
            </Checkbox>
          </Col>
        </Row>

        <Row>
          <Col>
            <Button type="primary" onClick={handleAdd} loading={submitting}>
              Добавить
            </Button>
          </Col>
        </Row>
      </Card>

      <SupplierBankDetailsTable
        supplierId={supplierId}
        data={filtered}
        setData={setData}
        loading={loading}
        onChanged={onChanged}
      />
    </>
  )
}
