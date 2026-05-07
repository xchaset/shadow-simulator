import { useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { createCurvedRoadGeometries } from '../Buildings/BuildingFactory'

export function RoadPreview() {
  const roadEditor = useStore(s => s.roadEditor)
  const terrainData = useStore(s => s.terrainData)
  const canvasSize = useStore(s => s.canvasSize)

  const { previewPoints, roadWidth, roadElevation, roadHeightMode, roadMode, curveTension, enabled, laneConfig } = roadEditor

  const geometries = useMemo(() => {
    if (!enabled || !previewPoints || previewPoints.length < 2) return []

    return createCurvedRoadGeometries({
      pathPoints: previewPoints,
      width: roadWidth,
      thickness: 0.15,
      segments: 48,
      curveTension: curveTension,
      heightMode: roadHeightMode,
      elevation: roadElevation,
      terrainData,
      canvasSize,
      laneConfig,
    })
  }, [previewPoints, roadWidth, roadElevation, roadHeightMode, roadMode, curveTension, enabled, terrainData, canvasSize, laneConfig])

  const pointMarkers = useMemo(() => {
    if (!enabled || !previewPoints || previewPoints.length === 0) return []
    return previewPoints.map((p, i) => ({
      position: [p.x, 0.5, p.z] as [number, number, number],
      index: i,
      isFirst: i === 0,
      isLast: i === previewPoints.length - 1 && previewPoints.length >= 2,
    }))
  }, [previewPoints, enabled])

  if (!enabled) return null

  return (
    <group>
      {geometries.map((item, i) => (
        <mesh key={i} geometry={item.geometry} position={item.position} receiveShadow>
          <meshStandardMaterial
            color={item.color ?? '#708090'}
            transparent
            opacity={item.color ? 0.9 : 0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {pointMarkers.map((marker, i) => (
        <group key={`point-${i}`} position={marker.position}>
          <mesh>
            <sphereGeometry args={[1.5, 16, 16]} />
            <meshStandardMaterial
              color={marker.isLast ? '#52c41a' : marker.isFirst ? '#1890ff' : '#faad14'}
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
      ))}
      {previewPoints && previewPoints.length < 2 && (
        <mesh position={[0, 0.01, 0]}>
          <ringGeometry args={[0, 200, 32]} rotation={[-Math.PI / 2, 0, 0]} />
          <meshBasicMaterial color="#1890ff" transparent opacity={0.1} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}
