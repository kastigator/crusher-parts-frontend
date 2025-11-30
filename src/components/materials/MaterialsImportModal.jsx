import React, { useState } from "react"
import {
  Modal,
  Button,
  Upload,
  message,
  Space,
  Checkbox,
  Typography,
  Alert,
} from "antd"
import { UploadOutlined, ReloadOutlined } from "@ant-design/icons"
import axios from "@/api/axiosInstance"

const { Text } = Typography

export default function MaterialsImportModal({ open, onClose, onImported }) {
  const [loading, setLoading] = useState(false)
  const [truncate, setTruncate] = useState(false)
  const [error, setError] = useState("")

  const parsePointsString = (str = "") => {
    const parts = String(str || "")
      .trim()
      .split(/\s+/)
      .map((v) => Number(v))
    const pts = []
    for (let i = 0; i < parts.length; i += 2) {
      const x = parts[i]
      const y = parts[i + 1]
      if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y })
    }
    return pts
  }

  const deriveStandard = (name, descriptionAttr, propertySource) => {
    const src = [name, descriptionAttr, propertySource].filter(Boolean).join(" ")
    const markers = ["ГОСТ", "GOST", "DIN", "ASTM", "ISO", "EN", "BS"]
    let best = null
    for (const m of markers) {
      const idx = src.toUpperCase().indexOf(m)
      if (idx >= 0) {
        const substr = src.slice(idx).trim()
        // обрезаем по первой запятой/скобке, чтобы не тащить лишнее
        const cut = substr.split(/[,(]/)[0].trim()
        best = cut || substr
        break
      }
    }
    return best
  }

  const parseSldmatText = (text, fileName = "materials.sldmat") => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, "application/xml")
    const materials = []
    const categoriesSet = new Set()

    // Собираем все <material> (с учётом namespace)
    const materialNodes = Array.from(doc.getElementsByTagName("*")).filter((el) =>
      (el.tagName || "").toLowerCase().endsWith("material")
    )

    for (const child of materialNodes) {
      const name = child.getAttribute("name")
      if (!name) continue

      // Восстанавливаем путь классификаций по родителям
      const catPath = []
      let p = child.parentElement
      while (p) {
        const tag = (p.tagName || "").toLowerCase()
        if (tag.endsWith("classification")) {
          const cname = p.getAttribute("name")
          if (cname) catPath.unshift(cname)
        }
        p = p.parentElement
      }
      if (catPath.length) categoriesSet.add(catPath.join("||"))

      const physical = child.getElementsByTagName("physicalproperties")[0]
      const properties = []
      if (physical) {
        Array.from(physical.children || []).forEach((p) => {
          const code = p.tagName
          if (!code || code.toLowerCase().includes("materialcurve")) return
          properties.push({
            code,
            display_name: p.getAttribute("displayname") || "",
            value_num: Number(p.getAttribute("value")),
            value_text: p.getAttribute("value") || "",
            unit: p.getAttribute("units") || "",
            use_curve: p.getAttribute("usepropertycurve") === "1",
          })
        })
      }

      const curves = []
      const curveNodes = child.getElementsByTagName("materialcurve")
      Array.from(curveNodes || []).forEach((c) => {
        const pointsNodes = Array.from(c.getElementsByTagName("data"))
        const points = pointsNodes.flatMap((d) =>
          parsePointsString(d.getAttribute("points"))
        )
        curves.push({
          curve_id: c.getAttribute("id") || null,
          name: c.getAttribute("name") || "",
          type: c.getAttribute("type") || "",
          points,
        })
      })

      const descriptionAttr = child.getAttribute("description") || ""
      const propertySource = child.getAttribute("propertysource") || ""
      const appdata = child.getAttribute("appdata") || ""
      const standard = deriveStandard(name, descriptionAttr, propertySource)
      const description = descriptionAttr || propertySource || appdata || ""

      materials.push({
        name,
        source_file: fileName,
        source_path: catPath.join(" / "),
        category_path: catPath,
        description,
        standard,
        code: child.getAttribute("matid") || "",
        properties,
        curves,
      })
    }

    const categories = Array.from(categoriesSet).map((pathStr) => ({
      path: pathStr.split("||"),
      source: fileName,
    }))

    return { categories, materials }
  }

  const handleJson = async (json) => {
    try {
      setLoading(true)
      setError("")
      await axios.post(
        "/materials/import",
        json,
        { params: { truncate: truncate ? 1 : 0 } }
      )
      message.success("Импорт выполнен")
      onImported?.()
    } catch (e) {
      console.error("Ошибка импорта материалов", e)
      const msg = e?.response?.data?.message || "Ошибка импорта"
      setError(msg)
      message.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const beforeUpload = async (file) => {
    const nameLower = file.name.toLowerCase()
    const isJson = file.type === "application/json" || nameLower.endsWith(".json")
    const isSld = nameLower.endsWith(".sldmat")

    if (!isJson && !isSld) {
      message.error("Поддерживаются JSON или .sldmat")
      return Upload.LIST_IGNORE
    }

    const readFileAsText = () =>
      new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        // SolidWorks .sldmat — UTF-16, читаем корректно
        reader.readAsText(file, isSld ? "UTF-16" : "UTF-8")
      })

    try {
      const text = await readFileAsText()
      if (isJson) {
        const parsed = JSON.parse(text)
        await handleJson(parsed)
      } else {
        const parsed = parseSldmatText(text, file.name)
        await handleJson(parsed)
      }
    } catch (e) {
      console.error("Ошибка чтения/парсинга файла", e)
      message.error("Не удалось обработать файл")
    }
    return Upload.LIST_IGNORE
  }

  const handlePasteSample = async () => {
    const sample = {
      categories: [
        { path: ["Сталь", "Нержавеющая"] },
        { path: ["Сталь", "Углеродистая"] },
      ],
      materials: [
        {
          name: "AISI 304",
          code: "304",
          standard: "ASTM",
          source_file: "solidworks materials.sldmat",
          category_path: ["Сталь", "Нержавеющая"],
          properties: [
            { code: "DENS", display_name: "Плотность", value_num: 7930, unit: "кг/м3" },
            { code: "EX", display_name: "Модуль упругости", value_num: 193000000000, unit: "Па" },
          ],
          curves: [
            {
              curve_id: "1000",
              name: "Растяжение",
              type: "100",
              points: [
                { x: 0.001, y: 2.8e8 },
                { x: 0.003, y: 3.1e8 },
              ],
            },
          ],
          aliases: ["08Х18Н10"],
        },
      ],
    }
    await handleJson(sample)
  }

  return (
    <Modal
      open={open}
      title="Импорт библиотеки материалов (JSON)"
      onCancel={onClose}
      destroyOnClose
      footer={[
        <Button key="sample" icon={<ReloadOutlined />} onClick={handlePasteSample} disabled={loading}>
          Загрузить пример
        </Button>,
        <Button key="close" onClick={onClose} disabled={loading}>
          Закрыть
        </Button>,
      ]}
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Text type="secondary">
          Форматы: JSON (структура `/materials/import`) или `.sldmat` (SolidWorks). JSON можно получить, сохранив пример или выгрузив результат парсера.
        </Text>
        <Alert
          type="warning"
          showIcon
          message="Очистить материалы?"
          description="Флажок ниже полностью удалит существующие материалы и категории перед загрузкой. Оставьте выключенным, если хотите просто добавить/обновить."
        />

        <Checkbox
          checked={truncate}
          onChange={(e) => setTruncate(e.target.checked)}
          disabled={loading}
        >
          Очистить существующие материалы перед импортом
        </Checkbox>

        <Upload
          accept=".json,.sldmat,application/json,application/xml,text/xml"
          showUploadList={false}
          beforeUpload={beforeUpload}
          disabled={loading}
        >
          <Button icon={<UploadOutlined />} loading={loading}>
            Загрузить JSON файл
          </Button>
        </Upload>

        {error && <Alert type="error" message={error} />}
      </Space>
    </Modal>
  )
}
