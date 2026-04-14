import { useRef, useCallback, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'

/**
 * 框选交互组件
 * 处理 Alt+鼠标拖拽选择建筑物
 */
export function BoxSelectInteraction() {
  const { camera, gl } = useThree()
  const isDraggingRef = useRef(false)
  const startPosRef = useRef<THREE.Vector2 | null>(null)

  const setBoxSelecting = useStore(s => s.setBoxSelecting)
  const setBoxSelectStart = useStore(s => s.setBoxSelectStart)
  const setBoxSelectEnd = useStore(s => s.setBoxSelectEnd)
  const selectBuildings = useStore(s => s.selectBuildings)
  const buildings = useStore(s => s.buildings)

  // 屏幕坐标转 3D 地面坐标
  const screenToGround = useCallback(
    (screenX: number, screenY: number): [number, number] | null => {
      const rect = gl.domElement.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((screenX - rect.left) / rect.width) * 2 - 1,
        -((screenY - rect.top) / rect.height) * 2 + 1
      )

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, camera)

      // 与地面 y=0 平面相交
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const intersection = new THREE.Vector3()
      raycaster.ray.intersectPlane(groundPlane, intersection)

      if (intersection) {
        return [intersection.x, intersection.z]
      }
      return null
    },
    [camera, gl]
  )

  // 检查建筑物是否在框选范围内
  const isBuildingInBox = useCallback(
    (
      buildingPos: [number, number],
      start: [number, number],
      end: [number, number]
    ): boolean => {
      const minX = Math.min(start[0], end[0])
      const maxX = Math.max(start[0], end[0])
      const minZ = Math.min(start[1], end[1])
      const maxZ = Math.max(start[1], end[1])

      return (
        buildingPos[0] >= minX &&
        buildingPos[0] <= maxX &&
        buildingPos[1] >= minZ &&
        buildingPos[1] <= maxZ
      )
    },
    []
  )

  // 完成框选，更新选中状态
  const finishBoxSelect = useCallback(
    (endPos3D: [number, number]) => {
      const startPos = startPosRef.current
      if (!startPos) return

      const start3D = screenToGround(startPos.x, startPos.y)
      if (!start3D) return

      const selectedIds = buildings
        .filter(b => isBuildingInBox(b.position, start3D, endPos3D))
        .map(b => b.id)

      selectBuildings(selectedIds)
      setBoxSelecting(false)
      setBoxSelectStart(null)
      setBoxSelectEnd(null)
      startPosRef.current = null
    },
    [buildings, isBuildingInBox, screenToGround, selectBuildings, setBoxSelecting, setBoxSelectStart, setBoxSelectEnd]
  )

  // 监听 Alt 键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && isDraggingRef.current) {
        // 如果在拖拽时松开 Alt 键，取消框选
        setBoxSelecting(false)
        setBoxSelectStart(null)
        setBoxSelectEnd(null)
        isDraggingRef.current = false
        startPosRef.current = null
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [setBoxSelecting, setBoxSelectStart, setBoxSelectEnd])

  // 监听鼠标事件
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // 只在按住 Alt 键且按下左键时触发框选
      if (!e.altKey || e.button !== 0) return

      // 立即阻止默认行为和事件传播
      e.preventDefault()
      e.stopImmediatePropagation()
      
      isDraggingRef.current = true
      hasMovedRef.current = false
      startPosRef.current = new THREE.Vector2(e.clientX, e.clientY)
      
      // 立即禁用相机控制
      setBoxSelecting(true)

      // 转换为 3D 坐标
      const pos3D = screenToGround(e.clientX, e.clientY)
      if (pos3D) {
        setBoxSelectStart([pos3D[0], pos3D[1]])
        setBoxSelectEnd([pos3D[0], pos3D[1]])
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return

      // 阻止事件传播
      e.preventDefault()
      e.stopImmediatePropagation()

      // 转换为 3D 坐标
      const pos3D = screenToGround(e.clientX, e.clientY)
      if (pos3D) {
        setBoxSelectEnd([pos3D[0], pos3D[1]])
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current) return

      e.preventDefault()
      e.stopImmediatePropagation()
      
      const endPos3D = screenToGround(e.clientX, e.clientY)
      
      // 完成框选
      if (endPos3D) {
        finishBoxSelect(endPos3D)
      } else {
        setBoxSelecting(false)
        setBoxSelectStart(null)
        setBoxSelectEnd(null)
      }
      
      isDraggingRef.current = false
      startPosRef.current = null
    }

    // 使用捕获阶段监听，确保在 OrbitControls 之前拦截事件
    window.addEventListener('mousedown', handleMouseDown, true)
    window.addEventListener('mousemove', handleMouseMove, true)
    window.addEventListener('mouseup', handleMouseUp, true)

    return () => {
      window.removeEventListener('mousedown', handleMouseDown, true)
      window.removeEventListener('mousemove', handleMouseMove, true)
      window.removeEventListener('mouseup', handleMouseUp, true)
    }
  }, [gl.domElement, screenToGround, finishBoxSelect, setBoxSelecting, setBoxSelectStart, setBoxSelectEnd])

  return null
}
