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
  const selectedId = useStore(s => s.selectedBuildingId)
  const selectBuilding = useStore(s => s.selectBuilding)
  const setEditorOpen = useStore(s => s.setEditorOpen)
  const isSelected = selectedId === building.id

  const geometries = useMemo(
    () => createBuildingGeometries(building.type, building.params),
    [building.type, building.params],
  )

  // 单击 → 选中
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    selectBuilding(building.id)
  }, [building.id, selectBuilding])

  // 双击 → 打开编辑面板
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
            transparent={isSelected}
            opacity={isSelected ? 0.85 : 1}
          />
          {isSelected && (
            <lineSegments>
              <edgesGeometry args={[item.geometry]} />
              <lineBasicMaterial color="#ffffff" linewidth={2} />
            </lineSegments>
          )}
        </mesh>
      ))}
    </group>
  )
}
