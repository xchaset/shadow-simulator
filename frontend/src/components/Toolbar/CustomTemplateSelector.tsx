import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { customTemplateApi } from '../../utils/api'
import type { CustomTemplate, TemplateBuilding, BuildingType } from '../../types'
import { Button, Modal, Card, Typography, Empty, Tabs, message, Popconfirm, Tooltip } from 'antd'
import { AppstoreOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
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
  baseHeight: number
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
    baseHeight: 0,
  }
}

interface TemplateCardProps {
  template: CustomTemplate
  onSelect: (template: CustomTemplate) => void
  onDelete: (template: CustomTemplate) => void
}

function TemplateCard({ template, onSelect, onDelete }: TemplateCardProps) {
  return (
    <Card
      hoverable
      size="small"
      style={{ width: 160, marginBottom: 8 }}
      onClick={() => onSelect(template)}
      bodyStyle={{ padding: '12px' }}
      actions={[
        <Tooltip title="删除模板">
          <Popconfirm
            title="确定删除此模板吗？"
            description="删除后无法恢复"
            onConfirm={(e) => {
              e?.stopPropagation()
              onDelete(template)
            }}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <DeleteOutlined style={{ color: '#ff4d4f' }} />
          </Popconfirm>
        </Tooltip>,
      ]}
    >
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>
          <BuildingIcon name={template.icon || 'custom'} />
        </div>
        <Text strong style={{ fontSize: 13 }}>{template.name}</Text>
      </div>
      <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center' }}>
        {template.description || '自定义模板'}
      </Text>
      <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center', marginTop: 4 }}>
        {template.buildings.length} 个建筑
      </Text>
    </Card>
  )
}

export function CustomTemplateSelector() {
  const addBuilding = useStore(s => s.addBuilding)
  const [modalOpen, setModalOpen] = useState(false)
  const [templates, setTemplates] = useState<CustomTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const data = await customTemplateApi.list()
      setTemplates(data)
    } catch (error) {
      console.error('Failed to load custom templates:', error)
      message.error('加载自定义模板失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (modalOpen) {
      loadTemplates()
    }
  }, [modalOpen])

  const handleSelectTemplate = (template: CustomTemplate) => {
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

    message.success(`已添加模板「${template.name}」`)
    setModalOpen(false)
  }

  const handleDeleteTemplate = async (template: CustomTemplate) => {
    setDeleting(true)
    try {
      await customTemplateApi.delete(template.id)
      message.success(`已删除模板「${template.name}」`)
      loadTemplates()
    } catch (error) {
      console.error('Failed to delete custom template:', error)
      message.error('删除模板失败')
    } finally {
      setDeleting(false)
    }
  }

  const templatesByCategory: Record<string, CustomTemplate[]> = {}
  for (const template of templates) {
    if (!templatesByCategory[template.category]) {
      templatesByCategory[template.category] = []
    }
    templatesByCategory[template.category].push(template)
  }
  const categories = Object.keys(templatesByCategory)

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
            onDelete={handleDeleteTemplate}
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
        自定义模板
      </Button>
      <Modal
        title="选择自定义模板"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={700}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            提示：选择多个模型后右键「合并并加入基础模型」可创建自定义模板
          </Text>
          <Button
            size="small"
            icon={<ReloadOutlined spin={loading} />}
            onClick={loadTemplates}
          >
            刷新
          </Button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Empty description="加载中..." />
          </div>
        ) : categories.length > 0 ? (
          <Tabs items={tabItems} />
        ) : (
          <Empty
            description={
              <div>
                <div style={{ marginBottom: 8 }}>暂无自定义模板</div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  在左侧模型列表中选择多个模型，右键菜单选择「合并并加入基础模型」即可创建
                </Text>
              </div>
            }
          />
        )}
      </Modal>
    </>
  )
}
