import React from "react"
import { Card, Drawer, Space, Typography } from "antd"

export default function KpiHelpDrawer({
  open,
  onClose,
  title,
  intro,
  sections = [],
}) {
  return (
    <Drawer
      title={title}
      placement="right"
      width={460}
      open={open}
      onClose={onClose}
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {intro ? (
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            {intro}
          </Typography.Paragraph>
        ) : null}

        {sections.map((section) => (
          <Card
            key={section.title}
            size="small"
            title={section.title}
            bodyStyle={{ paddingTop: 12, paddingBottom: 12 }}
          >
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {section.body}
            </Typography.Paragraph>
          </Card>
        ))}
      </Space>
    </Drawer>
  )
}
