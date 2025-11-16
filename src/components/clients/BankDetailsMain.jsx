// src/components/clients/bankDetails/BankDetailsMain.jsx
import React, { useEffect, useState } from "react"
import { Row, Col, Input, Button, message } from "antd"
import axios from "@/api/axiosInstance"
import fetchBankByBic from "@/utils/fetchBankByBic"
import BankDetailsTable from "./BankDetailsTable"
import TableToolbar from "@/components/common/TableToolbar"
import CurrencySelect from "@/components/inputs/CurrencySelect" // ваш компонент

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
    if (!clientId) return
    setLoading(true)
    try {
      const { data } = await axios.get("/client-bank-details", {
        params: { client_id: clientId },
      })
      setData(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error("Ошибка загрузки банковских реквизитов:", e)
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
        bank_name: newBank.bank_name?.trim() || null,
        bic: newBank.bic?.trim() || null,
        correspondent_account: newBank.correspondent_account?.trim() || null,
        account_number: newBank.account_number?.trim() || null,
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
      console.error("Ошибка при добавлении реквизитов:", e)
      message.error(
        e?.response?.data?.message || "Не удалось добавить реквизиты"
      )
    } finally {
      setSubmitting(false)
    }
  }

  // --- optimistic update/delete (для VersionConflictModal в таблице) ---
  const onUpdate = async (id, updated) => {
    const payload = {
      bank_name: updated.bank_name?.trim() || null,
      bic: updated.bic?.trim() || null,
      correspondent_account: updated.correspondent_account?.trim() || null,
      account_number: updated.account_number?.trim() || null,
      currency: updated.currency || null,
      version: updated.version,
    }

    try {
      const { data: fresh } = await axios.put(
        `/client-bank-details/${id}`,
        payload
      )
      setData((prev) => prev.map((r) => (r.id === id ? fresh : r)))
      message.success("Изменения сохранены")
      onChanged?.()
    } catch (e) {
      const err = new Error("update failed")
      err.original = e
      if (e?.response?.status === 409) {
        err.isVersionConflict = true
        err.currentRecord = e?.response?.data?.current || null
      }
      throw err
    }
  }

  const onDelete = async (record) => {
    try {
      await axios.delete(`/client-bank-details/${record.id}`, {
        params: { version: record.version },
      })
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

  // --- автозаполнение по БИК ---
  const onBicChange = async (bic) => {
    setNewBank((p) => ({ ...p, bic }))
    if (!bic || bic.length < 6) return

    try {
      const info = await fetchBankByBic(bic)
      if (info) {
        setNewBank((p) => ({
          ...p,
          // поддерживаем оба варианта: bank_name или name
          bank_name: info.bank_name || info.name || p.bank_name,
          correspondent_account:
            info.correspondent_account || p.correspondent_account,
        }))
      }
    } catch {
      // если банк по БИК не найден или сервис недоступен — даём заполнить руками
    }
  }

  if (!clientId) return null

  return (
    <div className="parts-table-wrap">
      <TableToolbar
        className="table-section"
        search={search}
        onSearch={setSearch}
        onImport={null}
        onShowDeleted={null}
      />

      {/* Форма быстрого добавления */}
      <Row
        gutter={[8, 8]}
        wrap
        align="middle"
        className="table-section"
        style={{ marginBottom: 8 }}
      >
        <Col span={4}>
          <Input
            placeholder="БИК"
            value={newBank.bic}
            onChange={(e) => onBicChange(e.target.value)}
            maxLength={11}
          />
        </Col>

        <Col span={5}>
          <Input
            placeholder="Банк"
            value={newBank.bank_name}
            onChange={(e) =>
              setNewBank((p) => ({ ...p, bank_name: e.target.value }))
            }
          />
        </Col>

        <Col span={5}>
          <Input
            placeholder="Кор. счёт"
            value={newBank.correspondent_account}
            onChange={(e) =>
              setNewBank((p) => ({
                ...p,
                correspondent_account: e.target.value,
              }))
            }
          />
        </Col>

        <Col span={3}>
          <CurrencySelect
            value={newBank.currency}
            onChange={(val) =>
              setNewBank((prev) => ({ ...prev, currency: val }))
            }
            size="small"
            style={{ minWidth: 150 }}
            getPopupContainer={(trigger) =>
              trigger?.closest(".parts-table-wrap") || document.body
            }
          />
        </Col>

        <Col span={5}>
          <Input
            placeholder="* Расч. счёт"
            value={newBank.account_number}
            onChange={(e) =>
              setNewBank((prev) => ({
                ...prev,
                account_number: e.target.value,
              }))
            }
          />
        </Col>

        <Col>
          <Button type="primary" onClick={handleAdd} loading={submitting}>
            Добавить
          </Button>
        </Col>
      </Row>

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
  )
}
