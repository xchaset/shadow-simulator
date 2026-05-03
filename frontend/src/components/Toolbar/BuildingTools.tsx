import { BUILDING_PRESETS, createBuilding } from '../../utils/buildings'
import { useStore } from '../../store/useStore'
import type { BuildingType } from '../../types'
import { Button, Tooltip } from 'antd'
import { BuildingIcon } from '../BuildingIcon'

// GLB 类型不在快捷工具栏显示（需要通过 GlbImporter 上传文件）
const EXCLUDED_TYPES: BuildingType[] = ['glb']

export const DRAG_BUILDING_TYPE = 'application/x-shadow-simulator-building-type'

export function BuildingTools() {
  const addBuilding = useStore(s => s.addBuilding)

  const handleAdd = (type: BuildingType) => {
    // Place at a slightly random position to avoid stacking
    const offset = (Math.random() - 0.5) * 40
    const b = createBuilding(type, [offset, offset])
    addBuilding(b)
  }

  const handleDragStart = (e: React.DragEvent, type: BuildingType) => {
    e.dataTransfer.setData(DRAG_BUILDING_TYPE, type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {(Object.entries(BUILDING_PRESETS) as [BuildingType, any][])
        .filter(([type]) => !EXCLUDED_TYPES.includes(type))
        .map(([type, preset]) => (
          <Tooltip key={type} title={`${preset.label}（点击或拖拽到画布）`}>
            <Button
              size="small"
              onClick={() => handleAdd(type)}
              draggable
              onDragStart={(e) => handleDragStart(e, type)}
              style={{ cursor: 'grab' }}
            >
              <BuildingIcon name={preset.icon} />
            </Button>
          </Tooltip>
        ))}
    </div>
  )
}
