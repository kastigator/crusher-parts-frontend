// src/components/suppliers/SupplierBankDetailsMain.jsx
import React, { useEffect, useState } from "react"
import { Card, Button, Input, Row, Col, Checkbox, message } from "antd"
import axios from "@/api/axiosInstance"

import TableToolbar from "@/components/common/TableToolbar"
import SupplierBankDetailsTable from "./SupplierBankDetailsTable"
import VersionConflictModal from "@/components/common/VersionConflictModal"
import CurrencySelect from "@/components/inputs/CurrencySelect"


const trimOrNull = (v) => {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

export default function SupplierBankDetailsMain({ supplierId, onChanged }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [conflict, setConflict] = useState(null)

  const [newBank, setNewBank] = useState({
    bank_name: "",
    account_number: "",
    iban: "",
    bic: "",
    currency: "",
    correspondent_account: "",
    bank_address: "",
    additional_info: "",
    is_primary_for_currency: false,
  })

  const fetchData = async () => {
    if (!supplierId) return
    setLoading(true)
    try {
      const { data: list } = await axios.get("/supplier-bank-details", {
        params: { supplier_id: supplierId },
      })
      setData(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error("Ошибка загрузки банковских реквизитов поставщика:", e)
      message.error("Не удалось загрузить банковские реквизиты поставщика")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!supplierId) return
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  const handleAdd = async () => {
    if (!supplierId) return

    const payload = {
      supplier_id: supplierId,
      bank_name: trimOrNull(newBank.bank_name),
      account_number: trimOrNull(newBank.account_number),
      iban: trimOrNull(newBank.iban),
      bic: trimOrNull(newBank.bic),
      currency: trimOrNull(newBank.currency),
      correspondent_account: trimOrNull(newBank.correspondent_account),
      bank_address: trimOrNull(newBank.bank_address),
      additional_info: trimOrNull(newBank.additional_info),
      is_primary_for_currency: newBank.is_primary_for_currency ? 1 : 0,
    }

    if (!payload.bank_name || !payload.account_number) {
      message.warning("Название банка и номер счёта обязательны")
      return
    }

    try {
      const { data: created } = await axios.post(
        "/supplier-bank-details",
        payload
      )
      setData((prev) => [created, ...prev])
      setNewBank({
        bank_name: "",
        account_number: "",
        iban: "",
        bic: "",
        currency: "",
        correspondent_account: "",
        bank_address: "",
        additional_info: "",
        is_primary_for_currency: false,
      })
      message.success("Банковские реквизиты добавлены")
      onChanged?.()
    } catch (e) {
      console.error("Ошибка добавления банковских реквизитов поставщика:", e)
      const msg =
        e?.response?.data?.message || "Не удалось добавить банковские реквизиты"
      message.error(msg)
    }
  }

  const replaceRow = (fresh) =>
    setData((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))

  const removeRow = (id) =>
    setData((prev) => prev.filter((r) => r.id !== id))

  const handleUpdate = async (id, values) => {
    try {
      const { data: fresh } = await axios.put(
        `/supplier-bank-details/${id}`,
        values
      )
      replaceRow(fresh)
      onChanged?.()
    } catch (e) {
      if (e?.response?.status === 409) {
        const current = e.response.data?.currentRecord
        setConflict({
          id,
          current,
          draft: { id, ...values },
        })
        return
      }
      console.error("Ошибка обновления банковских реквизитов:", e)
      message.error("Не удалось обновить банковские реквизиты")
    }
  }

  const handleDelete = async (record) => {
    try {
      await axios.delete(`/supplier-bank-details/${record.id}`, {
        params: { version: record.version },
      })
      removeRow(record.id)
      onChanged?.()
    } catch (e) {
      if (e?.response?.status === 409) {
        const current = e.response.data?.currentRecord
        setConflict({
          id: record.id,
          current,
          draft: record,
        })
        return
      }
      console.error("Ошибка удаления банковских реквизитов:", e)
      message.error("Не удалось удалить банковские реквизиты")
    }
  }

  const filtered = data.filter((r) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      String(r.bank_name || "").toLowerCase().includes(q) ||
      String(r.account_number || "").toLowerCase().includes(q) ||
      String(r.currency || "").toLowerCase().includes(q) ||
      String(r.bic || "").toLowerCase().includes(q) ||
      String(r.iban || "").toLowerCase().includes(q)
    )
  })

  if (!supplierId) {
    return (
      <Card size="small">
        Выберите поставщика, чтобы видеть его банковские реквизиты.
      </Card>
    )
  }

  return (
    <>
      {/* форма добавления реквизитов */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Row gutter={8} style={{ marginBottom: 8 }}>
          <Col span={6}>
            <Input
              size="small"
              placeholder="Банк"
              value={newBank.bank_name}
              onChange={(e) =>
                setNewBank((p) => ({
                  ...p,
                  bank_name: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={6}>
            <Input
              size="small"
              placeholder="Номер счёта"
              value={newBank.account_number}
              onChange={(e) =>
                setNewBank((p) => ({
                  ...p,
                  account_number: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={4}>
            <CurrencySelect
              value={newBank.currency}
              onChange={(v) =>
                setNewBank((p) => ({
                  ...p,
                  currency: v || "",
                }))
              }
              style={{ width: "100%" }}
            />
          </Col>
          <Col span={4}>
            <Input
              size="small"
              placeholder="BIC"
              value={newBank.bic}
              onChange={(e) =>
                setNewBank((p) => ({
                  ...p,
                  bic: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={4}>
            <Checkbox
              checked={newBank.is_primary_for_currency}
              onChange={(e) =>
                setNewBank((p) => ({
                  ...p,
                  is_primary_for_currency: e.target.checked,
                }))
              }
            >
              Основной по валюте
            </Checkbox>
          </Col>
        </Row>

        <Row gutter={8} style={{ marginBottom: 8 }}>
          <Col span={6}>
            <Input
              size="small"
              placeholder="IBAN"
              value={newBank.iban}
              onChange={(e) =>
                setNewBank((p) => ({
                  ...p,
                  iban: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={6}>
            <Input
              size="small"
              placeholder="Корр. счёт"
              value={newBank.correspondent_account}
              onChange={(e) =>
                setNewBank((p) => ({
                  ...p,
                  correspondent_account: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={6}>
            <Input
              size="small"
              placeholder="Адрес банка"
              value={newBank.bank_address}
              onChange={(e) =>
                setNewBank((p) => ({
                  ...p,
                  bank_address: e.target.value,
                }))
              }
            />
          </Col>
          <Col span={6}>
            <Input
              size="small"
              placeholder="Доп. сведения"
              value={newBank.additional_info}
              onChange={(e) =>
                setNewBank((p) => ({
                  ...p,
                  additional_info: e.target.value,
                }))
              }
            />
          </Col>
        </Row>

        <Button
          type="primary"
          size="small"
          onClick={handleAdd}
          disabled={!newBank.bank_name.trim() || !newBank.account_number.trim()}
        >
          Добавить реквизиты
        </Button>
      </Card>

      {/* таблица реквизитов */}
      <Card size="small">
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Поиск по банковским реквизитам поставщика..."
        />
        <SupplierBankDetailsTable
          data={filtered}
          loading={loading}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </Card>

      <VersionConflictModal
        conflict={conflict}
        onCancel={() => setConflict(null)}
        onReload={async () => {
          setConflict(null)
          await fetchData()
        }}
      />
    </>
  )
}
