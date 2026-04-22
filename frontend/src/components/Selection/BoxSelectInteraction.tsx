import { useRef, useCallback, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'

/**
 * 框选交互组件
 * Alt+左键拖拽选择建筑物
 *
 * 全部使用 pointer 事件（capture 阶段），在 R3F / OrbitControls 之前拦截。
 * pointerdown 的 preventDefault() 会阻止后续 mousedown/click，
 * 所以不再注册 mouse 事件。
 */
export function BoxSelectInteraction() {
  const { camera, gl } = useThree()
  const isDraggingRef = useRef(false)
  const justFinishedRef = useRef(false)

  const setBoxSelecting = useStore(s => s.setBoxSelecting)
  const setBoxSelectStart = useStore(s => s.setBoxSelectStart)
  const setBoxSelectEnd = useStore(s => s.setBoxSelectEnd)

  // 屏幕坐标 → 世界坐标（射线与 y=0 平面求交）
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): [number, number] | null => {
      const rect = gl.domElement.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((screenX - rect.left) / rect.width) * 2 - 1,
        -((screenY - rect.top) / rect.height) * 2 + 1,
      )
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(ndc, camera)
      const hit = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) {
        return [hit.x, hit.z]
      }
      return null
    },
    [camera, gl],
  )

  // AABB 相交检测（框与建筑有重叠即选中）
  const isBuildingInBox = useCallback(
    (
      pos: [number, number],
      params: Record<string, number>,
      rotation: number,
      start: [number, number],
      end: [number, number],
    ): boolean => {
      const boxMinX = Math.min(start[0], end[0])
      const boxMaxX = Math.max(start[0], end[0])
      const boxMinZ = Math.min(start[1], end[1])
      const boxMaxZ = Math.max(start[1], end[1])

      const w = params.width || 20
      const d = params.depth || 15
      const rad = (rotation * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      const hw = w / 2
      const hd = d / 2

      const corners = [
        [-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd],
      ].map(([dx, dz]) => [
        pos[0] + dx * cos - dz * sin,
        pos[1] + dx * sin + dz * cos,
      ])

      const bMinX = Math.min(...corners.map(c => c[0]))
      const bMaxX = Math.max(...corners.map(c => c[0]))
      const bMinZ = Math.min(...corners.map(c => c[1]))
      const bMaxZ = Math.max(...corners.map(c => c[1]))

      return bMaxX >= boxMinX && bMinX <= boxMaxX && bMaxZ >= boxMinZ && bMinZ <= boxMaxZ
    },
    [],
  )

  const finishBoxSelect = useCallback(() => {
    const boxStart = useStore.getState().boxSelectStart
    const boxEnd = useStore.getState().boxSelectEnd

    setBoxSelecting(false)
    setBoxSelectStart(null)
    setBoxSelectEnd(null)

    if (!boxStart || !boxEnd) return

    const selectedIds = useStore.getState().buildings
      .filter(b => isBuildingInBox(b.position, b.params || {}, b.rotation ?? 0, boxStart, boxEnd))
      .map(b => b.id)

    useStore.setState({ selectedBuildingIds: selectedIds, editorOpen: false })
  }, [isBuildingInBox, setBoxSelecting, setBoxSelectStart, setBoxSelectEnd])

  /** Alt+左键 且 非地貌编辑模式 */
  const shouldActivate = useCallback((e: PointerEvent) => {
    return e.altKey && e.button === 0 && !useStore.getState().terrainEditor.enabled
  }, [])

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!shouldActivate(e)) return
      e.preventDefault()
      e.stopImmediatePropagation()

      isDraggingRef.current = true
      setBoxSelecting(true)

      const w = screenToWorld(e.clientX, e.clientY)
      if (w) {
        setBoxSelectStart(w)
        setBoxSelectEnd(w)
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return
      e.preventDefault()
      e.stopImmediatePropagation()

      const w = screenToWorld(e.clientX, e.clientY)
      if (w) setBoxSelectEnd(w)
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!isDraggingRef.current) return
      e.preventDefault()
      e.stopImmediatePropagation()

      finishBoxSelect()
      isDraggingRef.current = false
      justFinishedRef.current = true
    }

    // 安全网：pointerdown 的 preventDefault 会抑制 mousedown→click，
    // 但部分浏览器仍可能派发 click，这里兜底拦截防止 Ground.onClick 清空选中
    const onClick = (e: MouseEvent) => {
      if (justFinishedRef.current) {
        e.stopImmediatePropagation()
        e.preventDefault()
        justFinishedRef.current = false
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') e.preventDefault()
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && isDraggingRef.current) {
        setBoxSelecting(false)
        setBoxSelectStart(null)
        setBoxSelectEnd(null)
        isDraggingRef.current = false
      }
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointermove', onPointerMove, true)
    window.addEventListener('pointerup', onPointerUp, true)
    window.addEventListener('click', onClick, true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('click', onClick, true)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [shouldActivate, finishBoxSelect, screenToWorld, setBoxSelecting, setBoxSelectStart, setBoxSelectEnd])

  return null
}
