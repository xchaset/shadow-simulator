import { useEffect, useState } from 'react'
import { Button, Radio, Space, Tooltip, Divider, List, Tag, Popconfirm, Input, ColorPicker, InputNumber, Select } from 'antd'
import {
  FontSizeOutlined,
  SwapOutlined,
  ArrowRightOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import type { AnnotationMode, AnnotationColor, Annotation } from '../../types'

const ANNOTATION_MODES: { mode: AnnotationMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'text', icon: <FontSizeOutlined />, label: '文字标签' },
  { mode: 'dimension', icon: <SwapOutlined />, label: '尺寸标注' },
  { mode: 'arrow', icon: <ArrowRightOutlined />, label: '箭头指示' },
]

const COLOR_OPTIONS: { color: AnnotationColor; label: string }[] = [
  { color: '#1677ff', label: '蓝色' },
  { color: '#52c41a', label: '绿色' },
  { color: '#fa8c16', label: '橙色' },
  { color: '#ff4d4f', label: '红色' },
  { color: '#722ed1', label: '紫色' },
  { color: '#13c2c2', label: '青色' },
]

export function AnnotationToolbar() {
  const annotationTool = useStore(s => s.annotationTool)
  const setAnnotationTool = useStore(s => s.setAnnotationTool)
  const addAnnotation = useStore(s => s.addAnnotation)
  const removeAnnotation = useStore(s => s.removeAnnotation)
  const clearAnnotations = useStore(s => s.clearAnnotations)
  const updateAnnotation = useStore(s => s.updateAnnotation)
  const selectAnnotation = useStore(s => s.selectAnnotation)

  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const handleModeChange = (mode: AnnotationMode) => {
    setAnnotationTool({ mode })
  }

  const handleColorChange = (color: string) => {
    setAnnotationTool({ color: color as AnnotationColor })
  }

  const handleFontSizeChange = (value: number | null) => {
    if (value !== null) {
      setAnnotationTool({ fontSize: value })
    }
  }

  const handleCloseTool = () => {
    setAnnotationTool({
      enabled: false,
      isDrawing: false,
      currentPosition: null,
      temporaryAnnotation: null,
    })
    selectAnnotation(null)
    setEditingAnnotationId(null)
  }

  const handleAddAnnotation = () => {
    const { mode, color, fontSize, currentPosition } = annotationTool
    
    if (!currentPosition) return

    const annotation: Annotation = {
      id: `annotation-${Date.now()}`,
      mode,
      position: currentPosition,
      yOffset: 2,
      rotation: 0,
      scale: 1,
      color,
      fontSize,
      text: mode === 'text' ? '新标签' : undefined,
      createdAt: new Date(),
    }

    addAnnotation(annotation)
  }

  const handleEditAnnotation = (annotation: Annotation) => {
    setEditingAnnotationId(annotation.id)
    setEditText(annotation.text || '')
  }

  const handleSaveEdit = () => {
    if (editingAnnotationId) {
      updateAnnotation(editingAnnotationId, { text: editText })
      setEditingAnnotationId(null)
      setEditText('')
    }
  }

  const handleCancelEdit = () => {
    setEditingAnnotationId(null)
    setEditText('')
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!annotationTool.enabled) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key.toLowerCase()) {
        case 't':
          handleModeChange('text')
          break
        case 'd':
          handleModeChange('dimension')
          break
        case 'r':
          handleModeChange('arrow')
          break
        case 'escape':
          e.preventDefault()
          if (editingAnnotationId) {
            handleCancelEdit()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [annotationTool.enabled, editingAnnotationId])

  const getAnnotationLabel = (annotation: Annotation) => {
    switch (annotation.mode) {
      case 'text':
        return annotation.text || '文字标签'
      case 'dimension':
        return '尺寸标注'
      case 'arrow':
        return '箭头指示'
      default:
        return '标注'
    }
  }

  const getModeTag = (mode: AnnotationMode) => {
    switch (mode) {
      case 'text':
        return { color: 'blue', text: '文字' }
      case 'dimension':
        return { color: 'green', text: '尺寸' }
      case 'arrow':
        return { color: 'orange', text: '箭头' }
      default:
        return { color: 'default', text: '标注' }
    }
  }

  return (
    <div
      style={{
        background: '#fff',
        borderTop: '1px solid #e8e8e8',
        padding: '12px 16px',
        maxHeight: 400,
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FontSizeOutlined style={{ fontSize: 18, color: '#1677ff' }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>标注工具</span>
        </div>
        <Button size="small" icon={<CloseOutlined />} onClick={handleCloseTool}>
          关闭
        </Button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>标注模式</div>
        <Radio.Group
          value={annotationTool.mode}
          onChange={e => handleModeChange(e.target.value)}
          buttonStyle="solid"
          size="small"
          style={{ display: 'flex', gap: 4 }}
        >
          {ANNOTATION_MODES.map(({ mode, icon, label }) => (
            <Tooltip key={mode} title={label}>
              <Radio.Button value={mode} style={{ padding: '4px 10px' }}>
                {icon}
              </Radio.Button>
            </Tooltip>
          ))}
        </Radio.Group>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>样式设置</div>
        <Space wrap size="small">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#999' }}>颜色:</span>
            <Select
              size="small"
              value={annotationTool.color}
              onChange={handleColorChange}
              style={{ width: 100 }}
              options={COLOR_OPTIONS.map(({ color, label }) => ({
                value: color,
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: color,
                      }}
                    />
                    <span>{label}</span>
                  </div>
                ),
              }))}
            />
          </div>
          {annotationTool.mode === 'text' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#999' }}>字体:</span>
              <InputNumber
                size="small"
                min={8}
                max={48}
                value={annotationTool.fontSize}
                onChange={handleFontSizeChange}
                style={{ width: 60 }}
              />
            </div>
          )}
        </Space>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {annotationTool.annotations.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#666' }}>标注列表 ({annotationTool.annotations.length})</span>
            <Popconfirm title="确定要清除所有标注吗？" onConfirm={clearAnnotations}>
              <Button size="small" danger icon={<DeleteOutlined />}>
                清除全部
              </Button>
            </Popconfirm>
          </div>
          <List
            size="small"
            dataSource={annotationTool.annotations}
            renderItem={annotation => {
              const modeTag = getModeTag(annotation.mode)
              const isEditing = editingAnnotationId === annotation.id
              const isSelected = annotationTool.selectedAnnotationId === annotation.id

              return (
                <List.Item
                  style={{
                    background: isSelected ? '#e6f7ff' : 'transparent',
                    borderRadius: 4,
                    padding: '4px 8px',
                    marginBottom: 2,
                  }}
                >
                  {isEditing ? (
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        size="small"
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onPressEnter={handleSaveEdit}
                        placeholder="输入文字"
                      />
                      <Button size="small" icon={<CheckOutlined />} onClick={handleSaveEdit} />
                      <Button size="small" icon={<CloseOutlined />} onClick={handleCancelEdit} />
                    </Space.Compact>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Space size="small">
                        <Tag color={modeTag.color}>{modeTag.text}</Tag>
                        <span
                          style={{
                            fontSize: 13,
                            color: '#333',
                            cursor: 'pointer',
                          }}
                          onClick={() => selectAnnotation(annotation.id)}
                        >
                          {getAnnotationLabel(annotation)}
                        </span>
                        <span style={{ fontSize: 11, color: '#999' }}>
                          {annotation.createdAt.toLocaleTimeString()}
                        </span>
                      </Space>
                      <Space size="small">
                        {annotation.mode === 'text' && (
                          <Button
                            size="small"
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => handleEditAnnotation(annotation)}
                          />
                        )}
                        <Popconfirm title="确定要删除此标注吗？" onConfirm={() => removeAnnotation(annotation.id)}>
                          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    </div>
                  )}
                </List.Item>
              )
            }}
          />
        </div>
      )}

      {annotationTool.annotations.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#999', fontSize: 12 }}>
          点击场景添加标注
        </div>
      )}

      <Divider style={{ margin: '8px 0' }} />
      <div style={{ fontSize: 12, color: '#999' }}>
        <div>操作说明:</div>
        <div>• 左键点击: 在场景中添加标注</div>
        <div>• T: 文字标签模式</div>
        <div>• D: 尺寸标注模式</div>
        <div>• R: 箭头指示模式</div>
        <div>• Esc: 取消编辑</div>
      </div>
    </div>
  )
}
