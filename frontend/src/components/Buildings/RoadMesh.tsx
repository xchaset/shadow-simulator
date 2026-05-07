import { useRef, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { ThreeEvent } from '@react-three/fiber'
import { useStore } from '../../store/useStore'
import { createCurvedRoadGeometries } from './BuildingFactory'
import type { Building } from '../../types'

interface Props {
  building: Building
}

export function RoadMesh({ building }: Props) {
  const groupRef = useRef<THREE.Group>(null)

  const isSelected = useStore(s => s.selectedBuildingId === building.id)
  const isMultiSelected = useStore(s => s.selectedBuildingIds.includes(building.id))
  const isSelectedVisual = isSelected || isMultiSelected

  const selectBuilding = useStore(s => s.selectBuilding)
  const toggleBuildingSelection = useStore(s => s.toggleBuildingSelection)
  const setEditorOpen = useStore(s => s.setEditorOpen)
  const terrainData = useStore(s => s.terrainData)
  const canvasSize = useStore(s => s.canvasSize)

  const geometries = useMemo(() => {
    // 获取道路参数
    const roadWidth = building.params.width || 12
    const roadThickness = building.params.thickness || 0.15
    const roadSegments = building.params.segments || 48
    const roadLength = building.params.length || 80

    // 准备路径点
    let pathPoints: Array<{ x: number; z: number }>
    let segments: number

    if (building.roadPathPoints && building.roadPathPoints.length >= 2) {
      // 已有路径点（自由绘制或曲线道路）
      pathPoints = building.roadPathPoints
      segments = roadSegments
    } else {
      // 没有路径点（绿化绿植中的直道）
      // 创建简单的直线路径点，沿Z轴方向（长度方向）
      // 起点在 -length/2，终点在 length/2
      pathPoints = [
        { x: 0, z: -roadLength / 2 },
        { x: 0, z: roadLength / 2 },
      ]
      segments = 2 // 直道只需要2个点
    }

    // 使用统一的函数创建道路几何体（包括车道线）
    return createCurvedRoadGeometries({
      pathPoints,
      width: roadWidth,
      thickness: roadThickness,
      segments,
      curveTension: building.roadCurveTension || 0.5,
      heightMode: building.roadHeightMode || 'follow-terrain',
      elevation: building.roadElevation || 8,
      terrainData,
      canvasSize,
      baseX: building.position[0],
      baseZ: building.position[1],
      laneConfig: building.roadLaneConfig,
    })
  }, [
    building.roadPathPoints,
    building.params,
    building.roadCurveTension,
    building.roadHeightMode,
    building.roadElevation,
    building.roadLaneConfig,
    building.position,
    terrainData,
    canvasSize,
  ])

  const edgesGeometries = useMemo(
    () => geometries.map(item => new THREE.EdgesGeometry(item.geometry)),
    [geometries],
  )

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.ctrlKey || e.metaKey) {
      toggleBuildingSelection(building.id)
    } else {
      selectBuilding(building.id)
    }
  }, [building.id, selectBuilding, toggleBuildingSelection])

  const handleDoubleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    selectBuilding(building.id)
    setEditorOpen(true)
  }, [building.id, selectBuilding, setEditorOpen])

  return (
    <group
      ref={groupRef}
      position={[building.position[0], building.baseHeight ?? 0, building.position[1]]}
      rotation={[0, (building.rotation * Math.PI) / 180, 0]}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      userData={{ buildingId: building.id }}
    >
      {geometries.map((item, i) => (
        <mesh
          key={i}
          geometry={item.geometry}
          position={item.position}
          receiveShadow
          castShadow
        >
          <meshStandardMaterial
            color={item.color ?? building.color}
            transparent={isSelectedVisual}
            opacity={isSelectedVisual ? 0.85 : 1}
            roughness={1}
            metalness={0}
          />
          {isSelectedVisual && (
            <lineSegments>
              <primitive object={edgesGeometries[i]} attach="geometry" />
              <lineBasicMaterial color={isMultiSelected ? "#52c41a" : "#ffffff"} linewidth={2} />
            </lineSegments>
          )}
        </mesh>
      ))}
    </group>
  )
}
