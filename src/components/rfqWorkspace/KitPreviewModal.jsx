import React from "react"
import { Button, Modal, Select, Space, Table, Typography } from "antd"

const { Text } = Typography

export default function KitPreviewModal({
  kitPreview,
  setKitPreview,
  loadBundleItems,
}) {
  return (
    <Modal
      open={kitPreview.open}
      onCancel={() =>
        setKitPreview({
          open: false,
          partId: null,
          bundles: [],
          bundleId: null,
          items: [],
          loading: false,
        })
      }
      title="Роли комплекта"
      width={700}
      footer={<Button onClick={() => setKitPreview((prev) => ({ ...prev, open: false }))}>Закрыть</Button>}
    >
      {kitPreview.loading ? (
        <Text type="secondary">Загрузка…</Text>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Select
            placeholder="Выберите комплект"
            value={kitPreview.bundleId || undefined}
            options={kitPreview.bundles.map((b) => ({
              value: b.id,
              label: b.title || `Комплект #${b.id}`,
            }))}
            onChange={async (value) => {
              const items = await loadBundleItems(value)
              setKitPreview((prev) => ({
                ...prev,
                bundleId: value,
                items: Array.isArray(items) ? items : [],
              }))
            }}
            style={{ width: 360 }}
          />
          <Table
            rowKey="id"
            dataSource={kitPreview.items}
            pagination={false}
            columns={[
              { title: "Роль", dataIndex: "role_label" },
              { title: "Кол-во", dataIndex: "qty", width: 120 },
            ]}
          />
        </Space>
      )}
    </Modal>
  )
}
