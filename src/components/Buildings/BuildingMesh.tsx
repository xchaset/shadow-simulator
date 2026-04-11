import { useRef, useMemo } from 'react'
import * as THREE from 'three'
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
  const isSelected = selectedId === building.id

  const geometries = useMemo(
    () => createBuildingGeometries(building.type, building.params),
    [building.type, building.params],
  )

  return (
    <group
      ref={groupRef}
      position={[building.position[0], 0, building.position[1]]}
      rotation={[0, (building.rotation * Math.PI) / 180, 0]}
      onClick={(e) => {
        e.stopPropagation()
        selectBuilding(building.id)
      }}
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
            color={building.color}
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
