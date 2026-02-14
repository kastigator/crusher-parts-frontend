// src/components/clients/BankDetailsMain.jsx
import React, { useCallback, useEffect, useState } from "react"
import { Card, Row, Col, Input, Button, message } from "antd"
import axios from "@/api/axiosInstance"
import CurrencySelect from "@/components/inputs/CurrencySelect"
import BankDetailsTable from "./BankDetailsTable"
import fetchBankByBic from "@/utils/fetchBankByBic"
import { isSameByFields } from "@/utils/versionConflict"

const INITIAL_BANK = {
  bank_name: "",
  bic: "",
  correspondent_account: "",
  account_number: "",
  currency: "RUB",
}

export default function BankDetailsMain({ clientId, onChanged }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [newBank, setNewBank] = useState(INITIAL_BANK)
  const [adding, setAdding] = useState(false)

  // ==========================
  // Load
  // ==========================
  const fetchData = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const { data: list } = await axios.get("/client-bank-details", {
        params: { client_id: clientId },
      })
      setData(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error("Ошибка при загрузке банковских реквизитов:", e)
      message.error("Не удалось загрузить банковские реквизиты клиента")
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    if (clientId) {
      fetchData()
    } else {
      setData([])
    }
    setNewBank(INITIAL_BANK)
  }, [clientId, fetchData])

  // ==========================
  // Helpers
  // ==========================
  const handleNewChange = (field, value) => {
    setNewBank((prev) => ({ ...prev, [field]: value }))
  }

  // автоподстановка по БИК
  const handleBicBlur = async () => {
    const bic = newBank.bic?.trim()
    if (!bic) return

    try {
      const info = await fetchBankByBic(bic)
      if (info) {
        setNewBank((prev) => ({
          ...prev,
          bank_name: prev.bank_name || info.bank_name || "",
          correspondent_account:
            prev.correspondent_account || info.correspondent_account || "",
        }))
      }
    } catch (e) {
      console.error("Ошибка автоподстановки по БИК:", e)
      // без message — это вспомогательная функция
    }
  }

  // ==========================
  // Add
  // ==========================
  const handleAdd = async () => {
    if (!clientId) {
      message.warning("Сначала выберите клиента")
      return
    }

    const name = newBank.bank_name?.trim()
    const acc = newBank.account_number?.trim()

    if (!name || !acc) {
      message.warning("Заполните название банка и расчётный счёт")
      return
    }

    setAdding(true)
    try {
      const { data: created } = await axios.post("/client-bank-details", {
        client_id: clientId,
        bank_name: name,
        bic: newBank.bic?.trim() || null,
        correspondent_account: newBank.correspondent_account?.trim() || null,
        account_number: acc,
        currency: newBank.currency || "RUB",
      })
      setData((prev) => [created, ...prev])
      setNewBank(INITIAL_BANK)
      onChanged?.()
      message.success("Банковские реквизиты добавлены")
    } catch (e) {
      console.error("Ошибка при добавлении банковских реквизитов:", e)
      message.error("Не удалось добавить реквизиты")
    } finally {
      setAdding(false)
    }
  }

  // ==========================
  // Update / Delete (для таблицы)
  // ==========================
  const handleUpdate = async (id, patch) => {
    if (!patch || patch.version === undefined) {
      throw new Error("Missing version for bank details update")
    }

    try {
      const { data: updated } = await axios.put(
        `/client-bank-details/${id}`,
        patch,
      )
      setData((prev) => prev.map((row) => (row.id === id ? updated : row)))
      onChanged?.()
      return updated
    } catch (e) {
      if (
        e.response?.status === 409 &&
        e.response?.data?.type === "version_conflict"
      ) {
        const current = e.response.data.current || e.currentRecord || null
        if (
          current &&
          isSameByFields(current, patch, [
            "bank_name",
            "bic",
            "correspondent_account",
            "account_number",
            "currency",
          ])
        ) {
          setData((prev) => prev.map((row) => (row.id === id ? current : row)))
          onChanged?.()
          return current
        }
        const err = new Error("version_conflict")
        err.isVersionConflict = true
        err.currentRecord = current
        throw err
      }
      console.error("Ошибка при обновлении реквизитов:", e)
      throw e
    }
  }

  const handleDelete = async (record) => {
    const { id, version } = record || {}
    if (!id) return

    try {
      await axios.delete(`/client-bank-details/${id}`, {
        params: { version },
      })
      setData((prev) => prev.filter((row) => row.id !== id))
      onChanged?.()
      message.success("Банковские реквизиты удалены")
    } catch (e) {
      if (
        e.response?.status === 409 &&
        e.response?.data?.type === "version_conflict"
      ) {
        const err = new Error("version_conflict")
        err.isVersionConflict = true
        err.currentRecord = e.response.data.current || null
        throw err
      }
      console.error("Ошибка при удалении реквизитов:", e)
      throw e
    }
  }

  const handleReplaceRow = (row) => {
    if (!row?.id) return
    setData((prev) => prev.map((r) => (r.id === row.id ? row : r)))
  }

  // ==========================
  // Render
  // ==========================
  if (!clientId) return null

  const addDisabled =
    !newBank.bank_name?.trim() || !newBank.account_number?.trim()

  return (
    <div className="parts-table-wrap">
      {/* Форма добавления — аналогично адресам */}
      <Card size="small" className="table-section">
        {/* верхний ряд */}
        <Row gutter={12} className="table-section">
          <Col xs={24} sm={6}>
            <Input
              placeholder="БИК"
              value={newBank.bic}
              onChange={(e) => handleNewChange("bic", e.target.value)}
              onBlur={handleBicBlur}
            />
          </Col>

          <Col xs={24} sm={8}>
            <Input
              placeholder="Банк"
              value={newBank.bank_name}
              onChange={(e) => handleNewChange("bank_name", e.target.value)}
            />
          </Col>

          <Col xs={24} sm={6}>
            <Input
              placeholder="Корр. счёт"
              value={newBank.correspondent_account}
              onChange={(e) =>
                handleNewChange("correspondent_account", e.target.value)
              }
            />
          </Col>

          <Col xs={24} sm={4}>
            <CurrencySelect
              value={newBank.currency}
              onChange={(val) => handleNewChange("currency", val)}
              style={{ width: "100%" }}
              getPopupContainer={(trigger) =>
                trigger?.closest(".parts-table-wrap") || document.body
              }
            />
          </Col>
        </Row>

        {/* нижний ряд: расчётный счёт + кнопка */}
        <Row gutter={12} className="table-section">
          <Col flex="auto">
            <Input
              placeholder="* Расч. счёт"
              value={newBank.account_number}
              onChange={(e) =>
                handleNewChange("account_number", e.target.value)
              }
            />
          </Col>
          <Col>
            <Button
              type="primary"
              onClick={handleAdd}
              loading={adding}
              disabled={addDisabled}
            >
              Добавить
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Таблица реквизитов — как у адресов */}
      <BankDetailsTable
        data={data}
        loading={loading}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onReplaceRow={handleReplaceRow}
        onRefresh={fetchData}
      />
    </div>
  )
}
