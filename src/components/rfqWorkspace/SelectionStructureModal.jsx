import React from "react"
import { Button, Checkbox, Modal, Space, Tag, Tree, Typography } from "antd"

const { Text } = Typography

export default function SelectionStructureModal({
  selectionModal,
  setSelectionModal,
  activeSupplierHints,
  selectionCoverage,
  selectionTreeDataVisible,
  applyAltExclusion,
  selectionNodeMapRef,
  handleSelectAllHinted,
  saveSelections,
}) {
  return (
    <Modal
      open={selectionModal.open}
      onCancel={() => setSelectionModal((prev) => ({ ...prev, open: false }))}
      title={`Структура для поставщика: ${selectionModal.supplier?.supplier_name || ""}`}
      width={1000}
      okText="Сохранить"
      onOk={() => saveSelections(selectionNodeMapRef.current)}
      confirmLoading={selectionModal.saving}
    >
      {selectionModal.loading ? (
        <Text type="secondary">Загрузка…</Text>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Space wrap align="center">
            <Checkbox
              checked={selectionModal.onlyHinted}
              disabled={!activeSupplierHints}
              onChange={(e) =>
                setSelectionModal((prev) => ({ ...prev, onlyHinted: e.target.checked }))
              }
            >
              Показать только где есть
            </Checkbox>
            <Button disabled={!activeSupplierHints} onClick={handleSelectAllHinted}>
              Отметить всё где есть
            </Button>
            {!activeSupplierHints ? (
              <Text type="secondary">Нет подсказок по поставщику</Text>
            ) : null}
          </Space>
          <Space wrap size={8} align="center">
            <Text type="secondary">Легенда:</Text>
            <Tag>Оригинал/BOM</Tag>
            <Tag color="gold">Наш номер</Tag>
            <Tag color="orange">Подмена</Tag>
            <Tag color="green">Роль комплекта</Tag>
            <Tag color="blue">Есть связь</Tag>
          </Space>
          <Space wrap size={8} align="center">
            <Text strong>
              Позиции покрыты: {selectionCoverage.hintedItems}/{selectionCoverage.totalItems}
            </Text>
            <Text type="secondary">
              Позиции выбраны: {selectionCoverage.selectedItems}/{selectionCoverage.totalItems}
            </Text>
          </Space>
          <Space wrap size={8} align="center">
            <Text type="secondary">
              Детальные варианты со связями: {selectionCoverage.hinted}/{selectionCoverage.total}
            </Text>
            {activeSupplierHints ? (
              <Text type="secondary">
                Выбрано со связями: {selectionCoverage.selectedHinted}/{selectionCoverage.hinted}
              </Text>
            ) : null}
          </Space>
          <Tree
            checkable
            checkStrictly
            defaultExpandAll
            showLine
            checkedKeys={selectionModal.selectedKeys}
            onCheck={(checked, info) => {
              const next = new Set(Array.isArray(checked) ? checked : checked.checked)
              const actionKey = info?.node?.key
              const actionChecked = info?.checked
              const normalized =
                actionKey !== undefined
                  ? applyAltExclusion(next, actionKey, actionChecked)
                  : next
              setSelectionModal((prev) => {
                const accepted = new Set(prev.acceptedKeys || [])
                const acceptedPriceByKey = { ...(prev.acceptedPriceByKey || {}) }
                Array.from(accepted).forEach((key) => {
                  if (!normalized.has(key)) {
                    accepted.delete(key)
                    delete acceptedPriceByKey[key]
                  }
                })
                return {
                  ...prev,
                  selectedKeys: Array.from(normalized),
                  acceptedKeys: Array.from(accepted),
                  acceptedPriceByKey,
                }
              })
            }}
            treeData={selectionTreeDataVisible}
          />
        </Space>
      )}
    </Modal>
  )
}
