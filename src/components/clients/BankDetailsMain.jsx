// src/components/clients/BankDetailsMain.jsx
import React, { useEffect, useState } from "react"
import { Row, Col, Input, Button, message } from "antd"
import { Autocomplete, TextField } from "@mui/material"
import axios from "@/api/axiosInstance"
import fetchBankByBic from "@/utils/fetchBankByBic"
import BankDetailsTable from "./BankDetailsTable"
import TableToolbar from "@/components/common/TableToolbar"

const currencyOptions = ["RUB", "USD", "EUR", "CNY"]

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
    currency: "RUB"
  })

  const fetchData = async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const res = await axios.get("/client-bank-details", {
        params: { client_id: clientId }
      })
      setData(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Ошибка загрузки банковских реквизитов:", err)
      message.error("Не удалось загрузить реквизиты")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [clientId])

  const handleBicChange = async (bic) => {
    setNewBank((prev) => ({ ...prev, bic }))
    if (bic.length === 9) {
      try {
        const bank = await fetchBankByBic(bic)
        if (bank?.name) {
          setNewBank((prev) => ({
            ...prev,
            bank_name: bank.name,
            correspondent_account: bank.correspondent_account || ""
          }))
        }
      } catch {
        message.warning("Банк по БИК не найден")
      }
    }
  }

  const handleAdd = async () => {
    if (!newBank.account_number?.trim()) {
      message.warning("Введите расчётный счёт")
      return
    }

    setSubmitting(true)
    try {
      const res = await axios.post("/client-bank-details", {
        ...newBank,
        client_id: clientId
      })
      setData(prev => [res.data, ...prev])
      setNewBank({
        bic: "",
        bank_name: "",
        correspondent_account: "",
        account_number: "",
        currency: "RUB"
      })
      message.success("Реквизиты добавлены")

      if (onChanged) onChanged() // 🔹 сообщаем родителю об изменении
    } catch (err) {
      console.error("Ошибка при добавлении:", err)
      message.error("Не удалось добавить реквизиты")
    } finally {
      setSubmitting(false)
    }
  }

  // 🔹 фильтрация по поиску
  const filteredData = search
    ? data.filter(
        (item) =>
          item.bic?.toLowerCase().includes(search.toLowerCase()) ||
          item.bank_name?.toLowerCase().includes(search.toLowerCase())
      )
    : data

  if (!clientId) return null

  return (
    <>
      <TableToolbar
        placeholder="Поиск по БИК или банку"
        search={search}
        onSearch={setSearch}
      />

      <Row gutter={12} style={{ marginBottom: 8, marginTop: 8 }}>
        <Col span={4}>
          <Input
            placeholder="BIC"
            value={newBank.bic}
            onChange={(e) => handleBicChange(e.target.value)}
          />
        </Col>
        <Col span={5}>
          <Input placeholder="Банк" value={newBank.bank_name} disabled />
        </Col>
        <Col span={5}>
          <Input placeholder="Кор. счёт" value={newBank.correspondent_account} disabled />
        </Col>
        <Col span={3}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <Autocomplete
              disableClearable
              size="small"
              options={currencyOptions}
              value={newBank.currency}
              onChange={(_, val) => setNewBank(prev => ({ ...prev, currency: val }))}
              slotProps={{
                popper: {
                  disablePortal: true
                }
              }}
              renderInput={(params) => (
                <TextField {...params} label="Валюта" variant="standard" />
              )}
              sx={{ minWidth: 100 }}
            />
          </div>
        </Col>
        <Col span={5}>
          <Input
            placeholder="* Расч. счёт"
            value={newBank.account_number}
            onChange={(e) =>
              setNewBank(prev => ({ ...prev, account_number: e.target.value }))
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
        data={filteredData}
        setData={(val) => {
          setData(val)
          if (onChanged) onChanged() // 🔹 любое изменение в таблице → сигнал родителю
        }}
        loading={loading}
      />
    </>
  )
}
