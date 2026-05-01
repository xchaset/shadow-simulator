import { useRef, useCallback, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import type { MeasurementPoint, Building } from '../../types'

const _hitVec = new THREE.Vector3()
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

const BUILDING_BOUNDING_CACHE = new WeakMap<Building, THREE.Box3>()

const LOG_PREFIX = '[MeasurementInteraction]'

function getBuildingWorldBounds(building: Building): THREE.Box3 {
  let box = BUILDING_BOUNDING_CACHE.get(building)
  if (box) return box

  const w = building.params.width || 20
  const d = building.params.depth || 15
  const h = building.params.height || 30

  const rad = (building.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  const corners = [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ].map(([dx, dz]) => [
    building.position[0] + dx * cos - dz * sin,
    building.position[1] + dx * sin + dz * cos,
  ])

  const xs = corners.map(c => c[0])
  const zs = corners.map(c => c[1])

  box = new THREE.Box3(
    new THREE.Vector3(Math.min(...xs), 0, Math.min(...zs)),
    new THREE.Vector3(Math.max(...xs), h, Math.max(...zs))
  )

  BUILDING_BOUNDING_CACHE.set(building, box)
  return box
}

function getBuildingCenter(building: Building): [number, number] {
  return building.position
}

export function MeasurementInteraction() {
  const { camera, gl, raycaster } = useThree()
  const cameraRef = useRef(camera)
  const isDownRef = useRef(false)
  const justFinishedRef = useRef(false)

  const measurementTool = useStore(s => s.measurementTool)
  const addMeasurementPoint = useStore(s => s.addMeasurementPoint)
  const buildings = useStore(s => s.buildings)

  console.log(LOG_PREFIX, '组件初始化, 测量工具状态:', measurementTool.enabled)

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

  const findBuildingAtPosition = useCallback((worldPos: [number, number]): Building | null => {
    const point = new THREE.Vector3(worldPos[0], 0, worldPos[1])

    for (const building of buildings) {
      const box = getBuildingWorldBounds(building)
      const baseBox = new THREE.Box3(
        new THREE.Vector3(box.min.x, -1, box.min.z),
        new THREE.Vector3(box.max.x, 1, box.max.z)
      )
      if (baseBox.containsPoint(point)) {
        return building
      }
    }
    return null
  }, [buildings])

  const shouldActivate = useCallback((e: PointerEvent) => {
    const state = useStore.getState()
    const enabled = state.measurementTool.enabled
    const terrainEnabled = state.terrainEditor.enabled
    const result = enabled && e.altKey && e.button === 0 && !terrainEnabled
    
    console.log(LOG_PREFIX, 'shouldActivate:', {
      enabled,
      altKey: e.altKey,
      button: e.button,
      terrainEnabled,
      result
    })
    
    return result
  }, [])

  useEffect(() => {
    console.log(LOG_PREFIX, 'useEffect 注册事件监听')

    const onPointerDown = (e: PointerEvent) => {
      console.log(LOG_PREFIX, 'onPointerDown', {
        altKey: e.altKey,
        button: e.button,
        shouldActivate: shouldActivate(e)
      })

      if (!shouldActivate(e)) return
      
      e.preventDefault()
      e.stopImmediatePropagation()
      isDownRef.current = true
      console.log(LOG_PREFIX, 'isDownRef 设置为 true')
    }

    const onPointerUp = (e: PointerEvent) => {
      console.log(LOG_PREFIX, 'onPointerUp', {
        isDownRef: isDownRef.current
      })

      if (!isDownRef.current) return
      
      e.preventDefault()
      e.stopImmediatePropagation()
      isDownRef.current = false
      justFinishedRef.current = true

      console.log(LOG_PREFIX, '获取世界坐标...')
      const worldPos = getWorldPosition(e)
      console.log(LOG_PREFIX, '世界坐标:', worldPos)
      
      if (!worldPos) return

      const building = findBuildingAtPosition(worldPos)
      console.log(LOG_PREFIX, '找到建筑物:', building ? building.name : '无')

      const point: MeasurementPoint = {
        id: `point-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        position: building ? getBuildingCenter(building) : worldPos,
        type: building ? 'building' : 'point',
        buildingId: building?.id,
        buildingName: building?.name,
      }

      console.log(LOG_PREFIX, '添加测量点:', point)
      addMeasurementPoint(point)
    }

    const onClick = (e: MouseEvent) => {
      if (justFinishedRef.current) {
        console.log(LOG_PREFIX, 'onClick 拦截')
        e.stopImmediatePropagation()
        e.preventDefault()
        justFinishedRef.current = false
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        console.log(LOG_PREFIX, 'onKeyDown: Alt 键按下')
        e.preventDefault()
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        console.log(LOG_PREFIX, 'onKeyUp: Alt 键释放')
        if (isDownRef.current) {
          isDownRef.current = false
        }
      }
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointerup', onPointerUp, true)
    window.addEventListener('click', onClick, true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      console.log(LOG_PREFIX, 'useEffect 清理事件监听')
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('click', onClick, true)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [shouldActivate, getWorldPosition, findBuildingAtPosition, addMeasurementPoint])

  return null
}
