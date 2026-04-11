import { useRef, useMemo, useState, useCallback } from 'react'
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
  const updateBuilding = useStore(s => s.updateBuilding)
  const isSelected = selectedId === building.id
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef<[number, number]>([0, 0])
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const intersectPoint = useMemo(() => new THREE.Vector3(), [])

  const geometries = useMemo(
    () => createBuildingGeometries(building.type, building.params),
    [building.type, building.params],
  )

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (isSelected) {
      // Start dragging — record offset between building position and click point
      const hit = new THREE.Vector3()
      e.ray.intersectPlane(dragPlane, hit)
      if (hit) {
        dragOffset.current = [
          hit.x - building.position[0],
          hit.z - building.position[1],
        ]
      }
      setIsDragging(true)
      // Capture pointer so we keep getting events even if cursor leaves the mesh
      ;(e.nativeEvent?.target as Element)?.setPointerCapture?.(e.nativeEvent.pointerId)
    }
    selectBuilding(building.id)
  }, [isSelected, building.id, building.position, selectBuilding, dragPlane])

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return
    e.stopPropagation()
    e.ray.intersectPlane(dragPlane, intersectPoint)
    if (intersectPoint) {
      updateBuilding(building.id, {
        position: [
          intersectPoint.x - dragOffset.current[0],
          intersectPoint.z - dragOffset.current[1],
        ],
      })
    }
  }, [isDragging, building.id, updateBuilding, dragPlane, intersectPoint])

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (isDragging) {
      e.stopPropagation()
    }
    setIsDragging(false)
  }, [isDragging])

  return (
    <group
      ref={groupRef}
      position={[building.position[0], 0, building.position[1]]}
      rotation={[0, (building.rotation * Math.PI) / 180, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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
