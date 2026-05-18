import React, { useMemo, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import {
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  FloatButton,
  Input,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd"
import {
  DeleteOutlined,
  PaperClipOutlined,
  RobotOutlined,
  SendOutlined,
} from "@ant-design/icons"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import axios from "@/api/axiosInstance"
import { appMessage } from "@/utils/uiFeedback"

const { Text } = Typography

const ACCEPTED_FILES = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".xlsx",
  ".xls",
  ".csv",
  ".docx",
  ".txt",
  ".json",
].join(",")

const introMessage = {
  role: "assistant",
  content:
    "Я могу помочь разобраться в системе, проверить каталоги, найти клиентов/поставщиков/детали и проанализировать PDF, картинки, Excel, Word или CSV. Пока я не записываю данные сам: если нужно что-то создать, подготовлю план для подтверждения.",
}

const formatFileSize = (size) => {
  const n = Number(size) || 0
  if (n < 1024) return `${n} Б`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`
  return `${(n / 1024 / 1024).toFixed(1)} МБ`
}

function AssistantMarkdown({ children }) {
  return (
    <div className="ai-assistant__markdown">
      <ReactMarkdown
        components={{
          a: ({ children: linkChildren }) => <span>{linkChildren}</span>,
        }}
      >
        {children || ""}
      </ReactMarkdown>
    </div>
  )
}

const formatChartValue = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n)
}

function AIChart({ chart }) {
  const data = Array.isArray(chart?.data) ? chart.data : []
  const series = Array.isArray(chart?.series) ? chart.series : []
  const xKey = chart?.xKey
  if (!data.length || !series.length || !xKey) return null

  const ChartComponent = chart?.type === "line" ? LineChart : BarChart

  return (
    <Card
      size="small"
      className="ai-assistant__chart-card"
      title={chart.title || "График"}
    >
      {chart.subtitle ? (
        <Text type="secondary" className="ai-assistant__chart-subtitle">
          {chart.subtitle}
        </Text>
      ) : null}
      <div className="ai-assistant__chart">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatChartValue} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => formatChartValue(value)} />
            <Legend />
            {series.map((item, index) =>
              chart?.type === "line" ? (
                <Line
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  name={item.label || item.key}
                  stroke={item.color || ["#2563eb", "#16a34a", "#f97316"][index % 3]}
                  strokeWidth={2}
                  dot={false}
                />
              ) : (
                <Bar
                  key={item.key}
                  dataKey={item.key}
                  name={item.label || item.key}
                  fill={item.color || ["#2563eb", "#16a34a", "#f97316"][index % 3]}
                  radius={[4, 4, 0, 0]}
                />
              )
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function AITablePreview({ table }) {
  const rows = Array.isArray(table?.rows) ? table.rows : []
  const columns = Array.isArray(table?.columns) ? table.columns : []
  if (!rows.length || !columns.length) return null

  return (
    <Table
      size="small"
      className="ai-assistant__table"
      rowKey={(_, index) => `${table?.id || "table"}-${index}`}
      pagination={false}
      columns={columns.map((col) => ({
        title: col.label || col.key,
        dataIndex: col.key,
        key: col.key,
        render: (value) => formatChartValue(value),
      }))}
      dataSource={rows.slice(0, 8)}
      scroll={{ x: true }}
    />
  )
}

export default function AIAssistantDrawer() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([introMessage])
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const listRef = useRef(null)

  const chatHistory = useMemo(
    () =>
      messages
        .filter((item) => item.role === "user" || item.role === "assistant")
        .slice(-10)
        .map((item) => ({ role: item.role, content: item.content })),
    [messages]
  )

  const scrollToBottom = () => {
    window.requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
    })
  }

  const send = async () => {
    const text = message.trim()
    if (!text && !files.length) {
      appMessage.warning("Напишите вопрос или приложите файл")
      return
    }

    const selectedFiles = files.map((item) => item.originFileObj).filter(Boolean)
    const userText =
      text ||
      `Проанализируй приложенные файлы: ${selectedFiles.map((file) => file.name).join(", ")}`

    setMessages((prev) => [...prev, { role: "user", content: userText, files: selectedFiles }])
    setMessage("")
    setFiles([])
    setLoading(true)
    scrollToBottom()

    try {
      const formData = new FormData()
      formData.append("message", userText)
      formData.append("history", JSON.stringify(chatHistory))
      selectedFiles.forEach((file) => formData.append("files", file))

      const { data } = await axios.post("/ai-agent/chat", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.answer || "Агент не вернул ответ.",
          attachments: data?.attachments || [],
          charts: data?.charts || [],
          tables: data?.tables || [],
          tools: data?.tools || [],
          model: data?.model,
        },
      ])
    } catch (err) {
      console.error("POST /ai-agent/chat error:", err)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          type: "error",
          content: err?.response?.data?.message || "Не удалось получить ответ агента.",
        },
      ])
    } finally {
      setLoading(false)
      scrollToBottom()
    }
  }

  const clear = () => {
    setMessages([introMessage])
    setFiles([])
    setMessage("")
  }

  return (
    <>
      <FloatButton
        icon={<RobotOutlined />}
        tooltip="ИИ-агент"
        type="primary"
        onClick={() => setOpen(true)}
        style={{ right: 24, bottom: 24 }}
      />

      <Drawer
        title={
          <Space size={8}>
            <RobotOutlined />
            <span>ИИ-агент системы</span>
          </Space>
        }
        open={open}
        onClose={() => setOpen(false)}
        width={560}
        extra={
          <Button size="small" onClick={clear}>
            Очистить
          </Button>
        }
      >
        <div className="ai-assistant">
          <Alert
            type="info"
            showIcon
            message="Тестовый режим"
            description="Агент анализирует файлы и читает данные системы через безопасные инструменты. Создание и изменение записей пока только в виде плана для подтверждения."
          />

          <div ref={listRef} className="ai-assistant__messages">
            {messages.length ? (
              messages.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={`ai-assistant__message ai-assistant__message--${item.role}`}
                >
                  <div className="ai-assistant__bubble">
                    {item.type === "error" ? (
                      <Text type="danger">{item.content}</Text>
                    ) : (
                      <AssistantMarkdown>{item.content}</AssistantMarkdown>
                    )}

                    {item.files?.length ? (
                      <Space size={[4, 4]} wrap style={{ marginTop: 8 }}>
                        {item.files.map((file) => (
                          <Tag key={file.name} icon={<PaperClipOutlined />}>
                            {file.name}
                          </Tag>
                        ))}
                      </Space>
                    ) : null}

                    {item.charts?.length ? (
                      <div className="ai-assistant__charts">
                        {item.charts.map((chart, chartIndex) => (
                          <AIChart key={`${chart?.id || "chart"}-${chartIndex}`} chart={chart} />
                        ))}
                      </div>
                    ) : null}

                    {item.tables?.length ? (
                      <div className="ai-assistant__tables">
                        {item.tables.map((table, tableIndex) => (
                          <AITablePreview
                            key={`${table?.id || "table"}-${tableIndex}`}
                            table={table}
                          />
                        ))}
                      </div>
                    ) : null}

                  </div>
                </div>
              ))
            ) : (
              <Empty description="Сообщений пока нет" />
            )}

            {loading ? (
              <div className="ai-assistant__loading">
                <Spin size="small" /> <Text type="secondary">Агент думает...</Text>
              </div>
            ) : null}
          </div>

          <div className="ai-assistant__composer">
            {files.length ? (
              <div className="ai-assistant__files">
                {files.map((file) => (
                  <Tag
                    key={file.uid}
                    closable
                    onClose={() => setFiles((prev) => prev.filter((item) => item.uid !== file.uid))}
                  >
                    {file.name} · {formatFileSize(file.size)}
                  </Tag>
                ))}
              </div>
            ) : null}

            <Input.TextArea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Например: проанализируй заявку из PDF и проверь, есть ли такой клиент и детали в системе"
              autoSize={{ minRows: 3, maxRows: 7 }}
              onPressEnter={(event) => {
                if ((event.metaKey || event.ctrlKey) && !loading) send()
              }}
            />

            <div className="ai-assistant__actions">
              <Upload
                multiple
                accept={ACCEPTED_FILES}
                fileList={files}
                beforeUpload={() => false}
                onChange={({ fileList }) => setFiles(fileList.slice(-8))}
              >
                <Button icon={<PaperClipOutlined />}>Файлы</Button>
              </Upload>

              <Space>
                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => setFiles([])}
                  disabled={!files.length || loading}
                >
                  Убрать файлы
                </Button>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={send}
                  loading={loading}
                  disabled={!message.trim() && !files.length}
                >
                  Отправить
                </Button>
              </Space>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  )
}
