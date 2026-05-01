import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { getTemplatesByCategory } from '../../utils/templates'
import type { BuildingTemplate, TemplateBuilding, BuildingType } from '../../types'
import { Button, Modal, Card, Typography, Empty, Tabs } from 'antd'
import { AppstoreOutlined } from '@ant-design/icons'
import { BuildingIcon } from '../BuildingIcon'

const { Text } = Typography

let templateCounter = 0

function createBuildingFromTemplate(
  template: TemplateBuilding,
  basePosition: [number, number],
  name: string,
): {
  id: string
  name: string
  type: BuildingType
  params: Record<string, number>
  position: [number, number]
  rotation: number
  color: string
} {
  return {
    id: `building-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    type: template.type as BuildingType,
    params: { ...template.params },
    position: [
      basePosition[0] + template.position[0],
      basePosition[1] + template.position[1],
    ],
    rotation: template.rotation,
    color: template.color,
  }
}

interface TemplateCardProps {
  template: BuildingTemplate
  onSelect: (template: BuildingTemplate) => void
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <Card
      hoverable
      size="small"
      style={{ width: 160, marginBottom: 8 }}
      onClick={() => onSelect(template)}
      bodyStyle={{ padding: '12px' }}
    >
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>
          <BuildingIcon name={template.icon} />
        </div>
        <Text strong style={{ fontSize: 13 }}>{template.name}</Text>
      </div>
      <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center' }}>
        {template.description}
      </Text>
      <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center', marginTop: 4 }}>
        {template.buildings.length} 个建筑
      </Text>
    </Card>
  )
}

export function TemplateSelector() {
  const addBuilding = useStore(s => s.addBuilding)
  const [modalOpen, setModalOpen] = useState(false)

  const templatesByCategory = getTemplatesByCategory()
  const categories = Object.keys(templatesByCategory)

  const handleSelectTemplate = (template: BuildingTemplate) => {
    templateCounter++
    const offsetX = (Math.random() - 0.5) * 40
    const offsetZ = (Math.random() - 0.5) * 40
    const basePosition: [number, number] = [offsetX, offsetZ]

    template.buildings.forEach((building, index) => {
      const buildingName = template.buildings.length === 1
        ? `${template.name} ${templateCounter}`
        : `${template.name} ${templateCounter} - ${index + 1}`
      const newBuilding = createBuildingFromTemplate(building, basePosition, buildingName)
      addBuilding(newBuilding)
    })

    setModalOpen(false)
  }

  const tabItems = categories.map(category => ({
    key: category,
    label: category,
    children: (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: '16px 0' }}>
        {templatesByCategory[category].map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={handleSelectTemplate}
          />
        ))}
      </div>
    ),
  }))

  return (
    <>
      <Button
        size="small"
        icon={<AppstoreOutlined />}
        onClick={() => setModalOpen(true)}
        style={{ flexShrink: 0 }}
      >
        预设模版
      </Button>
      <Modal
        title="选择预设模版"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={700}
      >
        {categories.length > 0 ? (
          <Tabs items={tabItems} />
        ) : (
          <Empty description="暂无预设模版" />
        )}
      </Modal>
    </>
  )
}
