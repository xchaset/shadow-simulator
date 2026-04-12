import { useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { BUILDING_PRESETS } from '../../utils/buildings'
import { InputNumber, Slider, ColorPicker, Button } from 'antd'
import { DeleteOutlined, CloseOutlined } from '@ant-design/icons'

export function FloatingEditor() {
  const selectedId = useStore(s => s.selectedBuildingId)
  const buildings = useStore(s => s.buildings)
  const updateBuilding = useStore(s => s.updateBuilding)
  const removeBuilding = useStore(s => s.removeBuilding)
  const selectBuilding = useStore(s => s.selectBuilding)
  const editorOpen = useStore(s => s.editorOpen)
  const setEditorOpen = useStore(s => s.setEditorOpen)

  const building = buildings.find(b => b.id === selectedId)

  const handleParamChange = useCallback((key: string, value: number | null) => {
    if (!building || value === null) return
    updateBuilding(building.id, {
      params: { ...building.params, [key]: value },
    })
  }, [building, updateBuilding])

  const handleRotationChange = useCallback((v: number) => {
    if (building) updateBuilding(building.id, { rotation: v })
  }, [building, updateBuilding])

  const handleColorChange = useCallback((_: unknown, hex: string) => {
    if (building) updateBuilding(building.id, { color: hex })
  }, [building, updateBuilding])

  const handleDelete = useCallback(() => {
    if (building) removeBuilding(building.id)
  }, [building, removeBuilding])

  if (!building || !editorOpen) return null

  const preset = BUILDING_PRESETS[building.type]
  const paramEntries = Object.entries(preset.paramLabels)

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderRadius: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        padding: '12px 14px',
        width: 240,
        maxHeight: 'calc(100% - 24px)',
        overflowY: 'auto',
        fontSize: 13,
        userSelect: 'none',
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: '1px solid #eee',
      }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          {preset.icon} {building.name}
        </span>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={() => setEditorOpen(false)}
          style={{ color: '#999' }}
        />
      </div>

      {/* Parameters in 2-column grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: paramEntries.length > 2 ? '1fr 1fr' : '1fr',
        gap: '6px 8px',
        marginBottom: 10,
      }}>
        {paramEntries.map(([key, label]) => (
          <div key={key}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{label as string}</div>
            <InputNumber
              size="small"
              value={building.params[key]}
              min={key === 'segments' || key === 'sides' ? 3 : 0.1}
              step={key === 'trunkRadius' ? 0.1 : 1}
              onChange={(v) => handleParamChange(key, v)}
              style={{ width: '100%' }}
            />
          </div>
        ))}
      </div>

      {/* Rotation */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>
          旋转 {building.rotation}°
        </div>
        <Slider
          min={0}
          max={360}
          value={building.rotation}
          onChange={handleRotationChange}
          style={{ margin: '4px 0' }}
        />
      </div>

      {/* Color + Delete row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTop: '1px solid #eee',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#888' }}>颜色</span>
          <ColorPicker
            value={building.color}
            onChange={handleColorChange}
            size="small"
          />
        </div>
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={handleDelete}
        >
          删除
        </Button>
      </div>
    </div>
  )
}
