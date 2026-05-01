import { useRef, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { ThreeEvent } from '@react-three/fiber'
import { useStore } from '../../store/useStore'
import { createBuildingGeometries } from './BuildingFactory'
import type { Building } from '../../types'

interface Props {
  building: Building
}

export function BuildingMesh({ building }: Props) {
  const groupRef = useRef<THREE.Group>(null)

  // 只订阅"自己是否被选中"的布尔值，避免其他建筑选中时触发重渲染
  const isSelected = useStore(s => s.selectedBuildingId === building.id)
  const isMultiSelected = useStore(s => s.selectedBuildingIds.includes(building.id))
  const isSelectedVisual = isSelected || isMultiSelected

  const selectBuilding = useStore(s => s.selectBuilding)
  const toggleBuildingSelection = useStore(s => s.toggleBuildingSelection)
  const setEditorOpen = useStore(s => s.setEditorOpen)

  const geometries = useMemo(
    () => createBuildingGeometries(building.type, building.params),
    [building.type, building.params],
  )

  // 缓存 EdgesGeometry，只在 geometries 变化时重建
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
      position={[building.position[0], 0, building.position[1]]}
      rotation={[0, (building.rotation * Math.PI) / 180, 0]}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {geometries.map((item, i) => (
        <mesh
          key={i}
          geometry={item.geometry}
          position={item.position}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={
              item.color === '__roof__'
                ? (building.params as any).roofColor || building.color
                : item.color ?? building.color
            }
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
