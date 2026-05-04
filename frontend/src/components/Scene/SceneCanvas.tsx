import { useEffect, useCallback, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Ground } from './Ground'
import { WaterSurface } from './WaterSurface'
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
import { DRAG_BUILDING_TYPE } from '../Toolbar/BuildingTools'
import { DRAG_CUSTOM_TEMPLATE, createBuildingsFromDragData } from '../Toolbar/CustomTemplateBar'
import { createBuilding } from '../../utils/buildings'
import { getTerrainHeightAt } from '../../utils/terrain'
import type { Building, BuildingType } from '../../types'

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

type ScreenToWorldFn = (screenX: number, screenY: number) => [number, number] | null

function DropInteraction({ onSetScreenToWorld }: { onSetScreenToWorld: (fn: ScreenToWorldFn) => void }) {
  const { camera, gl } = useThree()
  const tmpNdc = useRef(new THREE.Vector2())
  const tmpRaycaster = useRef(new THREE.Raycaster())
  const tmpHit = useRef(new THREE.Vector3())
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))

  const screenToWorld = useCallback(
    (screenX: number, screenY: number): [number, number] | null => {
      const rect = gl.domElement.getBoundingClientRect()
      tmpNdc.current.set(
        ((screenX - rect.left) / rect.width) * 2 - 1,
        -((screenY - rect.top) / rect.height) * 2 + 1,
      )
      tmpRaycaster.current.setFromCamera(tmpNdc.current, camera)
      if (tmpRaycaster.current.ray.intersectPlane(groundPlane.current, tmpHit.current)) {
        return [tmpHit.current.x, tmpHit.current.z]
      }
      return null
    },
    [camera, gl],
  )

  useEffect(() => {
    onSetScreenToWorld(screenToWorld)
  }, [screenToWorld, onSetScreenToWorld])

  return null
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
  const screenToWorldRef = useRef<ScreenToWorldFn | null>(null)

  const setScreenToWorld = useCallback((fn: ScreenToWorldFn) => {
    screenToWorldRef.current = fn
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_BUILDING_TYPE) || 
        e.dataTransfer.types.includes(DRAG_CUSTOM_TEMPLATE)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    const buildingType = e.dataTransfer.getData(DRAG_BUILDING_TYPE) as BuildingType
    const templateData = e.dataTransfer.getData(DRAG_CUSTOM_TEMPLATE)

    if (!buildingType && !templateData) return

    e.preventDefault()

    const screenToWorld = screenToWorldRef.current
    if (!screenToWorld) return

    const worldPos = screenToWorld(e.clientX, e.clientY)
    if (!worldPos) return

    const state = useStore.getState()
    const terrainHeight = getTerrainHeightAt(worldPos[0], worldPos[1], state.terrainData, state.canvasSize)

    if (buildingType) {
      const b = createBuilding(buildingType, worldPos)
      b.baseHeight = terrainHeight
      addBuilding(b)
    } else if (templateData) {
      try {
        const dragData = JSON.parse(templateData)
        const buildings = createBuildingsFromDragData(dragData, worldPos, terrainHeight)
        buildings.forEach(b => addBuilding(b))
      } catch (err) {
        console.error('Failed to parse template data:', err)
      }
    }
  }, [addBuilding])

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
        const terrainData = {
          ...model.terrain_data,
          heights: new Float32Array(model.terrain_data.heights),
        }
        if (model.terrain_data.waterMask) {
          terrainData.waterMask = new Uint8Array(model.terrain_data.waterMask)
        }
        state.setTerrainData(terrainData)
      } else {
        state.setTerrainData(null)
      }

      if (model.lake_data) {
        state.setLake(model.lake_data)
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
    <div 
      ref={containerRef} 
      style={{ flex: 1, position: 'relative' }} 
      tabIndex={-1}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        id="terrain-brush-indicator"
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: 1000,
          border: '2px solid rgba(255, 255, 255, 0.8)',
          borderRadius: '50%',
          boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(0, 0, 0, 0.1)',
          display: 'none',
        }}
      />
      {!isReadOnly && <FloatingEditor />}
      {!isReadOnly && <CanvasSettings />}

      <Canvas
        shadows
        camera={{ position: [0, 100, -130], fov: 50, near: 0.1, far: 3000 }}
        gl={{ antialias: true }}
      >
        <SkyBackground />
        <SunLight />
        <Ground
          onClick={isReadOnly ? undefined : (terrainEditor.enabled || measurementTool.enabled ? undefined : () => clearSelection())}
          terrainRef={terrainRef}
        />
        <WaterSurface />
        <BuildingGroup />
        {!isReadOnly && <SelectionBox start={boxSelectStart} end={boxSelectEnd} />}
        {!isReadOnly && <BoxSelectInteraction />}
        {!isReadOnly && <MeasurementInteraction />}
        {!isReadOnly && <MeasurementOverlay />}
        <Compass />
        <SunIndicator />
        <CameraControls />
        {!isReadOnly && terrainEditor.enabled && <TerrainEditor geometryRef={terrainRef} onHeightChange={handleTerrainHeightChange} />}
        {!isReadOnly && <DropInteraction onSetScreenToWorld={setScreenToWorld} />}
      </Canvas>
    </div>
  )
}
