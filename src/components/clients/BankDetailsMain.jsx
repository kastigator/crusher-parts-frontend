import React, { useEffect, useState } from "react"
import { Row, Col, Input, Button, message } from "antd"
import axios from "@/api/axiosInstance"
import fetchBankByBic from "@/utils/fetchBankByBic"
import BankDetailsTable from "./BankDetailsTable"
import TableToolbar from "@/components/common/TableToolbar"
import CurrencySelect from "@/components/inputs/CurrencySelect"

export default function BankDetailsMain({ clientId, onChanged }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")

  const [newBank, setNewBank] = useState({
    bic: "",
    bank_name: "",
    correspondent_account: "",
    account_number: "",
    currency: "RUB",
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get("/client-bank-details", { params: { client_id: clientId } })
      setData(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить банковские реквизиты")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clientId) return
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const filtered = data.filter((r) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      String(r.bank_name || "").toLowerCase().includes(q) ||
      String(r.bic || "").toLowerCase().includes(q) ||
      String(r.account_number || "").toLowerCase().includes(q) ||
      String(r.correspondent_account || "").toLowerCase().includes(q)
    )
  })

  const handleAdd = async () => {
    if (!clientId) return
    if (!newBank.account_number?.trim()) {
      message.warning("Укажите расчётный счёт")
      return
    }
    setSubmitting(true)
    try {
      await axios.post("/client-bank-details", {
        client_id: clientId,
        bank_name: newBank.bank_name || null,
        bic: newBank.bic || null,
        correspondent_account: newBank.correspondent_account || null,
        account_number: newBank.account_number || null,
        currency: newBank.currency || null,
      })
      message.success("Реквизиты добавлены")
      setNewBank({
        bic: "",
        bank_name: "",
        correspondent_account: "",
        account_number: "",
        currency: "RUB",
      })
      fetchData()
      onChanged?.()
    } catch (e) {
      console.error(e)
      message.error(e?.response?.data?.message || "Не удалось добавить реквизиты")
    } finally {
      setSubmitting(false)
    }
  }

  const onUpdate = async (id, updated) => {
    try {
      const { data: fresh } = await axios.put(`/client-bank-details/${id}`, updated)
      setData((prev) => prev.map((r) => (r.id === id ? fresh : r)))
      message.success("Изменения сохранены")
      onChanged?.()
    } catch (e) {
      const err = new Error("update failed")
      err.original = e
      err.isVersionConflict = e?.response?.status === 409
      err.currentRecord = e?.response?.data?.current || null
      throw err
    }
  }

  const onDelete = async (record) => {
    try {
      await axios.delete(`/client-bank-details/${record.id}`, { params: { version: record.version } })
      setData((prev) => prev.filter((r) => r.id !== record.id))
      message.success("Реквизиты удалены")
      onChanged?.()
    } catch (e) {
      const status = e?.response?.status
      if (status === 409) {
        const current = e?.response?.data?.current
        const err = new Error("version conflict")
        err.isVersionConflict = true
        err.currentRecord = current
        throw err
      }
      throw e
    }
  }

  const replaceRow = (fresh) => {
    if (!fresh?.id) return
    setData((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))
  }

  const onBicChange = async (bic) => {
    setNewBank((p) => ({ ...p, bic }))
    if (!bic || bic.length < 6) return
    try {
      const info = await fetchBankByBic(bic)
      if (info) {
        setNewBank((p) => ({
          ...p,
          bank_name: info.bank_name || p.bank_name,
          correspondent_account: info.correspondent_account || p.correspondent_account,
        }))
      }
    } catch { /* noop */ }
  }

  return (
    <>
      <TableToolbar search={search} onSearch={setSearch} onImport={null} onShowDeleted={null} />

      {/* Форма быстрого добавления */}
      <Row gutter={[8, 8]} wrap align="middle" style={{ marginBottom: 12 }}>
        <Col span={4}>
          <Input
            placeholder="БИК"
            value={newBank.bic}
            onChange={(e) => onBicChange(e.target.value)}
            maxLength={11}
          />
        </Col>

        <Col span={5}>
          <Input placeholder="Банк" value={newBank.bank_name} disabled />
        </Col>

        <Col span={5}>
          <Input placeholder="Кор. счёт" value={newBank.correspondent_account} disabled />
        </Col>

        <Col span={3}>
          <CurrencySelect
            value={newBank.currency}
            onChange={(val) => setNewBank((prev) => ({ ...prev, currency: val }))}
            getPopupContainer={(trigger) => trigger?.parentElement || document.body}
            style={{ minWidth: 160 }}
          />
        </Col>

        <Col span={5}>
          <Input
            placeholder="* Расч. счёт"
            value={newBank.account_number}
            onChange={(e) => setNewBank((prev) => ({ ...prev, account_number: e.target.value }))}
          />
        </Col>

        <Col>
          <Button type="primary" onClick={handleAdd} loading={submitting}>
            Добавить
          </Button>
        </Col>
      </Row>

      {/* Якорь для корректной работы выпадашек + применение табличного скоуп-стиля */}
      <div className="parts-table-wrap">
        <BankDetailsTable
          clientId={clientId}
          data={filtered}
          loading={loading}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onReplaceRow={replaceRow}
          onRefresh={fetchData}
        />
      </div>
    </>
  )
}
