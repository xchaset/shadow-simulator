import { useRef, useCallback, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { getTerrainHeightAt } from '../../utils/terrain'

const LOG_PREFIX = '[BuildingDragInteraction]'

interface DragState {
  isDragging: boolean
  hitBuildingId: string | null
  startWorldPos: [number, number] | null
  hitHeight: number
  buildingOffsets: Map<string, [number, number]>
  moved: boolean
}

interface RaycastResult {
  buildingId: string
  worldX: number
  worldY: number
  worldZ: number
}

export function BuildingDragInteraction() {
  const { camera, gl, scene } = useThree()

  const dragStateRef = useRef<DragState>({
    isDragging: false,
    hitBuildingId: null,
    startWorldPos: null,
    hitHeight: 0,
    buildingOffsets: new Map(),
    moved: false,
  })

  const tmpNdc = useRef(new THREE.Vector2())
  const tmpRaycaster = useRef(new THREE.Raycaster())
  const tmpHit = useRef(new THREE.Vector3())
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))

  const screenToWorldAtHeight = useCallback(
    (screenX: number, screenY: number, height: number): [number, number] | null => {
      const rect = gl.domElement.getBoundingClientRect()
      tmpNdc.current.set(
        ((screenX - rect.left) / rect.width) * 2 - 1,
        -((screenY - rect.top) / rect.height) * 2 + 1,
      )
      tmpRaycaster.current.setFromCamera(tmpNdc.current, camera)

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -height)
      if (tmpRaycaster.current.ray.intersectPlane(plane, tmpHit.current)) {
        return [tmpHit.current.x, tmpHit.current.z]
      }
      return null
    },
    [camera, gl],
  )

  const screenToWorld = useCallback(
    (screenX: number, screenY: number): [number, number] | null => {
      return screenToWorldAtHeight(screenX, screenY, 0)
    },
    [screenToWorldAtHeight],
  )

  const getBuildingIdFromObject = useCallback((obj: THREE.Object3D): string | null => {
    let current: THREE.Object3D | null = obj
    while (current) {
      if (current.userData && current.userData.buildingId) {
        return current.userData.buildingId
      }
      current = current.parent
    }
    return null
  }, [])

  const raycastBuildings = useCallback(
    (screenX: number, screenY: number): RaycastResult | null => {
      const rect = gl.domElement.getBoundingClientRect()
      tmpNdc.current.set(
        ((screenX - rect.left) / rect.width) * 2 - 1,
        -((screenY - rect.top) / rect.height) * 2 + 1,
      )
      tmpRaycaster.current.setFromCamera(tmpNdc.current, camera)

      const meshes: THREE.Object3D[] = []
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const buildingId = getBuildingIdFromObject(obj)
          if (buildingId) {
            meshes.push(obj)
          }
        }
      })

      const intersects = tmpRaycaster.current.intersectObjects(meshes, false)
      if (intersects.length > 0) {
        const buildingId = getBuildingIdFromObject(intersects[0].object)
        if (buildingId) {
          const point = intersects[0].point
          return {
            buildingId,
            worldX: point.x,
            worldY: point.y,
            worldZ: point.z,
          }
        }
      }
      return null
    },
    [camera, gl, scene, getBuildingIdFromObject],
  )

  const shouldActivate = useCallback((e: PointerEvent, hitResult: RaycastResult | null): boolean => {
    const state = useStore.getState()

    if (e.altKey) return false
    if (e.button !== 0) return false
    if (state.terrainEditor.enabled) return false
    if (state.measurementTool.enabled) return false
    if (state.roadEditor.enabled) return false
    if (state.isBoxSelecting) return false
    if (state.isDragging) return false

    if (hitResult) {
      const isSelected = state.selectedBuildingId === hitResult.buildingId || state.selectedBuildingIds.includes(hitResult.buildingId)
      return isSelected
    }

    return false
  }, [])

  const startDrag = useCallback((e: PointerEvent, hitResult: RaycastResult | null) => {
    const state = useStore.getState()
    const dragState = dragStateRef.current

    const activeIds: string[] = []
    if (state.selectedBuildingIds.length > 0) {
      activeIds.push(...state.selectedBuildingIds)
    } else if (state.selectedBuildingId) {
      activeIds.push(state.selectedBuildingId)
    }

    if (activeIds.length === 0 || !hitResult) return

    const hitWorldPos: [number, number] = [hitResult.worldX, hitResult.worldZ]
    const hitHeight = hitResult.worldY

    dragState.isDragging = true
    dragState.hitBuildingId = hitResult.buildingId
    dragState.startWorldPos = hitWorldPos
    dragState.hitHeight = hitHeight
    dragState.moved = false
    dragState.buildingOffsets.clear()

    activeIds.forEach((id) => {
      const building = state.buildings.find((b) => b.id === id)
      if (building) {
        const offsetX = building.position[0] - hitWorldPos[0]
        const offsetZ = building.position[1] - hitWorldPos[1]
        dragState.buildingOffsets.set(id, [offsetX, offsetZ])
      }
    })

    useStore.getState().setDragging(true)

    console.log(LOG_PREFIX, '开始拖拽建筑:', activeIds, '点击建筑:', hitResult.buildingId, '点击位置:', hitWorldPos, '点击高度:', hitHeight)
  }, [])

  const updateDrag = useCallback((e: PointerEvent) => {
    const dragState = dragStateRef.current
    if (!dragState.isDragging || !dragState.startWorldPos) return

    const currentWorldPos = screenToWorldAtHeight(e.clientX, e.clientY, dragState.hitHeight)
    if (!currentWorldPos) return

    const dx = currentWorldPos[0] - dragState.startWorldPos[0]
    const dz = currentWorldPos[1] - dragState.startWorldPos[1]

    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      dragState.moved = true
    }

    if (!dragState.moved) return

    const state = useStore.getState()
    const { updateBuilding, buildings, terrainData, canvasSize } = state

    dragState.buildingOffsets.forEach((offset, id) => {
      const building = buildings.find((b) => b.id === id)
      if (!building) return

      const newX = currentWorldPos[0] + offset[0]
      const newZ = currentWorldPos[1] + offset[1]

      const baseHeight = getTerrainHeightAt(newX, newZ, terrainData, canvasSize)

      updateBuilding(id, {
        position: [newX, newZ],
        baseHeight,
      })
    })
  }, [screenToWorldAtHeight])

  const endDrag = useCallback(() => {
    const dragState = dragStateRef.current
    if (!dragState.isDragging) return

    dragState.isDragging = false
    dragState.hitBuildingId = null
    dragState.startWorldPos = null
    dragState.buildingOffsets.clear()
    dragState.moved = false

    useStore.getState().setDragging(false)

    console.log(LOG_PREFIX, '结束拖拽')
  }, [])

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const hitResult = raycastBuildings(e.clientX, e.clientY)

      console.log(LOG_PREFIX, 'onPointerDown', {
        hitResult,
        shouldActivate: hitResult ? shouldActivate(e, hitResult) : false,
      })

      if (!hitResult || !shouldActivate(e, hitResult)) return

      e.preventDefault()
      e.stopImmediatePropagation()

      startDrag(e, hitResult)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragStateRef.current.isDragging) return
      e.preventDefault()
      e.stopImmediatePropagation()
      updateDrag(e)
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!dragStateRef.current.isDragging) return
      e.preventDefault()
      e.stopImmediatePropagation()
      endDrag()
    }

    const onPointerCancel = () => {
      endDrag()
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointermove', onPointerMove, true)
    window.addEventListener('pointerup', onPointerUp, true)
    window.addEventListener('pointercancel', onPointerCancel, true)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('pointercancel', onPointerCancel, true)
    }
  }, [raycastBuildings, shouldActivate, startDrag, updateDrag, endDrag])

  return null
}
