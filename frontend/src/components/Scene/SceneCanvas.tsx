import { useEffect, useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Button, Tooltip } from 'antd'
import { BorderOutlined, BorderlessTableOutlined } from '@ant-design/icons'
import { Ground } from './Ground'
import { SunLight } from './SunLight'
import { SunIndicator } from './SunIndicator'
import { CameraControls } from './CameraControls'
import { Compass } from './Compass'
import { FloatingEditor } from './FloatingEditor'
import { BuildingGroup } from '../Buildings/BuildingGroup'
import { useSunPosition } from '../../hooks/useSunPosition'
import { useStore } from '../../store/useStore'
import type { Building } from '../../types'

/** 方向键每次移动的距离（米） */
const MOVE_STEP = 1
/** 粘贴时相对原位置的偏移量 */
const PASTE_OFFSET = 5

function SkyBackground() {
  const { isNight } = useSunPosition()
  return <color attach="background" args={[isNight ? '#1a1a2e' : '#87CEEB']} />
}

/** 剪贴板中存储的建筑快照 */
interface ClipboardBuilding {
  type: Building['type']
  params: Record<string, number>
  rotation: number
  color: string
  name: string
  position: [number, number]
}

export function SceneCanvas() {
  const selectBuilding = useStore(s => s.selectBuilding)
  const showGrid = useStore(s => s.showGrid)
  const setShowGrid = useStore(s => s.setShowGrid)
  const containerRef = useRef<HTMLDivElement>(null)
  const clipboardRef = useRef<ClipboardBuilding | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const { selectedBuildingId, buildings, updateBuilding, addBuilding } = useStore.getState()

    // Ctrl+C — 复制选中建筑
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      if (!selectedBuildingId) return
      const building = buildings.find(b => b.id === selectedBuildingId)
      if (!building) return
      clipboardRef.current = {
        type: building.type,
        params: { ...building.params },
        rotation: building.rotation,
        color: building.color,
        name: building.name,
        position: [...building.position],
      }
      return
    }

    // Ctrl+V — 粘贴建筑
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      const clip = clipboardRef.current
      if (!clip) return
      e.preventDefault()
      const newBuilding: Building = {
        id: `building-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: `${clip.name} 副本`,
        type: clip.type,
        params: { ...clip.params },
        position: [clip.position[0] + PASTE_OFFSET, clip.position[1] + PASTE_OFFSET],
        rotation: clip.rotation,
        color: clip.color,
      }
      addBuilding(newBuilding)
      // 选中新建筑，并更新剪贴板位置使连续粘贴不重叠
      useStore.getState().selectBuilding(newBuilding.id)
      clipboardRef.current = { ...clip, position: [...newBuilding.position] }
      return
    }

    // 方向键移动
    if (!selectedBuildingId) return
    const building = buildings.find(b => b.id === selectedBuildingId)
    if (!building) return

    let dx = 0
    let dz = 0

    switch (e.key) {
      case 'ArrowUp':
        dz = -MOVE_STEP
        break
      case 'ArrowDown':
        dz = MOVE_STEP
        break
      case 'ArrowLeft':
        dx = -MOVE_STEP
        break
      case 'ArrowRight':
        dx = MOVE_STEP
        break
      default:
        return // 非方向键不处理
    }

    e.preventDefault() // 阻止页面滚动
    updateBuilding(selectedBuildingId, {
      position: [building.position[0] + dx, building.position[1] + dz],
    })
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative' }} tabIndex={-1}>
      <FloatingEditor />
      {/* 网格显示/隐藏 */}
      <Tooltip title={showGrid ? '隐藏网格' : '显示网格'} placement="left">
        <Button
          type="text"
          size="small"
          icon={showGrid ? <BorderlessTableOutlined /> : <BorderOutlined />}
          onClick={() => setShowGrid(!showGrid)}
          style={{
            position: 'absolute',
            right: 12,
            top: 12,
            zIndex: 10,
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(4px)',
            borderRadius: 6,
            color: showGrid ? '#1677ff' : '#999',
          }}
        />
      </Tooltip>
      <Canvas
        shadows
        camera={{ position: [0, 100, -130], fov: 50 }}
      >
        <SkyBackground />
        <SunLight />
        <Ground onClick={() => selectBuilding(null)} />
        <BuildingGroup />
        <Compass />
        <SunIndicator />
        <CameraControls />
      </Canvas>
    </div>
  )
}
