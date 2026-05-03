import { useState, useEffect, useCallback } from 'react'
import { Button, Tooltip, Modal, List, Popconfirm, Typography, Empty } from 'antd'
import { ReloadOutlined, AppstoreOutlined, DeleteOutlined, SettingOutlined, UpOutlined, DownOutlined } from '@ant-design/icons'
import { customTemplateApi } from '../../utils/api'
import { BuildingIcon } from '../BuildingIcon'
import type { CustomTemplate, TemplateBuilding, Building } from '../../types'
import { useStore } from '../../store/useStore'

const { Text } = Typography

export const DRAG_CUSTOM_TEMPLATE = 'application/x-shadow-simulator-custom-template'

interface DragTemplateData {
  id: string
  name: string
  buildings: TemplateBuilding[]
}

function createBuildingsFromTemplate(
  template: CustomTemplate,
  basePosition: [number, number],
  templateCounter: number,
): Building[] {
  return template.buildings.map((building, index) => {
    const buildingName = template.buildings.length === 1
      ? `${template.name} ${templateCounter}`
      : `${template.name} ${templateCounter} - ${index + 1}`
    
    return {
      id: `building-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: building.name || buildingName,
      type: building.type,
      params: { ...building.params },
      position: [
        basePosition[0] + building.position[0],
        basePosition[1] + building.position[1],
      ] as [number, number],
      rotation: building.rotation,
      color: building.color,
      baseHeight: building.baseHeight,
      glbUrl: building.glbUrl,
      glbScale: building.glbScale,
    }
  })
}

let templateCounter = 0

export function CustomTemplateBar() {
  const addBuilding = useStore(s => s.addBuilding)
  const customTemplates = useStore(s => s.customTemplates)
  const setCustomTemplates = useStore(s => s.setCustomTemplates)
  const customTemplateRefreshTrigger = useStore(s => s.customTemplateRefreshTrigger)
  
  const [loading, setLoading] = useState(false)
  const [manageModalOpen, setManageModalOpen] = useState(false)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const data = await customTemplateApi.list()
      setCustomTemplates(data)
    } catch (error) {
      console.error('Failed to load custom templates:', error)
    } finally {
      setLoading(false)
    }
  }, [setCustomTemplates])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates, customTemplateRefreshTrigger])

  const handleAddTemplate = (template: CustomTemplate) => {
    templateCounter++
    const offsetX = (Math.random() - 0.5) * 40
    const offsetZ = (Math.random() - 0.5) * 40
    const basePosition: [number, number] = [offsetX, offsetZ]

    const buildings = createBuildingsFromTemplate(template, basePosition, templateCounter)
    buildings.forEach(b => addBuilding(b))
  }

  const handleDragStart = (e: React.DragEvent, template: CustomTemplate) => {
    const dragData: DragTemplateData = {
      id: template.id,
      name: template.name,
      buildings: template.buildings,
    }
    e.dataTransfer.setData(DRAG_CUSTOM_TEMPLATE, JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await customTemplateApi.delete(templateId)
      setCustomTemplates(customTemplates.filter(t => t.id !== templateId))
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newTemplates = [...customTemplates]
    const temp = newTemplates[index]
    newTemplates[index] = newTemplates[index - 1]
    newTemplates[index - 1] = temp
    setCustomTemplates(newTemplates)
  }

  const handleMoveDown = (index: number) => {
    if (index >= customTemplates.length - 1) return
    const newTemplates = [...customTemplates]
    const temp = newTemplates[index]
    newTemplates[index] = newTemplates[index + 1]
    newTemplates[index + 1] = temp
    setCustomTemplates(newTemplates)
  }

  if (customTemplates.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Tooltip title="暂无自定义模板。选中画布中的建筑后，点击侧边栏「合并为自定义模型」可创建自定义模板。">
          <Button
            size="small"
            icon={<AppstoreOutlined />}
            onClick={loadTemplates}
            style={{ cursor: 'help' }}
          >
            自定义模板
          </Button>
        </Tooltip>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {customTemplates.map(template => (
          <Tooltip
            key={template.id}
            title={
              <div>
                <div><strong>{template.name}</strong></div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  {template.buildings.length} 栋建筑
                </div>
                {template.description && (
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    {template.description}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                  点击添加 | 拖拽到画布
                </div>
              </div>
            }
          >
            <Button
              size="small"
              onClick={() => handleAddTemplate(template)}
              draggable
              onDragStart={(e) => handleDragStart(e, template)}
              style={{ cursor: 'grab' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <BuildingIcon name={template.icon || 'custom'} />
                <span>{template.name}</span>
              </span>
            </Button>
          </Tooltip>
        ))}
        <Tooltip title="管理自定义模板（删除、调整顺序）">
          <Button
            size="small"
            icon={<SettingOutlined />}
            onClick={() => setManageModalOpen(true)}
          />
        </Tooltip>
        <Tooltip title="刷新自定义模板列表">
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={loadTemplates}
            loading={loading}
          />
        </Tooltip>
      </div>

      <Modal
        title="管理自定义模型"
        open={manageModalOpen}
        onCancel={() => setManageModalOpen(false)}
        footer={null}
        width={500}
      >
        {customTemplates.length === 0 ? (
          <Empty description="暂无自定义模型" />
        ) : (
          <List
            dataSource={customTemplates}
            renderItem={(template, index) => (
              <List.Item
                actions={[
                  <Button
                    key="up"
                    size="small"
                    icon={<UpOutlined />}
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                  />,
                  <Button
                    key="down"
                    size="small"
                    icon={<DownOutlined />}
                    disabled={index >= customTemplates.length - 1}
                    onClick={() => handleMoveDown(index)}
                  />,
                  <Popconfirm
                    key="delete"
                    title="确定删除此模型？"
                    description="删除后无法恢复"
                    onConfirm={() => handleDeleteTemplate(template.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f0f0f0',
                      borderRadius: 4,
                      fontSize: 18,
                    }}>
                      <BuildingIcon name={template.icon || 'custom'} />
                    </div>
                  }
                  title={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text strong>{template.name}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ({template.buildings.length} 栋建筑)
                      </Text>
                    </span>
                  }
                  description={
                    <div>
                      {template.description && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {template.description}
                        </Text>
                      )}
                      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                        建筑：{template.buildings.map(b => b.name || b.type).join('、')}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </>
  )
}

export function createBuildingsFromDragData(
  dragData: DragTemplateData,
  basePosition: [number, number],
  terrainHeight: number = 0,
): Building[] {
  templateCounter++
  return dragData.buildings.map((building, index) => {
    const buildingName = dragData.buildings.length === 1
      ? `${dragData.name} ${templateCounter}`
      : `${dragData.name} ${templateCounter} - ${index + 1}`
    
    return {
      id: `building-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: building.name || buildingName,
      type: building.type,
      params: { ...building.params },
      position: [
        basePosition[0] + building.position[0],
        basePosition[1] + building.position[1],
      ] as [number, number],
      rotation: building.rotation,
      color: building.color,
      baseHeight: terrainHeight,
      glbUrl: building.glbUrl,
      glbScale: building.glbScale,
    }
  })
}
