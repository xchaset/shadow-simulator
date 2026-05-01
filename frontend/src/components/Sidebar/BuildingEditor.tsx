import { useCallback } from 'react'
import { useStore } from '../../store/useStore'
import { BUILDING_PRESETS } from '../../utils/buildings'
import { InputNumber, Slider, Button, ColorPicker, Tag } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { BuildingIcon } from '../BuildingIcon'

interface Props {
  editingId: string
}

export function BuildingEditor({ editingId }: Props) {
  const buildings = useStore(s => s.buildings)
  const updateBuilding = useStore(s => s.updateBuilding)
  const removeBuilding = useStore(s => s.removeBuilding)

  const building = buildings.find(b => b.id === editingId)

  const handleRotationChange = useCallback((v: number) => {
    if (building) updateBuilding(building.id, { rotation: v })
  }, [building?.id, updateBuilding])

  const handleColorChange = useCallback((_: unknown, hex: string) => {
    if (building) updateBuilding(building.id, { color: hex })
  }, [building?.id, updateBuilding])

  const handleDelete = useCallback(() => {
    if (building) removeBuilding(building.id)
  }, [building?.id, removeBuilding])

  if (!building) {
    return <div style={{ padding: 16, color: '#999', fontSize: 13 }}>选择一个建筑物进行编辑</div>
  }

  const preset = BUILDING_PRESETS[building.type]
  const isGlb = building.type === 'glb'

  const handleParamChange = (key: string, value: number | null) => {
    if (value === null) return
    const updates: Partial<typeof building> = {
      params: { ...building.params, [key]: value },
    }
    // GLB 模型的 scale 参数同步到 glbScale
    if (isGlb && key === 'scale') {
      updates.glbScale = value
    }
    updateBuilding(building.id, updates)
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <BuildingIcon name={preset?.icon || 'FileOutlined'} /> {building.name}
        {isGlb && <Tag color="blue" style={{ marginLeft: 4 }}>GLB</Tag>}
      </div>

      {/* GLB 模型信息 */}
      {isGlb && building.glbUrl && (
        <div style={{
          marginBottom: 12,
          padding: 8,
          background: '#f6f8fa',
          borderRadius: 6,
          fontSize: 12,
          color: '#666',
          wordBreak: 'break-all',
        }}>
          📦 {building.glbUrl.split('/').pop()}
        </div>
      )}

      {/* Parameters */}
      {preset && Object.entries(preset.paramLabels).map(([key, label]) => (
        <div key={key} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>{label}</div>
          {isGlb && key === 'scale' ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Slider
                min={0.01}
                max={10}
                step={0.01}
                value={building.params[key] ?? 1}
                onChange={(v) => handleParamChange(key, v)}
                style={{ flex: 1 }}
              />
              <InputNumber
                size="small"
                value={building.params[key] ?? 1}
                min={0.01}
                max={100}
                step={0.1}
                onChange={(v) => handleParamChange(key, v)}
                style={{ width: 70 }}
              />
            </div>
          ) : (
            <InputNumber
              size="small"
              value={building.params[key]}
              min={1}
              onChange={(v) => handleParamChange(key, v)}
              style={{ width: '100%' }}
            />
          )}
        </div>
      ))}

      {/* Rotation */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>旋转角度: {building.rotation}°</div>
        <Slider
          min={0}
          max={360}
          value={building.rotation}
          onChange={handleRotationChange}
        />
      </div>

      {/* Color (hide for GLB since it uses its own materials) */}
      {!isGlb && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>颜色</div>
          <ColorPicker
            value={building.color}
            onChange={handleColorChange}
            size="small"
          />
        </div>
      )}

      {/* Delete */}
      <Button
        danger
        size="small"
        icon={<DeleteOutlined />}
        onClick={handleDelete}
        block
      >
        删除建筑
      </Button>
    </div>
  )
}
