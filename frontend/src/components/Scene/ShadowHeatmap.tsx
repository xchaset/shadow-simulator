import { useMemo, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import * as THREE from 'three'
import { getHeatmapColor } from '../../utils/shadowAnalysis'

export function ShadowHeatmap() {
  const canvasSize = useStore(s => s.canvasSize)
  const shadowHeatmap = useStore(s => s.shadowHeatmap)
  const { enabled, result, opacity, gridResolution } = shadowHeatmap
  
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null)
  
  const heatmapMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      vertexColors: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
    
    return material
  }, [])
  
  const updateHeatmapGeometry = useCallback((mesh: THREE.Mesh) => {
    if (!result || result.gridPoints.length === 0) {
      mesh.visible = false
      return
    }
    
    mesh.visible = true
    
    const gridSize = result.gridSize
    const halfSize = canvasSize / 2
    const step = canvasSize / gridSize
    
    const geometry = new THREE.PlaneGeometry(canvasSize, canvasSize, gridSize - 1, gridSize - 1)
    
    const positions = geometry.attributes.position.array as Float32Array
    const colors = new Float32Array(positions.length)
    
    const maxShadowRatio = result.maxShadowMinutes > 0 
      ? result.maxShadowMinutes / Math.max(...result.gridPoints.map(p => p.totalMinutes), 1)
      : 1.0
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const vertexIndex = i * gridSize + j
        const gridPoint = result.gridPoints[vertexIndex]
        
        if (!gridPoint) continue
        
        const shadowRatio = gridPoint.totalMinutes > 0 
          ? gridPoint.shadowMinutes / gridPoint.totalMinutes 
          : 0
        
        const [r, g, b] = getHeatmapColor(shadowRatio, maxShadowRatio)
        
        const colorIndex = vertexIndex * 3
        colors[colorIndex] = r
        colors[colorIndex + 1] = g
        colors[colorIndex + 2] = b
      }
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.computeVertexNormals()
    
    if (mesh.geometry) {
      mesh.geometry.dispose()
    }
    
    mesh.geometry = geometry
  }, [result, canvasSize])
  
  useEffect(() => {
    if (!meshRef.current) return
    
    const mesh = meshRef.current
    
    if (!enabled || !result) {
      mesh.visible = false
      return
    }
    
    updateHeatmapGeometry(mesh)
  }, [enabled, result, gridResolution, updateHeatmapGeometry])
  
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.opacity = opacity
    }
  }, [opacity])
  
  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.05, 0]}
      visible={enabled && !!result}
    >
      <primitive object={heatmapMaterial} ref={materialRef} />
    </mesh>
  )
}