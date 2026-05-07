import { useRef, useCallback, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { useStore } from '../../store/useStore'

const _hitVec = new Vector3()
const _groundPlane = new Plane(new Vector3(0, 1, 0), 0)

const LOG_PREFIX = '[RoadInteraction]'

export function RoadInteraction() {
  const { camera, gl, raycaster } = useThree()
  const cameraRef = useRef(camera)
  const isDownRef = useRef(false)
  const justFinishedRef = useRef(false)

  const roadEditor = useStore(s => s.roadEditor)
  const setRoadEditor = useStore(s => s.setRoadEditor)
  const addRoadPreviewPoint = useStore(s => s.addRoadPreviewPoint)
  const completeRoad = useStore(s => s.completeRoad)
  const cancelRoadDrawing = useStore(s => s.cancelRoadDrawing)

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

  const shouldActivate = useCallback((e: PointerEvent) => {
    const state = useStore.getState()
    const enabled = state.roadEditor.enabled
    const terrainEnabled = state.terrainEditor.enabled
    const result = enabled && e.altKey && e.button === 0 && !terrainEnabled
    return result
  }, [])

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!shouldActivate(e)) return

      e.preventDefault()
      e.stopImmediatePropagation()
      isDownRef.current = true
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!isDownRef.current) return

      e.preventDefault()
      e.stopImmediatePropagation()
      isDownRef.current = false
      justFinishedRef.current = true

      const worldPos = getWorldPosition(e)
      if (!worldPos) return

      if (roadEditor.previewPoints.length === 0) {
        setRoadEditor({ isDrawing: true })
      }

      addRoadPreviewPoint({ x: worldPos[0], z: worldPos[1] })
    }

    const onClick = (e: MouseEvent) => {
      if (justFinishedRef.current) {
        e.stopImmediatePropagation()
        e.preventDefault()
        justFinishedRef.current = false
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        e.preventDefault()
      }
      if (e.key === 'Escape') {
        if (roadEditor.enabled) {
          cancelRoadDrawing()
        }
      }
      if (e.key === 'Enter') {
        if (roadEditor.enabled && roadEditor.previewPoints.length >= 2) {
          completeRoad()
        }
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && isDownRef.current) {
        isDownRef.current = false
      }
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointerup', onPointerUp, true)
    window.addEventListener('click', onClick, true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('click', onClick, true)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [
    shouldActivate,
    getWorldPosition,
    setRoadEditor,
    addRoadPreviewPoint,
    completeRoad,
    cancelRoadDrawing,
    roadEditor.enabled,
    roadEditor.previewPoints.length,
  ])

  return null
}
