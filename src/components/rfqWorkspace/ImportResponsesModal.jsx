import React, { useMemo, useRef } from "react"
import { Button, Checkbox, Input, Modal, Select, Space, Typography, message } from "antd"
import { UploadOutlined } from "@ant-design/icons"
import * as XLSX from "xlsx"
import axios from "@/api/axiosInstance"
import { parseImportRow, parseImportTextRows } from "@/components/rfqWorkspace/rfqWorkspaceUtils"

const { Text } = Typography

const getEmptyImportModalState = () => ({
  open: false,
  supplierId: null,
  detectedSupplierId: null,
  detectedSupplierName: "",
  text: "",
  rows: [],
  loading: false,
  fileName: "",
  newRevision: false,
})

const normalizeSupplierName = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[()'".,;:_\-–—/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const extractSupplierNameFromSheet = (sheetRows) => {
  const rows = Array.isArray(sheetRows) ? sheetRows : []
  const maxRows = Math.min(rows.length, 25)
  for (let i = 0; i < maxRows; i += 1) {
    const row = Array.isArray(rows[i]) ? rows[i] : []
    for (let j = 0; j < Math.min(row.length, 6); j += 1) {
      const cell = String(row[j] || "").trim()
      if (!cell) continue
      const normalizedCell = cell.toLowerCase()
      if (normalizedCell === "поставщик" || normalizedCell.startsWith("поставщик:")) {
        const inline = cell.split(":").slice(1).join(":").trim()
        if (inline) return inline
        const adjacent = String(row[j + 1] || "").trim()
        if (adjacent) return adjacent
      }
    }
  }
  return ""
}

export default function ImportResponsesModal({
  importModal,
  setImportModal,
  activeRfqId,
  suppliers = [],
  onImported,
}) {
  const inputRef = useRef(null)
  const supplierOptions = useMemo(
    () =>
      (Array.isArray(suppliers) ? suppliers : [])
        .map((row) => ({
          value: Number(row?.supplier_id),
          label: String(row?.supplier_name || row?.name || "").trim(),
        }))
        .filter((opt) => Number.isFinite(opt.value) && opt.value > 0 && opt.label),
    [suppliers]
  )
  const supplierLabelById = useMemo(() => {
    const map = new Map()
    supplierOptions.forEach((opt) => map.set(Number(opt.value), opt.label))
    return map
  }, [supplierOptions])

  return (
    <Modal
      open={importModal.open}
      title="Импорт ответов поставщика (Excel/TSV)"
      onCancel={() => setImportModal(getEmptyImportModalState())}
      footer={[
        <Button
          key="cancel"
          onClick={() => setImportModal(getEmptyImportModalState())}
        >
          Отмена
        </Button>,
        <Button
          key="import"
          type="primary"
          loading={importModal.loading}
          onClick={async () => {
            if (!activeRfqId) return
            const effectiveSupplierId = Number(
              importModal.supplierId || importModal.detectedSupplierId || 0
            )
            if (!Number.isFinite(effectiveSupplierId) || effectiveSupplierId <= 0) {
              message.warning("Выберите поставщика в окне импорта или загрузите шаблон Excel RFQ")
              return
            }
            const rows =
              Array.isArray(importModal.rows) && importModal.rows.length
                ? importModal.rows
                : parseImportTextRows(importModal.text)

            if (!rows.length) {
              message.warning("Не удалось распарсить данные. Формат: <строка> <tab> <цена> <tab> <валюта> [<tab> срок]")
              return
            }

            setImportModal((prev) => ({ ...prev, loading: true }))
            try {
              await axios.post(`/rfqs/${activeRfqId}/responses/import`, {
                supplier_id: effectiveSupplierId,
                rows,
                new_revision: importModal.newRevision === true,
              })
              message.success("Ответы импортированы")
              await onImported?.(activeRfqId)
              setImportModal(getEmptyImportModalState())
            } catch (err) {
              console.error(err)
              message.error("Импорт не удался")
              setImportModal((prev) => ({ ...prev, loading: false }))
            }
          }}
        >
          Импортировать
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Text type="secondary">
          Можно загрузить заполненный поставщиком RFQ Excel (тот, что система сгенерировала), либо вставить TSV вручную.
          Обязательные поля для строки: «Строка», «Цена», «Валюта». Остальные колонки (тип, срок, MOQ, упаковка, PN, вес/габариты, тяжелая/негабарит) импортируются как дополнительные.
          TSV можно вставлять как без шапки, так и с шапкой колонок.
        </Text>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Поставщик для импорта"
          options={supplierOptions}
          value={importModal.supplierId || undefined}
          onChange={(value) =>
            setImportModal((prev) => ({
              ...prev,
              supplierId: value || null,
            }))
          }
        />
        {importModal.detectedSupplierName ? (
          <Text type="secondary">
            Из файла определён поставщик:{" "}
            <b>
              {importModal.detectedSupplierName}
              {importModal.detectedSupplierId
                ? ` (${supplierLabelById.get(Number(importModal.detectedSupplierId)) || "в RFQ найден"})`
                : " (не найден среди поставщиков RFQ)"}
            </b>
          </Text>
        ) : null}
        <Checkbox
          checked={importModal.newRevision || false}
          onChange={(e) => setImportModal((prev) => ({ ...prev, newRevision: e.target.checked }))}
        >
          Создать новую ревизию ответа
        </Checkbox>
        <Input.TextArea
          rows={8}
          value={importModal.text}
          onChange={(e) =>
            setImportModal((prev) => ({ ...prev, text: e.target.value, rows: [] }))
          }
          placeholder={
            "Строка\tЦена\tВалюта\tСрок\tКомментарий\n1\t100\tEUR\t10\tпо телефону\n2\t50\tUSD\t7"
          }
        />
        <Button
          icon={<UploadOutlined />}
          onClick={() => inputRef.current?.click()}
        >
          Загрузить из Excel
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              const data = await file.arrayBuffer()
              const wb = XLSX.read(data, { type: "array" })
              const ws = wb.Sheets[wb.SheetNames[0]]
              const json = XLSX.utils.sheet_to_json(ws, { header: 1 })
              const detectedSupplierName = extractSupplierNameFromSheet(json)
              const normalizedDetected = normalizeSupplierName(detectedSupplierName)
              const detectedOption =
                normalizedDetected &&
                supplierOptions.find((opt) => {
                  const normalizedOption = normalizeSupplierName(opt.label)
                  return (
                    normalizedOption === normalizedDetected ||
                    normalizedOption.includes(normalizedDetected) ||
                    normalizedDetected.includes(normalizedOption)
                  )
                })
              const rowsParsed = json
                .map((r) => parseImportRow(r))
                .filter((r) => r && Number.isFinite(r.line_number) && Number.isFinite(r.price) && r.currency)
              if (!rowsParsed.length) {
                message.warning("Не удалось распарсить файл: убедитесь, что заполнены колонки Строка/Цена/Валюта")
                return
              }
              const text = rowsParsed
                .map(
                  (r) =>
                    `${r.line_number}\t${r.price}\t${r.currency}\t${r.lead_time_days || ""}\t${r.note || ""}`
                )
                .join("\n")
              setImportModal((prev) => ({
                ...prev,
                supplierId:
                  prev.supplierId ||
                  (detectedOption?.value ? Number(detectedOption.value) : null),
                detectedSupplierId: detectedOption?.value ? Number(detectedOption.value) : null,
                detectedSupplierName,
                text,
                rows: rowsParsed,
                fileName: file.name,
              }))
              if (detectedSupplierName && !detectedOption) {
                message.warning(
                  `Поставщик из файла: «${detectedSupplierName}». Выберите поставщика вручную в списке.`
                )
              }
              message.success("Файл прочитан, данные подставлены")
            } catch (err) {
              console.error(err)
              message.error("Не удалось прочитать файл")
            } finally {
              e.target.value = ""
            }
          }}
        />
        {importModal.fileName ? (
          <Text type="secondary">Файл: {importModal.fileName}</Text>
        ) : null}
      </Space>
    </Modal>
  )
}
