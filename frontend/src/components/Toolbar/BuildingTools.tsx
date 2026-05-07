import { useState } from 'react'
import { BUILDING_PRESETS, createBuilding } from '../../utils/buildings'
import { useStore } from '../../store/useStore'
import type { BuildingType } from '../../types'
import { Button, Tooltip, Tag } from 'antd'
import { BuildingIcon } from '../BuildingIcon'

// GLB 类型不在快捷工具栏显示（需要通过 GlbImporter 上传文件）
const EXCLUDED_TYPES: BuildingType[] = ['glb']

export const DRAG_BUILDING_TYPE = 'application/x-shadow-simulator-building-type'

// 模型分组配置
const MODEL_GROUPS = [
  {
    key: 'building',
    label: '建筑类',
    icon: 'box',
    types: [
      'box', 'cylinder', 'prism', 'l-shape', 'u-shape', 't-shape',
      'stepped', 'podium-tower', 'dome', 'gable-roof', 'gymnasium'
    ] as BuildingType[]
  },
  {
    key: 'bridge',
    label: '桥梁类',
    icon: 'girder-bridge',
    types: [
      'girder-bridge', 'arch-bridge', 'suspension-bridge', 'cable-stayed-bridge'
    ] as BuildingType[]
  },
  {
    key: 'sports',
    label: '体育设施',
    icon: 'basketball-court',
    types: [
      'basketball-court', 'football-field', 'tennis-court'
    ] as BuildingType[]
  },
  {
    key: 'vehicle',
    label: '车辆',
    icon: 'car',
    types: [
      'car', 'suv', 'van', 'truck', 'bus', 'city-bus', 'train'
    ] as BuildingType[]
  },
  {
    key: 'ship',
    label: '船舶',
    icon: 'cargo-ship',
    types: [
      'cargo-ship', 'container-ship', 'cruise-ship', 'pleasure-boat'
    ] as BuildingType[]
  },
  {
    key: 'landscape',
    label: '绿化绿植',
    icon: 'tree',
    types: [
      'road', 'green-belt', 'tree'
    ] as BuildingType[]
  },
  {
    key: 'traffic',
    label: '交通设施',
    icon: 'traffic-light',
    types: [
      'traffic-light', 'street-sign', 'street-lamp'
    ] as BuildingType[]
  }
]

export function BuildingTools() {
  const addBuilding = useStore(s => s.addBuilding)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)

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

  const handleGroupClick = (groupKey: string) => {
    setActiveGroup(activeGroup === groupKey ? null : groupKey)
  }

  const getActiveGroupModels = () => {
    const group = MODEL_GROUPS.find(g => g.key === activeGroup)
    if (!group) return []
    return group.types
      .filter(type => !EXCLUDED_TYPES.includes(type))
      .map(type => ({
        type,
        preset: BUILDING_PRESETS[type]
      }))
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* 分组标签和展开的模型列表 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {MODEL_GROUPS.map(group => {
          const isActive = activeGroup === group.key
          const groupModels = group.types
            .filter(type => !EXCLUDED_TYPES.includes(type))
            .map(type => ({
              type,
              preset: BUILDING_PRESETS[type]
            }))

          return (
            <div
              key={group.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              {/* 分组标签 */}
              <Tooltip title={`点击展开${group.label}模型`}>
                <Tag
                  color={isActive ? 'blue' : 'default'}
                  style={{
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: isActive ? '1px solid #1890ff' : '1px solid #d9d9d9',
                    background: isActive ? '#e6f7ff' : '#fff',
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                  }}
                  onClick={() => handleGroupClick(group.key)}
                >
                  <span style={{ marginRight: 4 }}>
                    <BuildingIcon name={group.icon} />
                  </span>
                  {group.label}
                </Tag>
              </Tooltip>

              {/* 展开的模型列表 - 紧跟在分组标签后面 */}
              {isActive && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    background: '#fafafa',
                    borderRadius: 4,
                    border: '1px solid #e8e8e8',
                    animation: 'slideIn 0.2s ease-out',
                    marginLeft: 4
                  }}
                >
                  {groupModels.map(({ type, preset }) => (
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
              )}
            </div>
          )
        })}
      </div>

      {/* 样式 */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
