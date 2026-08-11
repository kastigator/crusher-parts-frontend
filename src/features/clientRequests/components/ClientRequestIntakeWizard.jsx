import React, { useEffect, useMemo, useState } from "react"
import { Alert, Button, Card, Checkbox, DatePicker, Form, Input, Modal, Select, Space, Statistic, Steps, Typography, message } from "antd"
import dayjs from "dayjs"
import {
  commitClientRequestIntake,
  validateClientRequestIntake,
} from "@/features/clientRequests/api/clientRequestsApi"
import MassIntakeGrid from "./MassIntakeGrid"
import { createEmptyRow } from "./intakeRows"
import useMeasurementUnits from "@/hooks/useMeasurementUnits"

const { Paragraph, Text, Title } = Typography

const buildPayload = (header, rows, options) => ({
  header: {
    ...header,
    received_at: header.received_at?.format?.("YYYY-MM-DD HH:mm:ss") || header.received_at || null,
    processing_deadline: header.processing_deadline?.format?.("YYYY-MM-DD") || header.processing_deadline || null,
  },
  rows: rows.map((row, index) => ({ ...row, source_row: index + 1 })),
  options,
})

export default function ClientRequestIntakeWizard({ open, clients, users, onClose, onCreated }) {
  const [form] = Form.useForm()
  const [step, setStep] = useState(0)
  const [rows, setRows] = useState([createEmptyRow()])
  const [header, setHeader] = useState(null)
  const [preview, setPreview] = useState(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmExact, setConfirmExact] = useState(false)
  const [exactConfirmationKey, setExactConfirmationKey] = useState(null)
  const [createTasks, setCreateTasks] = useState(true)
  const [taskPriority, setTaskPriority] = useState("normal")
  const [taskAssignee, setTaskAssignee] = useState(null)
  const { units: measurementUnits, options: uomOptions, loading: uomLoading, error: uomError } = useMeasurementUnits({ active: true })
  const defaultUom = useMemo(() => measurementUnits.find((unit) => String(unit.code).toLowerCase() === "шт")?.code || null, [measurementUnits])

  useEffect(() => {
    if (!open) return
    setStep(0); setRows([createEmptyRow()]); setHeader(null); setPreview(null); setConfirmExact(false); setExactConfirmationKey(null); setCreateTasks(true); setTaskPriority("normal"); setTaskAssignee(null)
    form.resetFields()
    form.setFieldsValue({ received_at: dayjs(), source_type: "manual" })
  }, [open, form])

  useEffect(() => {
    if (!open || !defaultUom) return
    setRows((current) => current.map((row) => row.uom ? row : { ...row, uom: defaultUom }))
  }, [open, defaultUom])

  const options = useMemo(() => ({
    confirm_exact_matches: confirmExact,
    exact_confirmation: confirmExact ? { action: "bulk_confirm_exact_unique", confirmation_key: exactConfirmationKey } : null,
    create_tasks_for_unresolved: createTasks,
    task_defaults: { priority: taskPriority, assigned_to_user_id: taskAssignee },
  }), [confirmExact, exactConfirmationKey, createTasks, taskPriority, taskAssignee])

  const check = async () => {
    const currentHeader = header || await form.validateFields()
    if (!defaultUom || uomError) return message.error("Не удалось загрузить активный справочник единиц измерения")
    setChecking(true)
    try {
      const result = await validateClientRequestIntake(buildPayload(currentHeader, rows, options))
      setPreview(result)
      setStep(2)
      if (!result.can_commit) message.warning("Исправьте отмеченные строки и повторите проверку")
    } catch (error) { message.error(error?.response?.data?.message || "Не удалось проверить заявку") }
    finally { setChecking(false) }
  }

  const selectCandidate = async (rowKey, catalogPositionId) => {
    const nextRows = rows.map((row) => row.row_key === rowKey ? { ...row, confirmed_catalog_position_id: catalogPositionId } : row)
    setRows(nextRows)
    setChecking(true)
    try {
      const result = await validateClientRequestIntake(buildPayload(header || form.getFieldsValue(true), nextRows, options))
      setPreview(result)
    } catch (error) { message.error(error?.response?.data?.message || "Не удалось проверить выбор") }
    finally { setChecking(false) }
  }

  const commit = async () => {
    if (!preview?.can_commit) return message.warning("Сначала устраните ошибки проверки")
    setSaving(true)
    try {
      const result = await commitClientRequestIntake({
        ...buildPayload(header || form.getFieldsValue(true), rows, options),
        payload_hash: preview.payload_hash,
        idempotency_key: globalThis.crypto?.randomUUID?.() || `intake-${Date.now()}`,
      })
      message.success(`Заявка ${result.internal_number} создана одной операцией`)
      onCreated(result)
    } catch (error) {
      const detail = error?.response?.data
      message.error(detail?.message || "Не удалось создать заявку")
      if (detail?.code === "PREVIEW_STALE" || detail?.code === "INTAKE_INVALID") setStep(1)
    } finally { setSaving(false) }
  }

  const summary = preview?.summary || {}
  return <Modal width="min(1540px, 96vw)" open={open} onCancel={onClose} footer={null} destroyOnHidden title="Новая заявка клиента — потоковый ввод">
    <Steps current={step} size="small" items={[{title:"Реквизиты"},{title:"Позиции"},{title:"Проверка и сопоставление"}]} />
    <Form form={form} layout="vertical" className="cr-create-form">
      {step === 0 && <div className="cr-form-grid">
        <Form.Item name="client_id" label="Клиент" rules={[{required:true,message:"Выберите клиента"}]}><Select showSearch optionFilterProp="label" options={clients.map((client)=>({value:client.id,label:client.company_name}))}/></Form.Item>
        <Form.Item name="internal_number" label="Номер заявки" rules={[{required:true,message:"Укажите номер"}]}><Input placeholder="Например, CR-2026-014"/></Form.Item>
        <Form.Item name="client_reference" label="Тема или номер клиента"><Input/></Form.Item>
        <Form.Item name="assigned_to_user_id" label="Ответственный"><Select allowClear showSearch optionFilterProp="label" options={users.map((user)=>({value:user.id,label:user.full_name||user.username}))}/></Form.Item>
        <Form.Item name="received_at" label="Дата получения"><DatePicker format="DD.MM.YYYY"/></Form.Item>
        <Form.Item name="processing_deadline" label="Срок ответа"><DatePicker format="DD.MM.YYYY"/></Form.Item>
        <Form.Item name="contact_name" label="Контакт клиента"><Input/></Form.Item>
        <Form.Item name="source_type" label="Источник"><Select options={[{value:"email",label:"Электронная почта"},{value:"phone",label:"Телефон"},{value:"portal",label:"Портал"},{value:"manual",label:"Вручную"},{value:"excel",label:"Excel/CSV"}]}/></Form.Item>
        <Form.Item className="cr-form-span" name="initial_note" label="Комментарий"><Input.TextArea rows={2}/></Form.Item>
      </div>}
    </Form>
    {step === 1 && <div className="cr-intake-step">
      <Alert showIcon type="info" message="Вводите строки подряд или загрузите таблицу" description="Заявка, ревизия, все строки, результаты сопоставления и задачи идентификации будут созданы одной атомарной операцией."/>
      {uomError && <Alert showIcon type="error" message="Справочник единиц измерения недоступен" description="Создание заявки заблокировано: единицы должны выбираться только из measurement_units."/>}
      <MassIntakeGrid rows={rows} onChange={(next) => { setRows(next); setPreview(null) }} uomOptions={uomOptions} uomLoading={uomLoading} defaultUom={defaultUom} />
    </div>}
    {step === 2 && <Space direction="vertical" size={16} style={{width:"100%"}}>
      <div className="cr-preview-metrics">
        <Card size="small"><Statistic title="Всего строк" value={summary.total||0}/></Card>
        <Card size="small"><Statistic title="Точные совпадения" value={summary.exact_unique||0}/></Card>
        <Card size="small"><Statistic title="Нужна проверка" value={summary.probable||0}/></Card>
        <Card size="small"><Statistic title="Неоднозначно" value={summary.ambiguous||0}/></Card>
        <Card size="small"><Statistic title="Без совпадения" value={summary.no_match||0}/></Card>
        <Card size="small"><Statistic title="Ошибки" value={summary.errors||0} valueStyle={{color:summary.errors?"#cf1322":undefined}}/></Card>
      </div>
      {!!preview?.errors?.length && <Alert type="error" showIcon message="Заявку пока нельзя создать" description={preview.errors.map((error)=><div key={error.code}>{error.message}</div>)}/>} 
      <Card size="small" title="Правила подтверждения">
        <Space wrap size={20}>
          <Checkbox checked={confirmExact} onChange={(event)=>{const checked=event.target.checked;setConfirmExact(checked);setExactConfirmationKey(checked?(globalThis.crypto?.randomUUID?.()||`exact-${Date.now()}`):null);setPreview(null)}}>Подтвердить все единственные точные совпадения явным групповым действием</Checkbox>
          <Checkbox checked={createTasks} onChange={(event)=>setCreateTasks(event.target.checked)}>Создать задачи для непроверенных совпадений и строк без совпадения</Checkbox>
          <Select value={taskPriority} onChange={setTaskPriority} options={[{value:"low",label:"Низкий приоритет"},{value:"normal",label:"Обычный приоритет"},{value:"high",label:"Высокий приоритет"},{value:"urgent",label:"Срочно"}]}/>
          <Select allowClear style={{minWidth:220}} value={taskAssignee} onChange={setTaskAssignee} placeholder="Исполнитель задач" options={users.map((user)=>({value:user.id,label:user.full_name||user.username}))}/>
        </Space>
      </Card>
      <MassIntakeGrid rows={rows} onChange={(next)=>{setRows(next);setPreview(null);setStep(1)}} previewRows={preview?.rows||[]} onSelectCandidate={selectCandidate} uomOptions={uomOptions} uomLoading={uomLoading} defaultUom={defaultUom} exactConfirmed={confirmExact}/>
      <Card className="cr-review-card"><Title level={5}>Что произойдёт после подтверждения</Title><Paragraph>Все {rows.length} строк сохранятся в исходном порядке. Неоднозначный результат никогда не выбирается автоматически. Для нерешённых строк создаются задачи в очереди «Требует идентификации»; решение задачи автоматически вернётся в заявку.</Paragraph><Text type={preview?.can_commit?"success":"danger"}>{preview?.can_commit?"Данные готовы к созданию":"Исправьте ошибки и повторите проверку"}</Text></Card>
    </Space>}
    <div className="cr-modal-actions">
      <Button disabled={step===0} onClick={()=>setStep(step-1)}>Назад</Button>
      <Space>
        {step===0&&<Button type="primary" loading={uomLoading} disabled={!defaultUom||!!uomError} onClick={async()=>{try{const values=await form.validateFields();setHeader(values);setStep(1)}catch{/* form highlights */}}}>К позициям</Button>}
        {step===1&&<Button type="primary" loading={checking} onClick={check}>Проверить все строки</Button>}
        {step===2&&<><Button loading={checking} onClick={check}>Повторить проверку</Button><Button type="primary" loading={saving} disabled={!preview?.can_commit} onClick={commit}>Создать заявку одной операцией</Button></>}
      </Space>
    </div>
  </Modal>
}
