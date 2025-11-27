// src/components/clients/BankDetailsMain.jsx

import React, { useEffect, useState } from "react"
import { Card, Row, Col, Input, Button, message } from "antd"
import axios from "@/api/axiosInstance"
import CurrencySelect from "@/components/inputs/CurrencySelect"
import BankDetailsTable from "./BankDetailsTable"
import fetchBankByBic from "@/utils/fetchBankByBic"

const initialBankState = {
  bank_name: "",
  bic: "",
  correspondent_account: "",
  account_number: "",
  currency: "RUB",
}

export default function BankDetailsMain({ clientId, onChanged }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  const [newBank, setNewBank] = useState(initialBankState)
  const [adding, setAdding] = useState(false)

  // -------------------------------------------------------
  // Загрузка списка
  // -------------------------------------------------------
  const fetchData = async () => {
    if (!clientId) {
      setData([])
      return
    }

    setLoading(true)
    try {
      const res = await axios.get("/client-bank-details", {
        params: { client_id: clientId },
      })
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      console.error("Ошибка при загрузке банковских реквизитов:", e)
      message.error("Не удалось загрузить банковские реквизиты клиента")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // сбрасываем форму при смене клиента
    setNewBank(initialBankState)
  }, [clientId])

  // -------------------------------------------------------
  // Форма добавления
  // -------------------------------------------------------
  const handleNewChange = (field, value) => {
    setNewBank((prev) => ({ ...prev, [field]: value }))
  }

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
      const res = await axios.post("/client-bank-details", {
        client_id: clientId,
        bank_name: name,
        bic: newBank.bic?.trim() || null,
        correspondent_account: newBank.correspondent_account?.trim() || null,
        account_number: acc,
        currency: newBank.currency || "RUB",
      })

      const record = res.data
      setData((prev) => [...prev, record])
      setNewBank(initialBankState)
      onChanged?.()
      message.success("Банковские реквизиты добавлены")
    } catch (e) {
      console.error("Ошибка при добавлении банковских реквизитов:", e)
      message.error("Не удалось добавить реквизиты")
    } finally {
      setAdding(false)
    }
  }

  // Автоподстановка по БИК
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
      // без сообщения — это вспомогательная функция
    }
  }

  // -------------------------------------------------------
  // Обновление / удаление из таблицы
  // -------------------------------------------------------
  const handleUpdate = async (id, patch) => {
    if (!patch || patch.version === undefined) {
      throw new Error("Missing version for bank details update")
    }

    try {
      const res = await axios.put(`/client-bank-details/${id}`, patch)
      const updated = res.data

      setData((prev) =>
        prev.map((row) => (row.id === id ? updated : row))
      )
      onChanged?.()
      return updated
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.type === "version_conflict") {
        const err = new Error("version_conflict")
        err.isVersionConflict = true
        err.currentRecord = e.response.data.current || null
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
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.type === "version_conflict") {
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
    setData((prev) =>
      prev.map((r) => (r.id === row.id ? row : r))
    )
  }

  // -------------------------------------------------------
  // Рендер
  // -------------------------------------------------------
  if (!clientId) {
    return (
      <Card size="small" className="parts-table-wrap">
        Выберите клиента, чтобы работать с банковскими реквизитами.
      </Card>
    )
  }

  const addDisabled =
    !newBank.bank_name?.trim() || !newBank.account_number?.trim()

  return (
    <Card size="small" className="parts-table-wrap">
      {/* Форма добавления реквизитов */}
      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col xs={24} sm={6}>
          <Input
            placeholder="БИК"
            value={newBank.bic}
            onChange={(e) => handleNewChange("bic", e.target.value)}
            onBlur={handleBicBlur}
          />
        </Col>

        <Col xs={24} sm={6}>
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
            size="middle"
          />
        </Col>

        <Col xs={24} sm={6}>
          <Row gutter={8}>
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
        </Col>
      </Row>

      {/* Таблица реквизитов */}
      <BankDetailsTable
        data={data}
        loading={loading}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onReplaceRow={handleReplaceRow}
        onRefresh={fetchData}
      />
    </Card>
  )
}
