import React from "react"
import { Button, Modal, Table, Typography } from "antd"

const { Text } = Typography

export default function AltPartsModal({ altModal, setAltModal }) {
  return (
    <Modal
      open={altModal.open}
      onCancel={() =>
        setAltModal({ open: false, loading: false, partId: null, items: [] })
      }
      title="Альтернативные оригиналы"
      width={820}
      footer={
        <Button
          onClick={() =>
            setAltModal({ open: false, loading: false, partId: null, items: [] })
          }
        >
          Закрыть
        </Button>
      }
    >
      {altModal.loading ? (
        <Text type="secondary">Загрузка…</Text>
      ) : (
        <Table
          rowKey={(row) => row.alt_part_id}
          dataSource={altModal.items}
          pagination={false}
          size="small"
          columns={[
            { title: "Part #", dataIndex: "cat_number", width: 160 },
            {
              title: "Описание",
              render: (_, r) => r.description_ru || r.description_en || "—",
            },
            { title: "Производитель", dataIndex: "manufacturer_name", width: 200 },
            { title: "Модель", dataIndex: "model_name", width: 200 },
          ]}
        />
      )}
    </Modal>
  )
}
