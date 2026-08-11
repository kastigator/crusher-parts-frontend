import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, Badge, Button, Card, DatePicker, Descriptions, Drawer, Empty, Input, Modal, Segmented, Select, Space, Table, Tag, Timeline, Typography, message } from "antd"
import { LinkOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons"
import dayjs from "dayjs"
import { useNavigate, useSearchParams } from "react-router-dom"
import useCapabilities from "@/hooks/useCapabilities"
import { searchCatalogPositions } from "@/features/clientRequests/api/clientRequestsApi"
import {
  claimTechnicalIdentificationTask,
  assignTechnicalIdentificationTask,
  closeTechnicalIdentificationTask,
  getTechnicalIdentificationTask,
  listTechnicalIdentificationAssignees,
  listTechnicalIdentificationTasks,
  reopenTechnicalIdentificationTask,
  resolveTechnicalIdentificationTask,
  resumeTechnicalIdentificationTask,
  waitTechnicalIdentificationTask,
} from "@/features/technicalIdentification/api/technicalIdentificationApi"
import "./technicalIdentification.css"

const { Text, Title } = Typography
const key = () => globalThis.crypto?.randomUUID?.() || `command-${Date.now()}-${Math.random()}`

const STATUS = {
  new: ["default", "Новая"],
  in_progress: ["processing", "В работе"],
  waiting_client: ["warning", "Требует уточнения"],
  resolved: ["success", "Идентифицирована"],
  cancelled: ["default", "Отменена"],
  superseded: ["default", "Заменена новой"],
  closed: ["default", "Закрыта без позиции"],
}
const PRIORITY = { low: "Низкий", normal: "Обычный", high: "Высокий", urgent: "Срочно" }
const VIEWS = [
  {value:"open",label:"Открытые"},{value:"unassigned",label:"Без исполнителя"},{value:"mine",label:"Мои"},
  {value:"overdue",label:"Просроченные"},{value:"waiting_client",label:"Ждут клиента"},{value:"resolved",label:"Завершённые"},
]
const taskStatus = (value) => STATUS[value] || ["default", value || "—"]
function TaskDrawer({ taskId, open, onClose, onChanged }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [candidates, setCandidates] = useState([])
  const [selected, setSelected] = useState(null)
  const [resolutionType, setResolutionType] = useState("reused_existing")
  const [note, setNote] = useState("")
  const [working, setWorking] = useState(false)
  const [assignees, setAssignees] = useState([])
  const [assignment, setAssignment] = useState({ assigned_to_user_id: null, priority: "normal", due_at: null })
  const load = useCallback(async () => {
    if (!taskId) return
    setLoading(true)
    try {
      const result = await getTechnicalIdentificationTask(taskId)
      setTask(result)
      setCandidates(result.candidates || [])
      setSelected(result.candidates?.length === 1 ? result.candidates[0].catalog_position_id : null)
      setAssignment({ assigned_to_user_id: result.assigned_to_user_id || null, priority: result.priority || "normal", due_at: result.due_at ? dayjs(result.due_at) : null })
    } catch (error) {
      message.error(error?.response?.data?.message || "Не удалось открыть задачу")
    } finally { setLoading(false) }
  }, [taskId])
  useEffect(() => { if (open) load() }, [open, load])
  useEffect(() => {
    if (!open || !can("technical_identification.assign")) return
    listTechnicalIdentificationAssignees().then(setAssignees).catch(() => message.error("Не удалось загрузить исполнителей"))
  }, [open, can])
  const run = async (fn, payload = {}) => {
    setWorking(true)
    try {
      const result = await fn(task.id, { ...payload, row_version: task.row_version, idempotency_key: key() })
      message.success("Задача обновлена")
      await load()
      await onChanged()
      return result
    } catch (error) {
      message.error(error?.response?.data?.message || "Не удалось выполнить действие")
    } finally { setWorking(false) }
  }
  const search = async () => {
    if (query.trim().length < 2) return
    setWorking(true)
    try {
      const rows = await searchCatalogPositions(query)
      setCandidates(rows.map((row) => ({
        catalog_position_id: Number(row.id),
        position_code: row.position_code,
        manufacturer_part_number: row.manufacturer_part_number,
        name: row.display_name_ru || row.display_name || row.display_name_en,
        manufacturer_name: row.manufacturer_name,
        classifier_node_name: row.classifier_node_name,
        reasons: ["Найдено поиском пользователя"],
      })))
    } catch { message.error("Не удалось найти позиции каталога") }
    finally { setWorking(false) }
  }
  const waitForClient = () => {
    let clarification = ""
    Modal.confirm({
      title: "Какие данные нужно уточнить?",
      content: <Input.TextArea autoFocus onChange={(event) => { clarification = event.target.value }} placeholder="Конкретный вопрос клиенту" />,
      okText: "Отправить на уточнение",
      cancelText: "Отмена",
      onOk: () => run(waitTechnicalIdentificationTask, { blocker_note: clarification }),
    })
  }
  const resolve = () => run(resolveTechnicalIdentificationTask, { catalog_position_id: selected, resolution_type: resolutionType, resolution_note: note })
  const closeWithoutPosition = () => {
    let reason = ""
    Modal.confirm({
      title: "Закрыть без Catalog Position?",
      content: <Input.TextArea autoFocus onChange={(event)=>{reason=event.target.value}} placeholder="Обязательное основание терминального результата"/>,
      okText: "Закрыть без позиции",
      cancelText: "Отмена",
      onOk: () => run(closeTechnicalIdentificationTask, { resolution_type: "not_catalog_item", resolution_note: reason }),
    })
  }
  const reopen = () => {
    let reason = ""
    Modal.confirm({
      title: "Создать новое поколение задачи?",
      content: <Input.TextArea autoFocus onChange={(event)=>{reason=event.target.value}} placeholder="Почему требуется повторная идентификация"/>,
      okText: "Открыть повторно",
      cancelText: "Отмена",
      onOk: async () => {
        const result = await run(reopenTechnicalIdentificationTask, { reason })
        if (result?.task?.id) navigate(`/equipment-classifier?task=${result.task.id}`)
      },
    })
  }
  if(!task)return <Drawer width={900} open={open} onClose={onClose} loading={loading}/>
  const [statusColor,statusLabel]=taskStatus(task.status)
  const terminal=["resolved","closed","cancelled","superseded"].includes(task.status)
  return <Drawer className="ti-task-drawer" width="min(1120px, 96vw)" open={open} onClose={onClose} title={<Space><span>{task.task_number}</span><Badge status={statusColor} text={statusLabel}/><Tag>{PRIORITY[task.priority]||task.priority}</Tag></Space>}>
    <div className="ti-detail-grid">
      <Space direction="vertical" size={16}>
        <Card size="small" title="Исходный запрос клиента"><Descriptions size="small" bordered column={2}>
          <Descriptions.Item label="Клиент">{task.client_name}</Descriptions.Item><Descriptions.Item label="Заявка">{task.client_request_number} · ревизия {task.revision_number}</Descriptions.Item>
          <Descriptions.Item label="Строка" span={2}>{task.line_number}. {task.client_description||task.client_line_text||"Без описания"}</Descriptions.Item>
          <Descriptions.Item label="Каталожный номер">{task.client_catalog_number||"—"}</Descriptions.Item><Descriptions.Item label="Производитель">{task.client_manufacturer_text||"—"}</Descriptions.Item>
          <Descriptions.Item label="Оборудование / модель">{task.client_equipment_model_text||"—"}</Descriptions.Item><Descriptions.Item label="Количество">{task.requested_qty} {task.uom}</Descriptions.Item>
          <Descriptions.Item label="Требуемая дата">{task.required_date||"—"}</Descriptions.Item><Descriptions.Item label="Комментарий">{task.client_comment||"—"}</Descriptions.Item>
        </Descriptions><Space wrap><Button icon={<LinkOutlined/>} onClick={()=>navigate(`/client-requests?request=${task.client_request_id}&revision=${task.client_request_revision_id}`)}>Открыть заявку</Button><Button icon={<LinkOutlined/>} onClick={()=>navigate(`/equipment-classifier?position=${selected||task.result_catalog_position_id||""}`)}>Открыть классификатор</Button></Space></Card>
        {!terminal&&can("technical_identification.assign")&&<Card size="small" title="Назначение и срок"><Space wrap>
          <Select allowClear showSearch optionFilterProp="label" style={{minWidth:240}} value={assignment.assigned_to_user_id} onChange={(value)=>setAssignment((current)=>({...current,assigned_to_user_id:value||null}))} placeholder="Исполнитель" options={assignees.map((user)=>({value:user.id,label:user.full_name||user.username}))}/>
          <Select value={assignment.priority} onChange={(value)=>setAssignment((current)=>({...current,priority:value}))} options={Object.entries(PRIORITY).map(([value,label])=>({value,label}))}/>
          <DatePicker value={assignment.due_at} onChange={(value)=>setAssignment((current)=>({...current,due_at:value}))} format="DD.MM.YYYY" placeholder="Срок"/>
          <Button loading={working} onClick={()=>run(assignTechnicalIdentificationTask,{assigned_to_user_id:assignment.assigned_to_user_id,priority:assignment.priority,due_at:assignment.due_at?.format("YYYY-MM-DD")||null})}>Сохранить назначение</Button>
        </Space></Card>}
        {!terminal&&<Card size="small" title="Найти и подтвердить Catalog Position">
          <Space.Compact style={{width:"100%"}}><Input value={query} onChange={(event)=>setQuery(event.target.value)} onPressEnter={search} placeholder="Номер, производитель или описание"/><Button icon={<SearchOutlined/>} loading={working} onClick={search}>Найти</Button></Space.Compact>
          <div className="ti-candidates">{candidates.length?candidates.map((candidate)=><button type="button" key={candidate.catalog_position_id} className={Number(selected)===Number(candidate.catalog_position_id)?"is-selected":""} onClick={()=>setSelected(candidate.catalog_position_id)}><strong>{[candidate.manufacturer_name,candidate.manufacturer_part_number||candidate.position_code,candidate.name].filter(Boolean).join(" · ")}</strong><span>{candidate.classifier_node_name||"Раздел не указан"}</span><small>{(candidate.reasons||[]).join("; ")}</small></button>):<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Совпадений пока нет"/>}</div>
          <Space direction="vertical" style={{width:"100%"}}><Select value={resolutionType} onChange={setResolutionType} options={[{value:"reused_existing",label:"Использована существующая Catalog Position"},{value:"created_new",label:"Catalog Position ранее создана через Classifier"}]}/><Input.TextArea value={note} onChange={(event)=>setNote(event.target.value)} placeholder="Основание решения или примечание"/><Space wrap>{task.status==="new"&&can("technical_identification.manage")&&<Button loading={working} onClick={()=>run(claimTechnicalIdentificationTask)}>Взять в работу</Button>}{task.status==="waiting_client"&&can("technical_identification.manage")&&<Button loading={working} onClick={()=>run(resumeTechnicalIdentificationTask)}>Продолжить после уточнения</Button>}{task.status==="in_progress"&&can("technical_identification.manage")&&<Button onClick={waitForClient}>Запросить уточнение</Button>}{can("technical_identification.resolve")&&<Button type="primary" disabled={!selected||task.status!=="in_progress"} loading={working} onClick={resolve}>Подтвердить позицию и вернуть в заявку</Button>}{can("technical_identification.resolve")&&["in_progress","waiting_client"].includes(task.status)&&<Button danger onClick={closeWithoutPosition}>Закрыть без позиции</Button>}</Space></Space>
        </Card>}
        {terminal&&<><Alert type={task.status==="resolved"?"success":"info"} showIcon message={task.status==="resolved"?"Идентификация завершена":"Задача закрыта"} description={task.result_position_name?[task.result_manufacturer_part_number||task.result_position_code,task.result_position_name].filter(Boolean).join(" · "):task.resolution_note}/>{can("technical_identification.resolve")&&<Button style={{marginTop:12}} onClick={reopen}>Открыть новое поколение задачи</Button>}</>} 
      </Space>
      <Card size="small" title="История задачи"><Timeline items={(task.events||[]).map((event)=>({children:<div><strong>{event.event_type}</strong><div>{event.actor_name||event.actor_username} · {new Date(event.occurred_at).toLocaleString("ru-RU")}</div>{event.payload?.blocker_note&&<Text type="secondary">{event.payload.blocker_note}</Text>}</div>}))}/></Card>
    </div>
  </Drawer>
}

export default function TechnicalIdentificationWorkspace() {
  const [searchParams,setSearchParams]=useSearchParams()
  const [view,setView]=useState(searchParams.get("view")||"open")
  const [query,setQuery]=useState("")
  const [model,setModel]=useState({items:[],counts:{},pagination:{page:1,page_size:25,total:0}})
  const [loading,setLoading]=useState(false)
  const taskId=Number(searchParams.get("task")||0)||null
  const load=useCallback(async(page=1)=>{setLoading(true);try{setModel(await listTechnicalIdentificationTasks({view,q:query||undefined,page,page_size:25}))}catch(error){message.error(error?.response?.data?.message||"Не удалось загрузить очередь")}finally{setLoading(false)}},[view,query])
  useEffect(()=>{load()},[load])
  const rows=model.items||[]
  const columns=useMemo(()=>[
    {title:"Задача",width:145,render:(_,row)=><Space direction="vertical" size={0}><Text strong>{row.task_number}</Text><Text type="secondary">{PRIORITY[row.priority]||row.priority}</Text></Space>},
    {title:"Состояние",width:165,render:(_,row)=>{const[color,label]=taskStatus(row.status);return <Badge status={color} text={label}/>}},
    {title:"Клиент и заявка",width:220,render:(_,row)=><Space direction="vertical" size={0}><Text strong>{row.client_name}</Text><Text type="secondary">{row.client_request_number} · рев. {row.revision_number} · строка {row.line_number}</Text></Space>},
    {title:"Что запросил клиент",render:(_,row)=><Space direction="vertical" size={0}><Text strong>{row.client_description||row.client_line_text||"Без описания"}</Text><Text type="secondary">{[row.client_manufacturer_text,row.client_equipment_model_text,row.client_catalog_number].filter(Boolean).join(" · ")||"Технический контекст не указан"}</Text></Space>},
    {title:"Количество",width:110,render:(_,row)=>`${row.requested_qty||"—"} ${row.uom||""}`},
    {title:"Кандидаты",width:115,render:(_,row)=><Tag>{row.candidates?.length||0}</Tag>},
    {title:"Исполнитель",width:170,render:(_,row)=>row.assignee_name||row.assignee_username||<Text type="secondary">Не назначен</Text>},
    {title:"Срок",width:125,render:(_,row)=>row.due_at?new Date(row.due_at).toLocaleDateString("ru-RU"):"—"},
  ],[])
  const openTask=(id)=>{const next=new URLSearchParams(searchParams);next.set("task",id);setSearchParams(next)}
  const closeTask=()=>{const next=new URLSearchParams(searchParams);next.delete("task");setSearchParams(next)}
  return <div className="ti-workspace">
    <div className="ti-heading"><div><Title level={2}>Требует идентификации</Title><Text type="secondary">Рабочая очередь Classifier & Engineering — не раздел технического дерева</Text></div><Space><Tag color="blue">{model.counts?.new_count||0} новых</Tag><Tag color="orange">{model.counts?.waiting_client_count||0} ждут клиента</Tag><Button icon={<ReloadOutlined/>} onClick={()=>load()}>Обновить</Button></Space></div>
    <Card><div className="ti-toolbar"><Input allowClear prefix={<SearchOutlined/>} value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Задача, заявка, клиент, номер или описание"/><Segmented value={view} onChange={setView} options={VIEWS}/></div><Table rowKey="id" loading={loading} dataSource={rows} columns={columns} scroll={{x:1350}} pagination={{current:model.pagination?.page||1,pageSize:model.pagination?.page_size||25,total:model.pagination?.total||0,showSizeChanger:false,onChange:load}} onRow={(row)=>({onClick:()=>openTask(row.id)})}/></Card>
    <TaskDrawer taskId={taskId} open={!!taskId} onClose={closeTask} onChanged={()=>load(model.pagination?.page||1)}/>
  </div>
}
