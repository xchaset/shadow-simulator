import { useCallback, useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { useStore } from '../../store/useStore'

interface TerrainEditorProps {
  geometryRef: React.RefObject<any>
  onHeightChange: () => void
}

/**
 * 地形编辑器
 *
 * 交互模式：Alt+左键 = 笔刷绘制，普通左键 = 正常旋转画布
 * 绘制时通过 window capture 阶段拦截 pointer 事件，阻止 OrbitControls 接收。
 * 笔刷光标始终跟随鼠标（不需要 Alt）。
 */
export function TerrainEditor({ geometryRef, onHeightChange }: TerrainEditorProps) {
  const { camera, gl, raycaster } = useThree()
  const cameraRef = useRef(camera)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef<[number, number] | null>(null)

  const terrainEditor = useStore(s => s.terrainEditor)
  const setTerrainEditor = useStore(s => s.setTerrainEditor)
  const canvasSize = useStore(s => s.canvasSize)

  // 初始化地形数据
  useEffect(() => {
    if (!useStore.getState().terrainData) {
      useStore.getState().setTerrainData({
        resolution: 128,
        heights: new Float32Array(128 * 128),
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
    let data = useStore.getState().terrainData
    if (!data || !data.heights || data.heights.length === 0) {
      const newData = {
        resolution: 128,
        heights: new Float32Array(128 * 128),
        maxHeight: 50,
      }
      useStore.getState().setTerrainData(newData)
      data = newData
    }

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

    useStore.getState().setTerrainData({
      resolution: data.resolution,
      heights: data.heights,
      maxHeight: data.maxHeight,
    })

    onHeightChange()
  }, [canvasSize, worldToIndex, geometryRef, onHeightChange])

  // 射线检测 → 世界坐标
  const getWorldPosition = useCallback((event: { clientX: number; clientY: number }): [number, number] | null => {
    const rect = gl.domElement.getBoundingClientRect()
    const mouse = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    }
    raycaster.setFromCamera(mouse, cameraRef.current)
    const hit = new Vector3()
    if (raycaster.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), hit)) {
      return [hit.x, hit.z]
    }
    return null
  }, [gl, raycaster])

  // ── 绘制事件（window capture 阶段，Alt+左键触发）──────────

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!terrainEditor.enabled || !e.altKey || e.button !== 0) return
      e.preventDefault()
      e.stopImmediatePropagation()

      isDrawingRef.current = true
      setTerrainEditor({ isDrawing: true })

      const pos = getWorldPosition(e)
      if (pos) {
        lastPosRef.current = pos
        applyBrush(pos[0], pos[1], true)
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return
      e.preventDefault()
      e.stopImmediatePropagation()

      const pos = getWorldPosition(e)
      if (!pos) return

      // 插值绘制，避免快速移动时出现断点
      if (lastPosRef.current) {
        const [lx, lz] = lastPosRef.current
        const [nx, nz] = pos
        const dist = Math.sqrt((nx - lx) ** 2 + (nz - lz) ** 2)
        const brushRadius = useStore.getState().terrainEditor.brushRadius
        const steps = Math.max(1, Math.floor(dist / (brushRadius * 0.3)))

        for (let i = 0; i <= steps; i++) {
          const t = i / steps
          applyBrush(lx + (nx - lx) * t, lz + (nz - lz) * t, false)
        }
      } else {
        applyBrush(pos[0], pos[1], false)
      }
      lastPosRef.current = pos
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return
      e.preventDefault()
      e.stopImmediatePropagation()

      isDrawingRef.current = false
      lastPosRef.current = null
      setTerrainEditor({ isDrawing: false })
    }

    // Alt 释放时停止绘制
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && isDrawingRef.current) {
        isDrawingRef.current = false
        lastPosRef.current = null
        setTerrainEditor({ isDrawing: false })
      }
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointermove', onPointerMove, true)
    window.addEventListener('pointerup', onPointerUp, true)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [terrainEditor.enabled, getWorldPosition, applyBrush, setTerrainEditor])

  // ── 笔刷位置跟踪（canvas 级别，始终生效）──────────

  useEffect(() => {
    const canvas = gl.domElement
    const onMove = (e: PointerEvent) => {
      if (isDrawingRef.current) return // 绘制中由 capture handler 处理
      const pos = getWorldPosition(e)
      setTerrainEditor({ brushPosition: pos })
    }
    canvas.addEventListener('pointermove', onMove)
    return () => canvas.removeEventListener('pointermove', onMove)
  }, [gl.domElement, getWorldPosition, setTerrainEditor])

  // ── 笔刷光标渲染 ──────────

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
