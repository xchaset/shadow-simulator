import { useEffect, useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Ground } from './Ground'
import { SunLight } from './SunLight'
import { SunIndicator } from './SunIndicator'
import { CameraControls } from './CameraControls'
import { Compass } from './Compass'
import { FloatingEditor } from './FloatingEditor'
import { BuildingGroup } from '../Buildings/BuildingGroup'
import { SelectionBox } from '../Selection/SelectionBox'
import { BoxSelectInteraction } from '../Selection/BoxSelectInteraction'
import { CanvasSettings } from './CanvasSettings'
import { TerrainEditor } from '../Terrain/TerrainEditor'
import { MeasurementInteraction, MeasurementOverlay } from '../Measurement'
import { useSunPosition } from '../../hooks/useSunPosition'
import { useStore } from '../../store/useStore'
import { modelApi, recentModelApi } from '../../utils/api'
import { loadState, saveState } from '../../utils/storage'
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
  glbUrl?: string
  glbScale?: number
}

export function SceneCanvas() {
  const selectBuilding = useStore(s => s.selectBuilding)
  const clearSelection = useStore(s => s.clearSelection)
  const removeBuildings = useStore(s => s.removeBuildings)
  const addBuilding = useStore(s => s.addBuilding)
  const boxSelectStart = useStore(s => s.boxSelectStart)
  const boxSelectEnd = useStore(s => s.boxSelectEnd)
  const terrainEditor = useStore(s => s.terrainEditor)
  const measurementTool = useStore(s => s.measurementTool)
  const setTerrainData = useStore(s => s.setTerrainData)
  const containerRef = useRef<HTMLDivElement>(null)
  const clipboardRef = useRef<ClipboardBuilding[] | null>(null)
  const terrainRef = useRef<any>(null)

  const handleTerrainHeightChange = useCallback(() => {
    useStore.getState().setDirty(true)
  }, [])

  const handleTerrainReset = useCallback(() => {
    setTerrainData(null)
    handleTerrainHeightChange()
  }, [setTerrainData, handleTerrainHeightChange])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const { selectedBuildingId, selectedBuildingIds, buildings, updateBuilding, shareMode } = useStore.getState()

    if (shareMode.isReadOnly) {
      return
    }

    // 确定操作的建筑物 IDs（多选优先，否则单选）
    const activeIds = selectedBuildingIds.length > 0 ? selectedBuildingIds : (selectedBuildingId ? [selectedBuildingId] : [])

    // Delete/Backspace — 删除选中的建筑物
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (activeIds.length === 0) return
      e.preventDefault()
      removeBuildings(activeIds)
      return
    }

    // Ctrl+C — 复制选中的建筑物
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      if (activeIds.length === 0) return
      const selectedBuildings = buildings.filter(b => activeIds.includes(b.id))
      clipboardRef.current = selectedBuildings.map(b => ({
        type: b.type,
        params: { ...b.params },
        rotation: b.rotation,
        color: b.color,
        name: b.name,
        position: [...b.position],
        glbUrl: b.glbUrl,
        glbScale: b.glbScale,
      }))
      return
    }

    // Ctrl+V — 粘贴建筑物
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      const clip = clipboardRef.current
      if (!clip || clip.length === 0) return
      e.preventDefault()

      const newIds: string[] = []
      clip.forEach((clipItem, index) => {
        const newBuilding: Building = {
          id: `building-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: `${clipItem.name} 副本`,
          type: clipItem.type,
          params: { ...clipItem.params },
          position: [clipItem.position[0] + PASTE_OFFSET + index * 2, clipItem.position[1] + PASTE_OFFSET + index * 2],
          rotation: clipItem.rotation,
          color: clipItem.color,
          glbUrl: clipItem.glbUrl,
          glbScale: clipItem.glbScale,
        }
        addBuilding(newBuilding)
        newIds.push(newBuilding.id)
      })

      // 选中新粘贴的建筑物
      useStore.getState().selectBuildings(newIds)
      // 更新剪贴板以便连续粘贴
      clipboardRef.current = clip.map((c, i) => ({
        ...c,
        position: [c.position[0] + PASTE_OFFSET, c.position[1] + PASTE_OFFSET],
      }))
      return
    }

    // 方向键移动
    if (activeIds.length === 0) return

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
    activeIds.forEach(id => {
      const building = buildings.find(b => b.id === id)
      if (!building) return
      updateBuilding(id, {
        position: [building.position[0] + dx, building.position[1] + dz],
      })
    })
  }, [addBuilding, removeBuildings])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // 自动加载上次打开的模型
  useEffect(() => {
    const { lastModelId } = loadState()
    if (!lastModelId) return

    let cancelled = false
    modelApi.get(lastModelId).then(model => {
      if (cancelled) return
      const state = useStore.getState()

      state.setBuildings(model.scene_data || [])
      state.setLocation({ lat: model.location_lat, lng: model.location_lng, cityName: model.city_name })
      if (model.date_time) state.setDateTime(new Date(model.date_time))
      if (model.canvas_size !== undefined) state.setCanvasSize(model.canvas_size)
      if (model.show_grid !== undefined) state.setShowGrid(model.show_grid)
      if (model.grid_divisions !== undefined) state.setGridDivisions(model.grid_divisions)

      if (model.terrain_data) {
        state.setTerrainData({
          ...model.terrain_data,
          heights: new Float32Array(model.terrain_data.heights),
        })
      } else {
        state.setTerrainData(null)
      }

      state.setCurrentModelId(model.id)
      state.setCurrentDirectoryId(model.directory_id)
      state.setDirty(false)
      // 记录打开
      recentModelApi.record(model.id).catch(() => {})
      saveState({ lastModelId: model.id })
    }).catch(() => {
      recentModelApi.remove(lastModelId).catch(() => {})
    })

    return () => { cancelled = true }
  }, [])

  const shareMode = useStore(s => s.shareMode)
  const isReadOnly = shareMode.isReadOnly

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative' }} tabIndex={-1}>
      {!isReadOnly && <FloatingEditor />}
      {!isReadOnly && <CanvasSettings />}

      <Canvas
        shadows
        camera={{ position: [0, 100, -130], fov: 50, near: 0.1, far: 3000 }}
      >
        <SkyBackground />
        <SunLight />
        <Ground
          onClick={isReadOnly ? undefined : (terrainEditor.enabled || measurementTool.enabled ? undefined : () => clearSelection())}
          terrainRef={terrainRef}
        />
        <BuildingGroup />
        {!isReadOnly && <SelectionBox start={boxSelectStart} end={boxSelectEnd} />}
        {!isReadOnly && <BoxSelectInteraction />}
        {!isReadOnly && <MeasurementInteraction />}
        {!isReadOnly && <MeasurementOverlay />}
        <Compass />
        <SunIndicator />
        <CameraControls />
        {!isReadOnly && terrainEditor.enabled && <TerrainEditor geometryRef={terrainRef} onHeightChange={handleTerrainHeightChange} />}
      </Canvas>
    </div>
  )
}
