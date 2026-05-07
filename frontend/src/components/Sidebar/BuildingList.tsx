import { useState, useRef, useEffect } from 'react'
import { Button, Input, Modal, Form, message } from 'antd'
import { EditOutlined, SaveOutlined, AppstoreOutlined } from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import { BUILDING_PRESETS } from '../../utils/buildings'
import { BuildingIcon } from '../BuildingIcon'
import { customTemplateApi } from '../../utils/api'
import type { Building, TemplateBuilding } from '../../types'

interface Props {
  editingId: string | null
  onEdit: (id: string) => void
}

interface SaveTemplateForm {
  name: string
  description: string
  category: string
}

function computeRelativePositions(buildings: Building[]): TemplateBuilding[] {
  if (buildings.length === 0) return []
  
  const baseX = buildings[0].position[0]
  const baseZ = buildings[0].position[1]
  
  return buildings.map(b => ({
    type: b.type,
    params: { ...b.params },
    position: [
      b.position[0] - baseX,
      b.position[1] - baseZ,
    ] as [number, number],
    rotation: b.rotation,
    color: b.color,
    name: b.name,
    baseHeight: b.baseHeight,
    glbUrl: b.glbUrl,
    glbScale: b.glbScale,
  }))
}

export function BuildingList({ editingId, onEdit }: Props) {
  const buildings = useStore(s => s.buildings)
  const selectedId = useStore(s => s.selectedBuildingId)
  const selectedBuildingIds = useStore(s => s.selectedBuildingIds)
  const selectBuilding = useStore(s => s.selectBuilding)
  const toggleBuildingSelection = useStore(s => s.toggleBuildingSelection)
  const renameBuilding = useStore(s => s.renameBuilding)
  const triggerCustomTemplateRefresh = useStore(s => s.triggerCustomTemplateRefresh)
  
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const inputRef = useRef<any>(null)
  
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveForm] = Form.useForm<SaveTemplateForm>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [renamingId])

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
  }

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      renameBuilding(renamingId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRename()
    } else if (e.key === 'Escape') {
      cancelRename()
    }
  }

  const handleClick = (e: React.MouseEvent, id: string) => {
    if (e.ctrlKey || e.metaKey) {
      toggleBuildingSelection(id)
    } else {
      selectBuilding(id)
    }
  }

  const handleOpenSaveModal = () => {
    if (selectedBuildingIds.length === 0) {
      message.warning('请先选中至少一个建筑')
      return
    }
    setSaveModalOpen(true)
  }

  const handleSaveTemplate = async () => {
    try {
      const values = await saveForm.validateFields()
      setSaving(true)

      const selectedBuildings = buildings.filter(b => selectedBuildingIds.includes(b.id))
      const templateBuildings = computeRelativePositions(selectedBuildings)

      await customTemplateApi.create({
        name: values.name,
        description: values.description || '',
        category: values.category || '自定义模板',
        icon: 'custom',
        source_model_ids: [],
        buildings: templateBuildings,
        sort_order: 0,
      })

      message.success(`已成功合并为自定义模型「${values.name}」，已添加到顶部工具栏`)
      triggerCustomTemplateRefresh()
      setSaveModalOpen(false)
      saveForm.resetFields()
    } catch (err: any) {
      message.error('合并失败: ' + (err.message || '未知错误'))
    } finally {
      setSaving(false)
    }
  }

  const isSelected = (id: string) => {
    return selectedBuildingIds.includes(id) || selectedId === id
  }

  if (buildings.length === 0) {
    return <div style={{ padding: 16, color: '#999', fontSize: 13 }}>点击工具栏添加建筑物</div>
  }

  const hasSelection = selectedBuildingIds.length > 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {hasSelection && (
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid #e8e8e8',
          background: '#fafafa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: '#666' }}>
            已选中 {selectedBuildingIds.length} 个建筑
          </span>
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            onClick={handleOpenSaveModal}
          >
            合并为自定义模型
          </Button>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {buildings.map(b => (
          <div
            key={b.id}
            onClick={(e) => handleClick(e, b.id)}
            onDoubleClick={() => startRename(b.id, b.name)}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: isSelected(b.id) ? '#e6f4ff' : 'transparent',
              borderLeft: isSelected(b.id) ? '3px solid #1677ff' : '3px solid transparent',
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 2, background: b.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
              <BuildingIcon name={BUILDING_PRESETS[b.type]?.icon} /> 
              {renamingId === b.id ? (
                <Input
                  ref={inputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleKeyDown}
                  size="small"
                  style={{ width: '100%' }}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                />
              ) : (
                b.name
              )}
            </span>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              style={{
                flexShrink: 0,
                color: editingId === b.id ? '#1677ff' : '#bbb',
              }}
              onClick={(e) => {
                e.stopPropagation()
                onEdit(b.id)
              }}
            />
          </div>
        ))}
      </div>

      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid #e8e8e8',
        fontSize: 11,
        color: '#999',
      }}>
        提示：按住 Ctrl/Cmd 点击可多选建筑
      </div>

      <Modal
        title={<span><AppstoreOutlined /> 合并为自定义模型</span>}
        open={saveModalOpen}
        onCancel={() => {
          setSaveModalOpen(false)
          saveForm.resetFields()
        }}
        onOk={handleSaveTemplate}
        confirmLoading={saving}
        okText="合并"
        cancelText="取消"
      >
        <Form form={saveForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="模型名称"
            rules={[{ required: true, message: '请输入模型名称' }]}
          >
            <Input placeholder="例如：建筑群组合" />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
            initialValue="自定义模板"
            rules={[{ required: true, message: '请输入分类' }]}
          >
            <Input placeholder="例如：自定义模板、建筑群" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="可选，描述此模型的用途" rows={3} />
          </Form.Item>
          <div style={{
            padding: '12px 16px',
            background: '#f6f8fa',
            borderRadius: 8,
            fontSize: 12,
            color: '#666',
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              已选中 {selectedBuildingIds.length} 个建筑
            </div>
            <div style={{ maxHeight: 120, overflow: 'auto' }}>
              {buildings
                .filter(b => selectedBuildingIds.includes(b.id))
                .map((b, i) => (
                  <div key={b.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '2px 0',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, background: b.color, borderRadius: 2 }} />
                      <span>{b.name}</span>
                    </span>
                    <span style={{ color: '#999' }}>
                      位置: ({b.position[0].toFixed(0)}, {b.position[1].toFixed(0)})
                    </span>
                  </div>
                ))}
            </div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e8e8e8', color: '#888' }}>
              <div>• 建筑的位置、高度、旋转、颜色等属性将被保留</div>
              <div>• 合并后将作为自定义模型显示在顶部工具栏</div>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
