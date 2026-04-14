import { useCallback, useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { useStore } from '../../store/useStore'

interface TerrainEditorProps {
  geometryRef: React.RefObject<any>
  onHeightChange: () => void
}

/**
 * 地形编辑器 - 处理鼠标交互和顶点编辑
 * 不自带 mesh，通过 geometryRef 操作 Ground 中的几何体
 */
export function TerrainEditor({ geometryRef, onHeightChange }: TerrainEditorProps) {
  const { camera, gl } = useThree()
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef<[number, number] | null>(null)

  const terrainEditor = useStore(s => s.terrainEditor)
  const setTerrainEditor = useStore(s => s.setTerrainEditor)
  const terrainData = useStore(s => s.terrainData)
  const canvasSize = useStore(s => s.canvasSize)

  // 初始化地形数据
  useEffect(() => {
    if (!terrainData) {
      const count = 128 * 128
      useStore.getState().setTerrainData({
        resolution: 128,
        heights: new Float32Array(count),
        maxHeight: 50,
      })
    }
  }, [])

  // 将世界坐标转换为高度图索引
  const worldToIndex = useCallback((wx: number, wz: number): [number, number] => {
    const halfSize = canvasSize / 2
    const u = (wx + halfSize) / canvasSize
    const v = (wz + halfSize) / canvasSize
    const x = Math.floor(u * 127)
    const y = Math.floor(v * 127)
    return [Math.max(0, Math.min(127, x)), Math.max(0, Math.min(127, y))]
  }, [canvasSize])

  // 应用笔刷
  const applyBrush = useCallback((worldX: number, worldZ: number, isFirst: boolean) => {
    const data = useStore.getState().terrainData
    if (!data) return

    const { brushMode, brushRadius, brushStrength } = useStore.getState().terrainEditor
    const [cx, cy] = worldToIndex(worldX, worldZ)
    const radiusInIndices = Math.ceil((brushRadius / canvasSize) * 128)

    if (isFirst) {
      useStore.getState().pushTerrainUndo()
    }

    const heights = data.heights as Float32Array
    const resolution = data.resolution

    for (let dy = -radiusInIndices; dy <= radiusInIndices; dy++) {
      for (let dx = -radiusInIndices; dx <= radiusInIndices; dx++) {
        const ix = cx + dx
        const iy = cy + dy
        if (ix < 0 || ix >= resolution || iy < 0 || iy >= resolution) continue

        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > radiusInIndices) continue

        const falloff = Math.exp(-(dist * dist) / (2 * (radiusInIndices * 0.5) ** 2))
        const idx = iy * resolution + ix
        const currentHeight = heights[idx]

        switch (brushMode) {
          case 'raise':
            heights[idx] = Math.min(data.maxHeight, currentHeight + brushStrength * falloff)
            break
          case 'lower':
            heights[idx] = Math.max(-data.maxHeight, currentHeight - brushStrength * falloff)
            break
          case 'smooth': {
            let sum = 0
            let count = 0
            for (let sy = -1; sy <= 1; sy++) {
              for (let sx = -1; sx <= 1; sx++) {
                const niy = iy + sy
                const nix = ix + sx
                if (niy >= 0 && niy < resolution && nix >= 0 && nix < resolution) {
                  sum += heights[niy * resolution + nix]
                  count++
                }
              }
            }
            const avg = sum / count
            heights[idx] = currentHeight + (avg - currentHeight) * brushStrength * 0.1 * falloff
            break
          }
          case 'flatten': {
            const centerIdx = cy * resolution + cx
            const targetHeight = heights[centerIdx]
            heights[idx] = currentHeight + (targetHeight - currentHeight) * brushStrength * 0.1 * falloff
            break
          }
        }
      }
    }

    // 更新几何体顶点
    const geometry = geometryRef.current
    if (geometry) {
      const pos = geometry.attributes.position
      for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
          pos.setZ(i * resolution + j, heights[i * resolution + j])
        }
      }
      pos.needsUpdate = true
      geometry.computeVertexNormals()
    }

    onHeightChange()
  }, [canvasSize, worldToIndex, geometryRef, onHeightChange])

  // 射线检测
  const getWorldPosition = useCallback((event: PointerEvent): [number, number] | null => {
    const rect = gl.domElement.getBoundingClientRect()
    const mouse = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    }

    const raycaster = useThree.getState().raycaster
    const currentCamera = useThree.getState().camera
    raycaster.setFromCamera(mouse, currentCamera)

    const groundPlane = new Plane(new Vector3(0, 1, 0), 0)
    const hit = new Vector3()
    raycaster.ray.intersectPlane(groundPlane, hit)

    return hit ? [hit.x, hit.z] : null
  }, [gl])

  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (!terrainEditor.enabled || e.button !== 0) return
    e.preventDefault()
    isDrawingRef.current = true
    setTerrainEditor({ isDrawing: true })

    const pos = getWorldPosition(e)
    if (pos) {
      lastPosRef.current = pos
      applyBrush(pos[0], pos[1], true)
    }
  }, [terrainEditor.enabled, getWorldPosition, applyBrush, setTerrainEditor])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const pos = getWorldPosition(e)
    setTerrainEditor({ brushPosition: pos })

    if (!isDrawingRef.current || !pos) return

    if (lastPosRef.current) {
      const [lx, lz] = lastPosRef.current
      const [nx, nz] = pos
      const dist = Math.sqrt((nx - lx) ** 2 + (nz - lz) ** 2)
      const steps = Math.max(1, Math.floor(dist / (terrainEditor.brushRadius * 0.3)))

      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const ix = lx + (nx - lx) * t
        const iz = lz + (nz - lz) * t
        applyBrush(ix, iz, i === 0)
      }
    } else {
      applyBrush(pos[0], pos[1], true)
    }
    lastPosRef.current = pos
  }, [getWorldPosition, applyBrush, terrainEditor.brushRadius, setTerrainEditor])

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false
    lastPosRef.current = null
    setTerrainEditor({ isDrawing: false })
  }, [setTerrainEditor])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
    }
  }, [gl.domElement, handlePointerDown, handlePointerMove, handlePointerUp])

  // 笔刷光标
  useFrame(() => {
    const brushIndicator = document.getElementById('terrain-brush-indicator')
    const { brushPosition, brushRadius, enabled } = useStore.getState().terrainEditor

    if (!enabled || !brushPosition || isDrawingRef.current) {
      if (brushIndicator) brushIndicator.style.display = 'none'
      return
    }

    if (brushIndicator) {
      const worldPos = new Vector3(brushPosition[0], 0, brushPosition[1])
      const screenPos = worldPos.project(camera)
      const rect = gl.domElement.getBoundingClientRect()

      const x = (screenPos.x * 0.5 + 0.5) * rect.width + rect.left
      const y = (-screenPos.y * 0.5 + 0.5) * rect.height + rect.top
      const pixelRadius = (brushRadius / canvasSize) * Math.min(rect.width, rect.height)

      brushIndicator.style.display = 'block'
      brushIndicator.style.left = `${x - pixelRadius}px`
      brushIndicator.style.top = `${y - pixelRadius}px`
      brushIndicator.style.width = `${pixelRadius * 2}px`
      brushIndicator.style.height = `${pixelRadius * 2}px`
    }
  })

  return null
}
