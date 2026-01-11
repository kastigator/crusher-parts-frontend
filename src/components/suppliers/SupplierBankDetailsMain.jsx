import React, { useEffect, useState } from "react"
import { Card, Button, Input, Row, Col, Checkbox, message } from "antd"
import axios from "@/api/axiosInstance"

import SupplierBankDetailsTable from "./SupplierBankDetailsTable"
import VersionConflictModal from "@/components/common/VersionConflictModal"
import CurrencySelect from "@/components/inputs/CurrencySelect"
import { isSameByFields } from "@/utils/versionConflict"

const trimOrNull = (v) => {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

export default function SupplierBankDetailsMain({ supplierId, onChanged }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
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
      console.error("Ошибка при загрузке банковских реквизитов поставщика:", e)
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
      message.warning("Название банка и счет обязательны")
      return
    }

    try {
      const { data: created } = await axios.post(
        "/supplier-bank-details",
        payload,
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
      console.error(
        "Ошибка при создании банковских реквизитов поставщика:",
        e,
      )
      const msg =
        e?.response?.data?.message ||
        "Не удалось создать банковские реквизиты"
      message.error(msg)
    }
  }

  const replaceRow = (fresh) =>
    setData((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)))

  const removeRow = (id) =>
    setData((prev) => prev.filter((r) => r.id !== id))

  const handleUpdate = async (id, values) => {
    const payload = { ...values, version: values?.version }
    try {
      const { data: fresh } = await axios.put(
        `/supplier-bank-details/${id}`,
        payload,
      )
      replaceRow(fresh)
      onChanged?.()
    } catch (e) {
      if (e?.response?.status === 409) {
        const current =
          e.response.data?.current ||
          e.response.data?.currentRecord ||
          e.currentRecord
        if (
          current &&
          isSameByFields(current, payload, [
            "bank_name",
            "account_number",
            "iban",
            "bic",
            "currency",
            "correspondent_account",
            "bank_address",
            "additional_info",
            "is_primary_for_currency",
          ])
        ) {
          replaceRow(current)
          onChanged?.()
          message.success("Банковские реквизиты обновлены")
          return
        }
        setConflict({
          id,
          current,
          draft: { id, ...payload },
        })
        return
      }
      console.error("Ошибка при обновлении банковских реквизитов:", e)
      message.error("Не удалось обновить банковские реквизиты")
    }
  }

  const handleDelete = async (record) => {
    try {
      await axios.delete(`/supplier-bank-details/${record.id}`, {
        params: { version: record.version },
      })
      removeRow(record.id)
      message.success("Банковские реквизиты удалены")
      onChanged?.()
    } catch (e) {
      if (e?.response?.status === 409) {
        const current =
          e.response.data?.current ||
          e.response.data?.currentRecord ||
          e.currentRecord
        setConflict({
          id: record.id,
          current,
          draft: record,
        })
        return
      }
      console.error("Ошибка при удалении банковских реквизитов:", e)
      message.error("Не удалось удалить банковские реквизиты")
    }
  }

  if (!supplierId) {
    return (
      <Card size="small">
        Выберите поставщика, чтобы добавить банковские реквизиты.
      </Card>
    )
  }

  return (
    <div className="parts-table-wrap">
      {/* Форма ввода реквизитов */}
      <Card size="small" className="table-section">
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
              placeholder="Счет"
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

        <Row gutter={8}>
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
              placeholder="Корр. счет"
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
          style={{ marginTop: 8 }}
          onClick={handleAdd}
          disabled={!newBank.bank_name.trim() || !newBank.account_number.trim()}
        >
          Добавить реквизиты
        </Button>
      </Card>

      {/* Таблица реквизитов */}
      <SupplierBankDetailsTable
        data={data}
        loading={loading}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      <VersionConflictModal
        conflict={conflict}
        entityLabel="банковские реквизиты"
        fields={[
          { key: "bank_name", title: "Банк" },
          { key: "account_number", title: "Расч. счёт" },
          { key: "currency", title: "Валюта" },
          { key: "bic", title: "BIC" },
          { key: "correspondent_account", title: "Корр. счёт" },
          { key: "additional_info", title: "Доп. сведения" },
        ]}
        onCancel={() => setConflict(null)}
        onReload={async () => {
          setConflict(null)
          await fetchData()
        }}
      />
    </div>
  )
}
