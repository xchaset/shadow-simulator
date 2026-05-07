import { useCallback, useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { useStore } from '../../store/useStore'
import type { TerrainColorType } from '../../types'

interface TerrainEditorProps {
  geometryRef: React.RefObject<any>
  onHeightChange: () => void
}

const _hitVec = new Vector3()
const _groundPlane = new Plane(new Vector3(0, 1, 0), 0)
const _screenVec = new Vector3()

const TERRAIN_COLORS: Record<TerrainColorType, [number, number, number]> = {
  0: [139 / 255, 115 / 255, 85 / 255],
  1: [34 / 255, 139 / 255, 34 / 255],
  2: [245 / 255, 245 / 255, 245 / 255],
  3: [105 / 255, 105 / 255, 105 / 255],
  4: [144 / 255, 238 / 255, 144 / 255],
}

interface BrushStyleCache {
  display: string
  left: number
  top: number
  width: number
  height: number
}

export function TerrainEditor({ geometryRef, onHeightChange }: TerrainEditorProps) {
  const { camera, gl, raycaster } = useThree()
  const cameraRef = useRef(camera)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef<[number, number] | null>(null)

  const terrainEditor = useStore(s => s.terrainEditor)
  const setTerrainEditor = useStore(s => s.setTerrainEditor)
  const canvasSize = useStore(s => s.canvasSize)

  const rafIdRef = useRef<number>(0)
  const dirtyBoundsRef = useRef<[number, number, number, number]>([Infinity, Infinity, -Infinity, -Infinity])
  const heightsRef = useRef<Float32Array | null>(null)
  const waterMaskRef = useRef<Uint8Array | null>(null)
  const colorDataRef = useRef<Float32Array | null>(null)
  const resolutionRef = useRef(128)
  const isWaterBrushRef = useRef(false)
  const isColorBrushRef = useRef(false)

  const brushIndicatorRef = useRef<HTMLElement | null>(null)
  const lastStyleRef = useRef<BrushStyleCache>({
    display: 'none',
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })

  useEffect(() => {
    if (!useStore.getState().terrainData) {
      const defaultColor = TERRAIN_COLORS[0]
      const colorData = new Float32Array(128 * 128 * 3)
      for (let i = 0; i < 128 * 128; i++) {
        colorData[i * 3] = defaultColor[0]
        colorData[i * 3 + 1] = defaultColor[1]
        colorData[i * 3 + 2] = defaultColor[2]
      }
      useStore.getState().setTerrainData({
        resolution: 128,
        heights: new Float32Array(128 * 128),
        maxHeight: 500,
        waterMask: new Uint8Array(128 * 128),
        colorData,
      })
    }
  }, [])

  useEffect(() => {
    const canvas = gl.domElement
    const originalCursor = canvas.style.cursor

    if (terrainEditor.enabled) {
      canvas.style.cursor = 'none'
    } else {
      canvas.style.cursor = originalCursor || ''
    }

    return () => {
      canvas.style.cursor = originalCursor || ''
    }
  }, [terrainEditor.enabled, gl.domElement])

  const worldToIndex = useCallback((wx: number, wz: number): [number, number] => {
    const halfSize = canvasSize / 2
    const u = (wx + halfSize) / canvasSize
    const v = (wz + halfSize) / canvasSize
    const x = Math.floor(u * 127)
    const y = Math.floor(v * 127)
    return [Math.max(0, Math.min(127, x)), Math.max(0, Math.min(127, y))]
  }, [canvasSize])

  const expandDirtyBounds = useCallback((cx: number, cy: number, radius: number) => {
    const b = dirtyBoundsRef.current
    b[0] = Math.min(b[0], cx - radius)
    b[1] = Math.min(b[1], cy - radius)
    b[2] = Math.max(b[2], cx + radius)
    b[3] = Math.max(b[3], cy + radius)
  }, [])

  const flushGeometry = useCallback(() => {
    const geometry = geometryRef.current
    const heights = heightsRef.current
    const waterMask = waterMaskRef.current
    const colorData = colorDataRef.current
    if (!geometry) return

    const [minX, minY, maxX, maxY] = dirtyBoundsRef.current
    const res = resolutionRef.current
    const pos = geometry.attributes.position

    if (heights) {
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
    }

    if (waterMask && geometry.getAttribute('aWaterMask')) {
      const maskAttr = geometry.getAttribute('aWaterMask') as any
      const x0 = Math.max(0, Math.floor(minX))
      const y0 = Math.max(0, Math.floor(minY))
      const x1 = Math.min(res - 1, Math.ceil(maxX))
      const y1 = Math.min(res - 1, Math.ceil(maxY))

      for (let iy = y0; iy <= y1; iy++) {
        for (let ix = x0; ix <= x1; ix++) {
          const idx = iy * res + ix
          maskAttr.setX(idx, waterMask[idx])
        }
      }
      maskAttr.needsUpdate = true
    }

    if (colorData && geometry.getAttribute('aTerrainColor')) {
      const colorAttr = geometry.getAttribute('aTerrainColor') as any
      const x0 = Math.max(0, Math.floor(minX))
      const y0 = Math.max(0, Math.floor(minY))
      const x1 = Math.min(res - 1, Math.ceil(maxX))
      const y1 = Math.min(res - 1, Math.ceil(maxY))

      for (let iy = y0; iy <= y1; iy++) {
        for (let ix = x0; ix <= x1; ix++) {
          const idx = iy * res + ix
          const colorIdx = idx * 3
          colorAttr.setXYZ(
            idx,
            colorData[colorIdx],
            colorData[colorIdx + 1],
            colorData[colorIdx + 2]
          )
        }
      }
      colorAttr.needsUpdate = true
    }

    dirtyBoundsRef.current = [Infinity, Infinity, -Infinity, -Infinity]
  }, [geometryRef])

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current) return
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = 0
      flushGeometry()
    })
  }, [flushGeometry])

  const applyBrush = useCallback((worldX: number, worldZ: number, isFirst: boolean) => {
    let data = useStore.getState().terrainData
    if (!data || !data.heights || data.heights.length === 0) {
      const defaultColor = TERRAIN_COLORS[0]
      const colorData = new Float32Array(128 * 128 * 3)
      for (let i = 0; i < 128 * 128; i++) {
        colorData[i * 3] = defaultColor[0]
        colorData[i * 3 + 1] = defaultColor[1]
        colorData[i * 3 + 2] = defaultColor[2]
      }
      const newData = {
        resolution: 128,
        heights: new Float32Array(128 * 128),
        maxHeight: 500,
        waterMask: new Uint8Array(128 * 128),
        colorData,
      }
      console.log('[TerrainEditor] 初始化地形数据:', newData)
      useStore.getState().setTerrainData(newData)
      data = newData
    }

    if (!data.waterMask) {
      data.waterMask = new Uint8Array(data.resolution * data.resolution)
    }

    if (!data.colorData) {
      const defaultColor = TERRAIN_COLORS[0]
      const colorData = new Float32Array(data.resolution * data.resolution * 3)
      for (let i = 0; i < data.resolution * data.resolution; i++) {
        colorData[i * 3] = defaultColor[0]
        colorData[i * 3 + 1] = defaultColor[1]
        colorData[i * 3 + 2] = defaultColor[2]
      }
      data.colorData = colorData
    }

    const { brushMode, brushRadius, brushStrength, brushMaxHeight, brushColorType } = useStore.getState().terrainEditor
    const [cx, cy] = worldToIndex(worldX, worldZ)
    const radiusInIndices = Math.ceil((brushRadius / canvasSize) * 128)
    const isWaterBrush = brushMode === 'water'
    const isColorBrush = brushMode === 'color'
    const targetColor = TERRAIN_COLORS[brushColorType] || TERRAIN_COLORS[0]

    if (isFirst) {
      console.log('[TerrainEditor] 开始绘制，模式:', brushMode, '位置:', [cx, cy], '半径:', radiusInIndices)
      useStore.getState().pushTerrainUndo()
      heightsRef.current = data.heights as Float32Array
      waterMaskRef.current = data.waterMask as Uint8Array
      colorDataRef.current = data.colorData as Float32Array
      resolutionRef.current = data.resolution
      isWaterBrushRef.current = isWaterBrush
      isColorBrushRef.current = isColorBrush
    }

    const heights = heightsRef.current || data.heights as Float32Array
    const waterMask = waterMaskRef.current || data.waterMask as Uint8Array
    const colorData = colorDataRef.current || data.colorData as Float32Array
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

        if (isWaterBrush) {
          if (falloff > 0.3) {
            waterMask[idx] = 1
          }
        } else if (isColorBrush) {
          if (falloff > 0.05) {
            const colorIdx = idx * 3
            const currentR = colorData[colorIdx]
            const currentG = colorData[colorIdx + 1]
            const currentB = colorData[colorIdx + 2]
            
            const blendFactor = Math.min(1, falloff * 1.5)
            colorData[colorIdx] = currentR + (targetColor[0] - currentR) * blendFactor
            colorData[colorIdx + 1] = currentG + (targetColor[1] - currentG) * blendFactor
            colorData[colorIdx + 2] = currentB + (targetColor[2] - currentB) * blendFactor
          }
        } else {
          const currentHeight = heights[idx]

          switch (brushMode) {
            case 'raise':
              heights[idx] = Math.min(brushMaxHeight, currentHeight + brushStrength * falloff)
              break
            case 'lower':
              heights[idx] = Math.max(-brushMaxHeight, currentHeight - brushStrength * falloff)
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
    }

    expandDirtyBounds(cx, cy, radiusInIndices)
    scheduleFlush()
  }, [canvasSize, worldToIndex, expandDirtyBounds, scheduleFlush])

  const finishDrawing = useCallback(() => {
    console.log('[TerrainEditor] finishDrawing 开始')

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = 0
    }
    flushGeometry()

    const geometry = geometryRef.current
    if (geometry) {
      geometry.computeVertexNormals()
    }

    const data = useStore.getState().terrainData
    console.log('[TerrainEditor] 从 store 获取 terrainData:', data ? '存在' : 'null')
    if (data) {
      const { brushMaxHeight } = useStore.getState().terrainEditor
      console.log('[TerrainEditor] terrainData 详情:', {
        resolution: data.resolution,
        heightsLength: data.heights?.length,
        brushMaxHeight,
        hasWaterMask: !!data.waterMask,
        hasColorData: !!data.colorData,
      })

      useStore.getState().setTerrainData({
        resolution: data.resolution,
        heights: data.heights,
        maxHeight: brushMaxHeight,
        waterMask: data.waterMask,
        colorData: data.colorData,
      })

      const state = useStore.getState()
      console.log('[TerrainEditor] setTerrainData 后，store 中的 dirty:', state.dirty)
      console.log('[TerrainEditor] setTerrainData 后，store 中的 terrainData:', state.terrainData ? '存在' : 'null')
    }

    heightsRef.current = null
    waterMaskRef.current = null
    colorDataRef.current = null
    onHeightChange()
    console.log('[TerrainEditor] finishDrawing 结束')
  }, [flushGeometry, geometryRef, onHeightChange])

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
      setTerrainEditor({ brushPosition: pos })

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
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = 0
      }
    }
  }, [terrainEditor.enabled, getWorldPosition, applyBrush, setTerrainEditor, finishDrawing])

  useEffect(() => {
    if (!terrainEditor.enabled) return

    const canvas = gl.domElement
    const onMove = (e: PointerEvent) => {
      const pos = getWorldPosition(e)
      setTerrainEditor({ brushPosition: pos })
    }
    canvas.addEventListener('pointermove', onMove)
    return () => canvas.removeEventListener('pointermove', onMove)
  }, [terrainEditor.enabled, gl.domElement, getWorldPosition, setTerrainEditor])

  useFrame(() => {
    const { brushPosition, brushRadius, enabled } = useStore.getState().terrainEditor

    if (!enabled || !brushPosition) {
      if (lastStyleRef.current.display !== 'none') {
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

    _screenVec.set(brushPosition[0], 0, brushPosition[1])
    _screenVec.project(camera)

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
