import React, { useState } from "react";
import { Table, Input, Divider, Row, Col, Space, Tooltip, Button } from "antd";
import PlaceAddressInput from "@/components/inputs/PlaceAddressInput";
import ActionButtons from "@/components/common/ActionButtons";
import confirmAction from "@/utils/confirmAction";
import { CopyOutlined } from "@ant-design/icons";

const formatFull = (r = {}) =>
  [
    r.country,
    r.region,
    r.city,
    r.street && `ул. ${r.street}`,
    r.house && `д. ${r.house}`,
    r.building && `стр. ${r.building}`,
    r.entrance && `подъезд ${r.entrance}`,
    r.postal_code && `инд. ${r.postal_code}`,
  ]
    .filter(Boolean)
    .join(", ");

export default function ShippingAddressesTable({ data = [], loading, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editedRow, setEditedRow] = useState(null);

  const isEditing = (r) => editingId !== null && r?.id === editingId;
  const cancelEdit = () => {
    setEditingId(null);
    setEditedRow(null);
  };

  const onKey = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") cancelEdit();
  };

  const handleSave = async () => {
    if (!editedRow?.formatted_address?.trim()) return;
    try {
      await onUpdate(editingId, { ...editedRow });
      cancelEdit();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (record) => {
    const { confirmed } = await confirmAction("Удалить адрес?");
    if (!confirmed) return;
    try {
      await onDelete(record);
    } catch (e) {
      console.error(e);
    }
  };

  const columns = [
    {
      title: "Адрес доставки",
      dataIndex: "formatted_address",
      render: (_, r) => {
        const editing = isEditing(r);
        if (editing && editedRow) {
          return (
            <>
              <PlaceAddressInput
                debugId={`shipping-table-row-${r.id}`}
                value={{
                  address_line: editedRow.formatted_address,
                  lat: editedRow.lat,
                  lng: editedRow.lng,
                  place_id: editedRow.place_id,
                  postal_code: editedRow.postal_code,
                }}
                // якорим попапы к ближайшей обёртке раскрытой строки
                getPopupContainer={(trigger) =>
                  trigger?.closest(".parts-table-wrap") || document.body
                }
                onChange={(v) =>
                  setEditedRow((p) => ({
                    ...p,
                    formatted_address: v.address_line,
                    place_id: v.place_id,
                    lat: v.lat,
                    lng: v.lng,
                    postal_code: v.postal_code,
                    country: v.country,
                    region: v.region,
                    city: v.city,
                    street: v.street,
                    house: v.house,
                    building: v.building,
                    entrance: v.entrance,
                  }))
                }
              />

              <Divider style={{ margin: "8px 0" }} />

              <Row gutter={8}>
                <Col span={6}>
                  <Input
                    placeholder="Страна"
                    value={editedRow.country}
                    onChange={(e) => setEditedRow((p) => ({ ...p, country: e.target.value }))}
                    onKeyDown={onKey}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Регион"
                    value={editedRow.region}
                    onChange={(e) => setEditedRow((p) => ({ ...p, region: e.target.value }))}
                    onKeyDown={onKey}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Город"
                    value={editedRow.city}
                    onChange={(e) => setEditedRow((p) => ({ ...p, city: e.target.value }))}
                    onKeyDown={onKey}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Индекс"
                    value={editedRow.postal_code}
                    onChange={(e) => setEditedRow((p) => ({ ...p, postal_code: e.target.value }))}
                    onKeyDown={onKey}
                  />
                </Col>
              </Row>

              <Row gutter={8} style={{ marginTop: 8 }}>
                <Col span={8}>
                  <Input
                    placeholder="Улица"
                    value={editedRow.street}
                    onChange={(e) => setEditedRow((p) => ({ ...p, street: e.target.value }))}
                    onKeyDown={onKey}
                  />
                </Col>
                <Col span={4}>
                  <Input
                    placeholder="Дом"
                    value={editedRow.house}
                    onChange={(e) => setEditedRow((p) => ({ ...p, house: e.target.value }))}
                    onKeyDown={onKey}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Строение"
                    value={editedRow.building}
                    onChange={(e) => setEditedRow((p) => ({ ...p, building: e.target.value }))}
                    onKeyDown={onKey}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Подъезд"
                    value={editedRow.entrance}
                    onChange={(e) => setEditedRow((p) => ({ ...p, entrance: e.target.value }))}
                    onKeyDown={onKey}
                  />
                </Col>
              </Row>
            </>
          );
        }

        const oneLine = formatFull(r) || r.formatted_address?.trim() || "—";
        return (
          <div
            onDoubleClick={() => {
              setEditingId(r.id);
              setEditedRow({ ...r });
            }}
          >
            <div className="cell-ellipsis" style={{ fontWeight: 600 }}>
              {oneLine}
            </div>
            {r.comment && (
              <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
                Комментарий: {r.comment}
                <Space size={6} style={{ marginLeft: 8 }}>
                  <Tooltip title="Скопировать адрес">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(oneLine);
                      }}
                    />
                  </Tooltip>
                </Space>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Действия",
      dataIndex: "actions",
      width: 140,
      render: (_, r) => {
        const editing = isEditing(r);
        return (
          <ActionButtons
            onSave={editing ? handleSave : undefined}
            onCancel={editing ? cancelEdit : undefined}
            onDelete={!editing ? () => handleDelete(r) : undefined}
            confirmDelete={false}
            size="small"
          />
        );
      },
    },
  ];

  return (
    <Table
      className="op-table parts-table"
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={false}
      size="small"
    />
  );
}
