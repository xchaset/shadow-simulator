import { useRef, useCallback, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import type { Annotation } from '../../types'

const _hitVec = new THREE.Vector3()
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

const LOG_PREFIX = '[AnnotationInteraction]'

export function AnnotationInteraction() {
  const { camera, gl, raycaster } = useThree()
  const cameraRef = useRef(camera)
  const isDownRef = useRef(false)
  const justFinishedRef = useRef(false)

  const addAnnotation = useStore(s => s.addAnnotation)

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
    const enabled = state.annotationTool.enabled
    const terrainEnabled = state.terrainEditor.enabled
    const result = enabled && e.button === 0 && !terrainEnabled
    
    console.log(LOG_PREFIX, 'shouldActivate:', {
      enabled,
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

      const { mode, color, fontSize } = useStore.getState().annotationTool

      const annotation: Annotation = {
        id: `annotation-${Date.now()}`,
        mode,
        position: worldPos,
        yOffset: 2,
        rotation: 0,
        scale: 1,
        color,
        fontSize,
        text: mode === 'text' ? '新标签' : undefined,
        dimensionStart: mode === 'dimension' ? [worldPos[0] - 10, worldPos[1]] : undefined,
        dimensionEnd: mode === 'dimension' ? [worldPos[0] + 10, worldPos[1]] : undefined,
        arrowDirection: mode === 'arrow' ? 0 : undefined,
        arrowLength: mode === 'arrow' ? 20 : undefined,
        createdAt: new Date(),
      }

      console.log(LOG_PREFIX, '添加标注:', annotation)
      addAnnotation(annotation)
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
  }, [shouldActivate, getWorldPosition, addAnnotation])

  return null
}
