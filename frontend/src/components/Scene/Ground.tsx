import { useRef, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import type { TerrainData } from '../../types'

interface GroundProps {
  onClick?: () => void
  terrainRef?: React.RefObject<any>
  onTerrainHeightChange?: () => void
}

const TERRAIN_RESOLUTION = 128

export function Ground({ onClick, terrainRef, onTerrainHeightChange }: GroundProps) {
  const canvasSize = useStore(s => s.canvasSize)
  const showGrid = useStore(s => s.showGrid)
  const gridDivisions = useStore(s => s.gridDivisions)
  const terrainData = useStore(s => s.terrainData)
  const terrainEditor = useStore(s => s.terrainEditor)
  const meshRef = useRef<any>(null)

  // 更新地形高度
  const updateTerrainGeometry = (data: TerrainData) => {
    const mesh = meshRef.current
    if (!mesh) return
    const geometry = mesh.geometry
    const pos = geometry.attributes.position
    const { heights, resolution } = data

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const idx = i * resolution + j
        const vertexIdx = i * resolution + j
        pos.setZ(vertexIdx, heights[idx])
      }
    }
    pos.needsUpdate = true
    geometry.computeVertexNormals()
  }

  // 当地形数据变化时更新几何体
  useMemo(() => {
    if (terrainData) {
      // 使用 setTimeout 确保 ref 已绑定
      requestAnimationFrame(() => {
        updateTerrainGeometry(terrainData)
      })
    }
  }, [terrainData])

  const hasTerrain = terrainData && terrainEditor.enabled

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
          args={[canvasSize, canvasSize, hasTerrain ? TERRAIN_RESOLUTION - 1 : 1, hasTerrain ? TERRAIN_RESOLUTION - 1 : 1]}
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
