// /src/components/originalParts/bundle/BundleTab.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Button, Collapse, Empty, Input, message, Space, Tag, Tooltip, Typography } from "antd"
import { StarFilled } from "@ant-design/icons"
import axios from "@/api/axiosInstance"
import SupplierPartPickerDrawer from "./SupplierPartPickerDrawer"
import ActionButtons from "@/components/common/ActionButtons"
import BomQuantityInput from "@/components/originalParts/BomQuantityInput"
import { runTrashDeleteFlow } from "@/utils/trashUi"

const { Text } = Typography

export default function BundleTab({ originalPartId, originalPart }) {
  const [bundleId, setBundleId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [bundleTitle, setBundleTitle] = useState("")
  const [bundleNote, setBundleNote] = useState("")
  const [bundleOriginal, setBundleOriginal] = useState({ title: "", note: "" })
  const [bundleSaving, setBundleSaving] = useState(false)

  const [items, setItems] = useState([])
  const [options, setOptions] = useState([])
  const [totals, setTotals] = useState([])

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerItem, setPickerItem] = useState(null)
  const [qNewRole, setQNewRole] = useState("")
  const [defaultBusy, setDefaultBusy] = useState(false)
  const [activeRoleKey, setActiveRoleKey] = useState(null)

  // --------------------- загрузка / создание комплекта ---------------------
  const ensureBundle = useCallback(async () => {
    if (!originalPartId) return
    try {
      setLoading(true)
      const { data } = await axios.get("/supplier-bundles", { params: { original_part_id: originalPartId } })
      if (Array.isArray(data) && data.length) {
        const bundle = data[0]
        setBundleId(bundle.id)
        const nextTitle = bundle.title || ""
        const nextNote = bundle.note || ""
        setBundleTitle(nextTitle)
        setBundleNote(nextNote)
        setBundleOriginal({ title: nextTitle, note: nextNote })
      } else {
        setBundleId(null)
        setBundleTitle("")
        setBundleNote("")
        setBundleOriginal({ title: "", note: "" })
      }
    } catch (e) {
      console.error(e)
      message.error("Не удалось получить комплект")
    } finally {
      setLoading(false)
    }
  }, [originalPartId])

  const createBundle = async () => {
    if (!originalPartId) return
    try {
      setLoading(true)
      const { data: created } = await axios.post("/supplier-bundles", {
        original_part_id: originalPartId,
        title: "",
        note: ""
      })
      const nextTitle = created?.title || ""
      const nextNote = created?.note || ""
      setBundleId(created.id)
      setBundleTitle(nextTitle)
      setBundleNote(nextNote)
      setBundleOriginal({ title: nextTitle, note: nextNote })
      message.success("Создан новый комплект для этой детали")
      await loadData()
    } catch (e) {
      console.error(e)
      message.error("Не удалось создать комплект")
    } finally {
      setLoading(false)
    }
  }

  const saveBundleMeta = async () => {
    if (!bundleId) return
    const title = bundleTitle.trim()
    const note = bundleNote.trim()
    if (title === bundleOriginal.title && note === bundleOriginal.note) return
    try {
      setBundleSaving(true)
      await axios.put(`/supplier-bundles/${bundleId}`, { title, note })
      setBundleTitle(title)
      setBundleNote(note)
      setBundleOriginal({ title, note })
      message.success("Комплект обновлён")
    } catch (e) {
      console.error(e)
      message.error("Не удалось обновить комплект")
    } finally {
      setBundleSaving(false)
    }
  }

  const resetBundleMeta = () => {
    setBundleTitle(bundleOriginal.title || "")
    setBundleNote(bundleOriginal.note || "")
  }

  const deleteBundle = async () => {
    if (!bundleId) return

    try {
      setLoading(true)
      const result = await runTrashDeleteFlow({
        entityType: "supplier_bundles",
        entityId: bundleId,
        deleteUrl: `/supplier-bundles/${bundleId}`,
        successMessage: "Комплект перемещён в корзину",
      })
      if (!result?.deleted) return

      // 🔁 уведомим вкладку "Поставщики" (связи могли измениться)
      window.dispatchEvent(
        new CustomEvent("supplier-links:refresh", { detail: { original_part_id: originalPartId } }),
      )

      // Перезагрузим состояние для текущей детали
      setBundleId(null)
      setBundleTitle("")
      setBundleNote("")
      setBundleOriginal({ title: "", note: "" })
      setItems([])
      setOptions([])
      setTotals([])
      await ensureBundle()
    } catch (e) {
      console.error(e)
      if (e?.response?.status === 409) {
        message.error(e?.response?.data?.message || "Нельзя удалить: комплект уже используется")
        return
      }
      message.error(e?.response?.data?.message || "Не удалось удалить комплект")
    } finally {
      setLoading(false)
    }
  }

  // --------------------- загрузка содержимого ---------------------
  const loadData = useCallback(async () => {
    if (!bundleId) return
    try {
      setLoading(true)
      const [itRes, optRes, totRes] = await Promise.all([
        axios.get(`/supplier-bundles/${bundleId}/items`),
        axios.get(`/supplier-bundles/${bundleId}/options`),
        axios.get(`/supplier-bundles/${bundleId}/totals`)
      ])
      setItems(Array.isArray(itRes.data) ? itRes.data : [])
      setOptions(Array.isArray(optRes.data) ? optRes.data : [])
      setTotals(Array.isArray(totRes.data) ? totRes.data : [])
    } catch (e) {
      console.error(e)
      message.error("Не удалось загрузить комплект")
    } finally {
      setLoading(false)
    }
  }, [bundleId])

  useEffect(() => {
    setBundleId(null)
    setBundleTitle("")
    setBundleNote("")
    setBundleOriginal({ title: "", note: "" })
    setItems([])
    setOptions([])
    setTotals([])
  }, [originalPartId])
  useEffect(() => { if (originalPartId) ensureBundle() }, [originalPartId, ensureBundle])
  useEffect(() => { if (bundleId) loadData() }, [bundleId, loadData])

  // --------------------- роли ---------------------
  const addRole = async () => {
    const label = qNewRole.trim()
    if (!label) return
    try {
      await axios.post("/supplier-bundles/items", { bundle_id: bundleId, role_label: label, qty: 1 })
      setQNewRole("")
      await loadData()
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить роль")
    }
  }

  const updateItemQty = async (itemId, qty) => {
    const qtyNum = Number(qty)
    if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
      message.warning("Количество должно быть целым числом > 0")
      return
    }
    try {
      await axios.put(`/supplier-bundles/items/${itemId}`, { qty: qtyNum })
      await loadData()
    } catch (e) {
      console.error(e)
      message.error("Не удалось изменить количество")
    }
  }

  const deleteItem = async (itemId) => {
    try {
      const result = await runTrashDeleteFlow({
        entityType: "supplier_bundle_items",
        entityId: itemId,
        deleteUrl: `/supplier-bundles/items/${itemId}`,
        successMessage: "Роль комплекта удалена",
      })
      if (!result?.deleted) return
      await loadData()
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить роль")
    }
  }

  // --------------------- варианты ---------------------
  const openPicker = (item) => { setPickerItem(item); setPickerOpen(true) }

  const handlePickParts = async (pickedRows) => {
    if (!pickerItem || !pickedRows?.length) return
    try {
      const hasDefault = options.some(o => o.item_id === pickerItem.id && o.is_default)
      for (let idx = 0; idx < pickedRows.length; idx++) {
        const r = pickedRows[idx]
        await axios.post("/supplier-bundles/links", {
          item_id: pickerItem.id,
          supplier_part_id: r.id,
          is_default: (!hasDefault && idx === 0) ? 1 : 0
        })
      }
      message.success("Варианты добавлены")

      // 🔁 уведомим вкладку "Поставщики" об изменении
      window.dispatchEvent(new CustomEvent("supplier-links:refresh", { detail: { original_part_id: originalPartId } }))

      await loadData()
    } catch (e) {
      console.error(e)
      message.error("Не удалось добавить варианты")
    } finally {
      setPickerItem(null)
    }
  }

  /** Сделать вариант дефолтным */
  const setDefault = async (linkId) => {
    try {
      setDefaultBusy(true)

      const current = options.find(o => o.link_id === linkId)
      const currentItemId = current?.item_id

      const res = await axios.put(`/supplier-bundles/links/${linkId}`, { is_default: 1 })
      const payload = res?.data

      if (payload?.item_id && Array.isArray(payload?.options)) {
        const itemIdFromServer = payload.item_id
        const fresh = payload.options
          .map(r => ({
            bundle_id: r.bundle_id,
            item_id: r.item_id,
            role_label: r.role_label,
            qty: Number(r.qty || 1),
            link_id: r.link_id,
            supplier_id: r.supplier_id,
            supplier_name: r.supplier_name,
            supplier_part_id: r.supplier_part_id,
            supplier_part_number: r.supplier_part_number,
            description: r.supplier_part_description,
            is_default: !!r.is_default,
            last_price: options.find(o => o.link_id === r.link_id)?.last_price ?? null,
            last_currency: options.find(o => o.link_id === r.link_id)?.last_currency ?? null,
            last_price_date: options.find(o => o.link_id === r.link_id)?.last_price_date ?? null,
            note: r.note || null,
          }))
          .sort((a, b) => (a.link_id ?? 0) - (b.link_id ?? 0))

        setOptions(prev =>
          prev
            .filter(o => o.item_id !== itemIdFromServer)
            .concat(fresh)
        )
      } else if (currentItemId) {
        setOptions(prev =>
          prev.map(o =>
            o.item_id === currentItemId
              ? { ...o, is_default: o.link_id === linkId }
              : o
          )
        )
      }

      message.success("Вариант установлен по умолчанию")

      // 🔁 уведомим вкладку "Поставщики"
      window.dispatchEvent(new CustomEvent("supplier-links:refresh", { detail: { original_part_id: originalPartId } }))

      await loadData()
    } catch (e) {
      console.error("setDefault error:", e)
      const msg = e?.response?.data?.message || "Не удалось установить вариант по умолчанию"
      message.error(msg)
    } finally {
      setDefaultBusy(false)
    }
  }

  const deleteLink = async (linkId) => {
    try {
      const result = await runTrashDeleteFlow({
        entityType: "supplier_bundle_item_links",
        entityId: linkId,
        deleteUrl: `/supplier-bundles/links/${linkId}`,
        successMessage: "Вариант удалён",
      })
      if (!result?.deleted) return

      // 🔁 уведомим вкладку "Поставщики"
      window.dispatchEvent(new CustomEvent("supplier-links:refresh", { detail: { original_part_id: originalPartId } }))

      await loadData()
    } catch (e) {
      console.error(e)
      message.error("Не удалось удалить вариант")
    }
  }

  // --------------------- таблица вариантов ---------------------
  const optionsByItem = useMemo(() => {
    const m = new Map()
    for (const o of options) {
      if (!m.has(o.item_id)) m.set(o.item_id, [])
      m.get(o.item_id).push(o)
    }
    for (const [key, arr] of m.entries()) {
      m.set(
        key,
        [...arr].sort((a, b) => (a.link_id ?? 0) - (b.link_id ?? 0))
      )
    }
    return m
  }, [options])

  const renderOptions = (item) => {
    const data = optionsByItem.get(item.id) || []
    if (!data.length) {
      return (
        <div style={{ paddingTop: 8, paddingBottom: 8 }}>
          <Empty description="Нет вариантов для этой роли" />
        </div>
      )
    }

    const headerCellStyle = {
      fontWeight: 500,
      fontSize: 12,
      color: "#374151",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }

    const cellBaseStyle = {
      fontSize: 13,
      color: "#1f2937",
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
    }

    const colSupplier = { flex: "0 0 190px" }
    const colNumber = { flex: "0 0 160px" }
    const colDesc = { flex: "1 1 auto" }
    const colPrice = { flex: "0 0 140px", textAlign: "right" }
    const colDate = { flex: "0 0 110px" }
    const colDef = { flex: "0 0 120px" }
    const colActions = { flex: "0 0 110px", display: "flex", justifyContent: "flex-end", gap: 6 }

    return (
      <div style={{ paddingTop: 8, paddingBottom: 8 }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          {/* header */}
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: "8px 12px",
              background: "#f3f4f6",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div style={{ ...colSupplier, ...headerCellStyle }}>Поставщик</div>
            <div style={{ ...colNumber, ...headerCellStyle }}>№ у поставщика</div>
            <div style={{ ...colDesc, ...headerCellStyle }}>Описание</div>
            <div style={{ ...colPrice, ...headerCellStyle }}>Цена</div>
            <div style={{ ...colDate, ...headerCellStyle }}>Дата</div>
            <div style={{ ...colDef, ...headerCellStyle }}>По умолчанию</div>
            <div style={{ ...colActions, ...headerCellStyle }}>Действия</div>
          </div>

          {/* rows */}
          {data.map((r, idx) => {
            const supplierName = r.supplier_name || r.name || "—"
            const partNumber = r.supplier_part_number || "—"
            const desc = r.description ?? r.supplier_part_description ?? "—"
            const price =
              r.last_price != null
                ? `${Number(r.last_price).toFixed(2)} ${r.last_currency || ""}`.trim()
                : "—"
            const date = r.last_price_date ? new Date(r.last_price_date).toLocaleDateString() : "—"

            return (
              <div
                key={r.link_id}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "8px 12px",
                  background: idx % 2 === 0 ? "#ffffff" : "#fafafa",
                  borderTop: idx === 0 ? "none" : "1px solid #f0f0f0",
                  alignItems: "center",
                }}
              >
                <div style={{ ...colSupplier, ...cellBaseStyle }}>
                  <Text ellipsis={{ tooltip: supplierName }} style={{ width: "100%" }}>
                    {supplierName}
                  </Text>
                </div>

                <div style={{ ...colNumber, ...cellBaseStyle }}>
                  <Text ellipsis={{ tooltip: partNumber }} style={{ width: "100%" }}>
                    {partNumber}
                  </Text>
                </div>

                <div style={{ ...colDesc, ...cellBaseStyle }}>
                  <Text ellipsis={{ tooltip: desc }} style={{ width: "100%" }}>
                    {desc}
                  </Text>
                </div>

                <div style={{ ...colPrice, ...cellBaseStyle }}>
                  <Text style={{ width: "100%", display: "block" }}>{price}</Text>
                </div>

                <div style={{ ...colDate, ...cellBaseStyle }}>
                  <Text style={{ width: "100%", display: "block" }}>{date}</Text>
                </div>

                <div style={{ ...colDef, ...cellBaseStyle }}>
                  {r.is_default ? <Tag color="green">да</Tag> : <Tag>нет</Tag>}
                </div>

                <div style={colActions}>
                  <Tooltip title="Сделать по умолчанию">
                    <Button
                      size="small"
                      type="text"
                      icon={<StarFilled style={{ color: r.is_default ? "#52c41a" : undefined }} />}
                      disabled={!!r.is_default || defaultBusy}
                      onClick={() => setDefault(r.link_id)}
                      loading={defaultBusy}
                    />
                  </Tooltip>
                  <ActionButtons
                    size="small"
                    onDelete={() => deleteLink(r.link_id)}
                    titles={{ delete: "Удалить" }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (!originalPartId) {
    return <Empty description="Сначала выберите оригинальную деталь" />
  }

  const partLabel = originalPart
    ? [originalPart.part_number, originalPart.name].filter(Boolean).join(" — ")
    : null

  const metaDirty = bundleTitle.trim() !== bundleOriginal.title || bundleNote.trim() !== bundleOriginal.note

  return (
    <div className="table-section">
      <Space style={{ marginBottom: 8, width: "100%", justifyContent: "space-between" }}>
        <Space wrap>
          <Text strong>{bundleId ? `Комплект №${bundleId}` : "Комплект"}</Text>
          {partLabel ? <Text type="secondary">({partLabel})</Text> : null}
          {totals?.length ? (
            <Text type="secondary">
              &nbsp;•&nbsp;Итого:&nbsp;
              {totals.map(t => `${Number(t.total_price ?? 0).toFixed(2)} ${t.currency_iso3}`).join("  |  ")}
            </Text>
          ) : null}
        </Space>
        {bundleId ? (
          <Space>
            <Input
              placeholder="Название роли (например, Насос)"
              value={qNewRole}
              onChange={(e) => setQNewRole(e.target.value)}
              onPressEnter={addRole}
              style={{ width: 260 }}
            />
            <Button type="primary" onClick={addRole} disabled={!qNewRole.trim()}>+ Добавить</Button>
          </Space>
        ) : (
          <Button type="primary" onClick={createBundle} loading={loading}>Создать комплект</Button>
        )}
      </Space>

      {bundleId ? (
        <>
          <Space style={{ marginBottom: 8, width: "100%" }} wrap>
            <Input
              placeholder="Название комплекта"
              value={bundleTitle}
              onChange={(e) => setBundleTitle(e.target.value)}
              style={{ width: 260 }}
            />
            <Input
              placeholder="Примечание"
              value={bundleNote}
              onChange={(e) => setBundleNote(e.target.value)}
              style={{ width: 320 }}
            />
            <Button onClick={saveBundleMeta} disabled={!metaDirty} loading={bundleSaving}>Сохранить</Button>
            <Button onClick={resetBundleMeta} disabled={!metaDirty || bundleSaving}>Сбросить</Button>
            <Button danger onClick={deleteBundle} disabled={bundleSaving} loading={loading}>
              Удалить комплект
            </Button>
          </Space>

          {items?.length ? (
            <Collapse
              accordion
              activeKey={activeRoleKey}
              onChange={(key) => setActiveRoleKey(key || null)}
              style={{ background: "#fff", borderRadius: 8 }}
              items={items.map((r) => {
                const optionsCount = (optionsByItem.get(r.id) || []).length
                const stop = (e) => {
                  e.preventDefault?.()
                  e.stopPropagation?.()
                }
                return {
                  key: String(r.id),
                  collapsible: "icon", // to avoid toggling while editing qty / pressing actions
                  label: (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, width: "100%" }}>
                      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                        <Text strong ellipsis={{ tooltip: r.role_label || "" }} style={{ display: "block" }}>
                          {r.role_label || "—"}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Вариантов: {optionsCount}
                        </Text>
                      </div>

                      <div onClick={stop}>
                        <Space size={8} align="center" wrap>
                          <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                            Кол-во
                          </Text>
                          <BomQuantityInput
                            value={r.qty || 1}
                            onCommit={(nextQty) => updateItemQty(r.id, nextQty)}
                          />
                        </Space>
                      </div>

                      <div onClick={stop} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Button size="small" onClick={() => openPicker(r)}>
                          Добавить варианты
                        </Button>
                        <ActionButtons
                          size="small"
                          onDelete={() => deleteItem(r.id)}
                          titles={{ delete: "Удалить роль" }}
                        />
                      </div>
                    </div>
                  ),
                  children: renderOptions(r),
                }
              })}
            />
          ) : (
            <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <Empty description="Нет ролей в комплекте" />
            </div>
          )}
        </>
      ) : (
        <Empty description="Комплект ещё не создан" />
      )}

      <SupplierPartPickerDrawer
        open={pickerOpen}
        onClose={() => { setPickerOpen(false); setPickerItem(null) }}
        excludeIds={pickerItem ? (optionsByItem.get(pickerItem.id) || []).map(o => o.supplier_part_id) : []}
        onPick={handlePickParts}
      />
    </div>
  )
}
