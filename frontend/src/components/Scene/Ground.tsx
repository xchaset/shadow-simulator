import { useRef, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import type { TerrainData } from '../../types'

interface GroundProps {
  onClick?: () => void
  terrainRef?: React.RefObject<any>
}

const TERRAIN_RESOLUTION = 128

export function Ground({ onClick, terrainRef }: GroundProps) {
  const canvasSize = useStore(s => s.canvasSize)
  const showGrid = useStore(s => s.showGrid)
  const gridDivisions = useStore(s => s.gridDivisions)
  const terrainData = useStore(s => s.terrainData)
  const terrainEditor = useStore(s => s.terrainEditor)
  const meshRef = useRef<any>(null)
  const hasTerrain = terrainData && terrainEditor.enabled

  // 更新地形高度
  useEffect(() => {
    if (!terrainData || !hasTerrain) return
    const mesh = meshRef.current
    if (!mesh) return

    const geometry = mesh.geometry
    const pos = geometry.attributes.position
    const { heights, resolution } = terrainData

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        pos.setZ(i * resolution + j, heights[i * resolution + j])
      }
    }
    pos.needsUpdate = true
    geometry.computeVertexNormals()
  }, [terrainData, hasTerrain])

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        position={[0, 0, 0]}
        onClick={onClick}
      >
        <planeGeometry
          ref={terrainRef}
          args={[canvasSize, canvasSize, TERRAIN_RESOLUTION - 1, TERRAIN_RESOLUTION - 1]}
        />
        <meshStandardMaterial
          color={hasTerrain ? '#8B7355' : '#e8e8e8'}
          wireframe={!hasTerrain}
        />
      </mesh>
      {showGrid && !hasTerrain && (
        <gridHelper args={[canvasSize, gridDivisions, '#cccccc', '#dddddd']} position={[0, 0.01, 0]} />
      )}
    </group>
  )
}
