import { useCallback, useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { useStore } from '../../store/useStore'

interface TerrainEditorProps {
  geometryRef: React.RefObject<any>
  onHeightChange: () => void
}

// ── 对象池：避免拖动时高频 GC ──────────
const _hitVec = new Vector3()
const _groundPlane = new Plane(new Vector3(0, 1, 0), 0)
const _screenVec = new Vector3()

// ── 样式缓存：避免不必要的 DOM 更新 ──────────
interface BrushStyleCache {
  display: string
  left: number
  top: number
  width: number
  height: number
}

/**
 * 地形编辑器
 *
 * 交互模式：Alt+左键 = 笔刷绘制，普通左键 = 正常旋转画布
 * 绘制时通过 window capture 阶段拦截 pointer 事件，阻止 OrbitControls 接收。
 * 笔刷光标始终跟随鼠标（不需要 Alt）。
 *
 * 性能优化：
 * - 局部顶点更新：只更新笔刷影响范围内的顶点
 * - RAF 批处理：多次 applyBrush 合并为一帧更新
 * - 延迟法线计算：拖动中跳过 computeVertexNormals，结束时算一次
 * - ref 直接操作：拖动中不触发 React 重渲染
 */
export function TerrainEditor({ geometryRef, onHeightChange }: TerrainEditorProps) {
  const { camera, gl, raycaster } = useThree()
  const cameraRef = useRef(camera)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef<[number, number] | null>(null)

  const terrainEditor = useStore(s => s.terrainEditor)
  const setTerrainEditor = useStore(s => s.setTerrainEditor)
  const canvasSize = useStore(s => s.canvasSize)

  // ── 批处理状态 ──────────
  const rafIdRef = useRef<number>(0)
  // 脏区域边界 [minX, minY, maxX, maxY]，用于局部顶点更新
  const dirtyBoundsRef = useRef<[number, number, number, number]>([Infinity, Infinity, -Infinity, -Infinity])
  // 拖动中直接引用 heights，不走 state
  const heightsRef = useRef<Float32Array | null>(null)
  const resolutionRef = useRef(128)

  // ── 性能优化：缓存 DOM 元素和样式状态 ──────────
  const brushIndicatorRef = useRef<HTMLElement | null>(null)
  const lastStyleRef = useRef<BrushStyleCache>({
    display: 'none',
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })

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

  // 扩展脏区域
  const expandDirtyBounds = useCallback((cx: number, cy: number, radius: number) => {
    const b = dirtyBoundsRef.current
    b[0] = Math.min(b[0], cx - radius)
    b[1] = Math.min(b[1], cy - radius)
    b[2] = Math.max(b[2], cx + radius)
    b[3] = Math.max(b[3], cy + radius)
  }, [])

  // 刷新几何体：只更新脏区域内的顶点
  const flushGeometry = useCallback(() => {
    const geometry = geometryRef.current
    const heights = heightsRef.current
    if (!geometry || !heights) return

    const [minX, minY, maxX, maxY] = dirtyBoundsRef.current
    const res = resolutionRef.current
    const pos = geometry.attributes.position

    const x0 = Math.max(0, Math.floor(minX))
    const y0 = Math.max(0, Math.floor(minY))
    const x1 = Math.min(res - 1, Math.ceil(maxX))
    const y1 = Math.min(res - 1, Math.ceil(maxY))

    for (let iy = y0; iy <= y1; iy++) {
      for (let ix = x0; ix <= x1; ix++) {
        const idx = iy * res + ix
        pos.setZ(idx, heights[idx])
      }
    }
    pos.needsUpdate = true

    // 重置脏区域
    dirtyBoundsRef.current = [Infinity, Infinity, -Infinity, -Infinity]
  }, [geometryRef])

  // 调度 RAF 批量更新
  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current) return
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = 0
      flushGeometry()
    })
  }, [flushGeometry])

  // 应用笔刷（只修改 heights 数据 + 标记脏区域，不直接操作几何体）
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
      // 拖动开始：缓存引用，后续直接操作
      heightsRef.current = data.heights as Float32Array
      resolutionRef.current = data.resolution
    }

    const heights = heightsRef.current || data.heights as Float32Array
    const resolution = resolutionRef.current || data.resolution

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

    // 标记脏区域，调度批量更新
    expandDirtyBounds(cx, cy, radiusInIndices)
    scheduleFlush()
  }, [canvasSize, worldToIndex, expandDirtyBounds, scheduleFlush])

  // 拖动结束：计算法线 + 同步 state（一次性）
  const finishDrawing = useCallback(() => {
    // 确保最后一批脏数据刷入几何体
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = 0
    }
    flushGeometry()

    // 拖动结束才计算法线（最昂贵的操作，只做一次）
    const geometry = geometryRef.current
    if (geometry) {
      geometry.computeVertexNormals()
    }

    // 同步到 store（触发一次 React 更新，用于持久化/undo 等）
    const data = useStore.getState().terrainData
    if (data) {
      useStore.getState().setTerrainData({
        resolution: data.resolution,
        heights: data.heights,
        maxHeight: data.maxHeight,
      })
    }

    heightsRef.current = null
    onHeightChange()
  }, [flushGeometry, geometryRef, onHeightChange])

  // 射线检测 → 世界坐标（使用对象池）
  const getWorldPosition = useCallback((event: { clientX: number; clientY: number }): [number, number] | null => {
    const rect = gl.domElement.getBoundingClientRect()
    const mouse = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    }
    raycaster.setFromCamera(mouse, cameraRef.current)
    if (raycaster.ray.intersectPlane(_groundPlane, _hitVec)) {
      return [_hitVec.x, _hitVec.z]
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
      finishDrawing()
    }

    // Alt 释放时停止绘制
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && isDrawingRef.current) {
        isDrawingRef.current = false
        lastPosRef.current = null
        setTerrainEditor({ isDrawing: false })
        finishDrawing()
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
      // 清理未执行的 RAF
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = 0
      }
    }
  }, [terrainEditor.enabled, getWorldPosition, applyBrush, setTerrainEditor, finishDrawing])

  // ── 笔刷位置跟踪（仅在地形编辑启用时生效）──────────

  useEffect(() => {
    if (!terrainEditor.enabled) return

    const canvas = gl.domElement
    const onMove = (e: PointerEvent) => {
      if (isDrawingRef.current) return // 绘制中由 capture handler 处理
      const pos = getWorldPosition(e)
      setTerrainEditor({ brushPosition: pos })
    }
    canvas.addEventListener('pointermove', onMove)
    return () => canvas.removeEventListener('pointermove', onMove)
  }, [terrainEditor.enabled, gl.domElement, getWorldPosition, setTerrainEditor])

  // ── 笔刷光标渲染 ──────────

  useFrame(() => {
    const { brushPosition, brushRadius, enabled } = useStore.getState().terrainEditor

    // 快速检查：如果不需要显示笔刷，只在状态变化时隐藏
    if (!enabled || !brushPosition || isDrawingRef.current) {
      if (lastStyleRef.current.display !== 'none') {
        // 延迟获取 DOM 元素，避免不必要的查询
        if (!brushIndicatorRef.current) {
          brushIndicatorRef.current = document.getElementById('terrain-brush-indicator')
        }
        if (brushIndicatorRef.current) {
          brushIndicatorRef.current.style.display = 'none'
        }
        lastStyleRef.current.display = 'none'
      }
      return
    }

    // 计算新位置和大小（相机移动时需要重新计算）
    _screenVec.set(brushPosition[0], 0, brushPosition[1])
    _screenVec.project(camera)

    // 延迟获取 DOM 元素
    if (!brushIndicatorRef.current) {
      brushIndicatorRef.current = document.getElementById('terrain-brush-indicator')
    }

    if (!brushIndicatorRef.current) return

    const rect = gl.domElement.getBoundingClientRect()
    const x = (_screenVec.x * 0.5 + 0.5) * rect.width + rect.left
    const y = (-_screenVec.y * 0.5 + 0.5) * rect.height + rect.top
    const pixelRadius = (brushRadius / canvasSize) * Math.min(rect.width, rect.height)

    const newStyle: BrushStyleCache = {
      display: 'block',
      left: x - pixelRadius,
      top: y - pixelRadius,
      width: pixelRadius * 2,
      height: pixelRadius * 2,
    }

    // 只更新变化的样式，避免不必要的 DOM 操作
    const last = lastStyleRef.current
    if (last.display !== newStyle.display) {
      brushIndicatorRef.current.style.display = newStyle.display
      last.display = newStyle.display
    }
    if (last.left !== newStyle.left) {
      brushIndicatorRef.current.style.left = `${newStyle.left}px`
      last.left = newStyle.left
    }
    if (last.top !== newStyle.top) {
      brushIndicatorRef.current.style.top = `${newStyle.top}px`
      last.top = newStyle.top
    }
    if (last.width !== newStyle.width) {
      brushIndicatorRef.current.style.width = `${newStyle.width}px`
      last.width = newStyle.width
    }
    if (last.height !== newStyle.height) {
      brushIndicatorRef.current.style.height = `${newStyle.height}px`
      last.height = newStyle.height
    }
  })

  return null
}
