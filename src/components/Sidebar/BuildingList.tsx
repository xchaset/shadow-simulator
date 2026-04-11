import { useStore } from '../../store/useStore'
import { BUILDING_PRESETS } from '../../utils/buildings'

export function BuildingList() {
  const buildings = useStore(s => s.buildings)
  const selectedId = useStore(s => s.selectedBuildingId)
  const selectBuilding = useStore(s => s.selectBuilding)

  if (buildings.length === 0) {
    return <div style={{ padding: 16, color: '#999', fontSize: 13 }}>点击工具栏添加建筑物</div>
  }

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      {buildings.map(b => (
        <div
          key={b.id}
          onClick={() => selectBuilding(b.id)}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: selectedId === b.id ? '#e6f4ff' : 'transparent',
            borderLeft: selectedId === b.id ? '3px solid #1677ff' : '3px solid transparent',
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 2, background: b.color, flexShrink: 0 }} />
          <span style={{ fontSize: 13 }}>{BUILDING_PRESETS[b.type]?.icon} {b.name}</span>
        </div>
      ))}
    </div>
  )
}
