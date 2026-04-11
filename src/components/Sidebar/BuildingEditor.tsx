import { useStore } from '../../store/useStore'
import { BUILDING_PRESETS } from '../../utils/buildings'
import { InputNumber, Slider, Button, ColorPicker } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'

export function BuildingEditor() {
  const selectedId = useStore(s => s.selectedBuildingId)
  const buildings = useStore(s => s.buildings)
  const updateBuilding = useStore(s => s.updateBuilding)
  const removeBuilding = useStore(s => s.removeBuilding)

  const building = buildings.find(b => b.id === selectedId)
  if (!building) {
    return <div style={{ padding: 16, color: '#999', fontSize: 13 }}>选择一个建筑物进行编辑</div>
  }

  const preset = BUILDING_PRESETS[building.type]

  const handleParamChange = (key: string, value: number | null) => {
    if (value === null) return
    updateBuilding(building.id, {
      params: { ...building.params, [key]: value },
    })
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
        {preset.icon} {building.name}
      </div>

      {/* Parameters */}
      {Object.entries(preset.paramLabels).map(([key, label]) => (
        <div key={key} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>{label}</div>
          <InputNumber
            size="small"
            value={building.params[key]}
            min={1}
            onChange={(v) => handleParamChange(key, v)}
            style={{ width: '100%' }}
          />
        </div>
      ))}

      {/* Rotation */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>旋转角度: {building.rotation}°</div>
        <Slider
          min={0}
          max={360}
          value={building.rotation}
          onChange={(v) => updateBuilding(building.id, { rotation: v })}
        />
      </div>

      {/* Color */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>颜色</div>
        <ColorPicker
          value={building.color}
          onChange={(_, hex) => updateBuilding(building.id, { color: hex })}
          size="small"
        />
      </div>

      {/* Delete */}
      <Button
        danger
        size="small"
        icon={<DeleteOutlined />}
        onClick={() => removeBuilding(building.id)}
        block
      >
        删除建筑
      </Button>
    </div>
  )
}
