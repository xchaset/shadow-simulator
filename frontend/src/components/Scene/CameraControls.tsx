import { useRef, useEffect, useCallback } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../../store/useStore'
import { saveCameraState, loadCameraState } from '../../utils/storage'

/** 默认视角：从北方（-Z）高处向南俯瞰 */
const DEFAULT_POSITION: [number, number, number] = [0, 100, -130]
const DEFAULT_TARGET: [number, number, number] = [0, 0, 0]

/** 定期保存间隔（ms） */
const SAVE_INTERVAL = 3000

/**
 * 拖拽建筑物 / 框选 / 地貌绘制时自动禁用轨道控制。
 * 动态调整 near/far 裁剪面，避免缩放时出现渲染空白。
 * 自动保存/恢复相机视角（按模型隔离）。
 */
export function CameraControls() {
  const controlsRef = useRef<any>(null)
  const isDragging = useStore(s => s.isDragging)
  const isBoxSelecting = useStore(s => s.isBoxSelecting)
  const isTerrainDrawing = useStore(s => s.terrainEditor.isDrawing)
  const currentModelId = useStore(s => s.currentModelId)

  /** 上次保存的时间戳，用于节流 */
  const lastSaveRef = useRef(0)
  /** 记录当前绑定的 modelId，避免闭包过期 */
  const modelIdRef = useRef(currentModelId)
  modelIdRef.current = currentModelId

  /** 将当前相机状态写入 localStorage */
  const persistCamera = useCallback(() => {
    const ctrl = controlsRef.current
    const mid = modelIdRef.current
    if (!ctrl || !mid) return
    const p = ctrl.object.position
    const t = ctrl.target
    saveCameraState(mid, {
      position: [p.x, p.y, p.z],
      target: [t.x, t.y, t.z],
    })
  }, [])

  // 模型切换或首次加载时恢复视角
  useEffect(() => {
    const ctrl = controlsRef.current
    if (!ctrl) return

    if (currentModelId) {
      const saved = loadCameraState(currentModelId)
      if (saved) {
        ctrl.object.position.set(...saved.position)
        ctrl.target.set(...saved.target)
      } else {
        ctrl.object.position.set(...DEFAULT_POSITION)
        ctrl.target.set(...DEFAULT_TARGET)
      }
    } else {
      ctrl.object.position.set(...DEFAULT_POSITION)
      ctrl.target.set(...DEFAULT_TARGET)
    }
    ctrl.update()
  }, [currentModelId])

  // 定期保存（每 SAVE_INTERVAL ms，仅在相机有变化时写入）
  useFrame(() => {
    const ctrl = controlsRef.current
    if (!ctrl) return

    // 动态调整 near/far 裁剪面
    const camera = ctrl.object
    const distance = camera.position.distanceTo(ctrl.target)
    camera.near = Math.max(0.1, distance * 0.001)
    camera.far = Math.max(3000, distance * 20)
    camera.updateProjectionMatrix()

    // 节流保存
    const now = Date.now()
    if (now - lastSaveRef.current >= SAVE_INTERVAL) {
      lastSaveRef.current = now
      persistCamera()
    }
  })

  // 页面关闭/刷新时保存（处理正常退出）
  useEffect(() => {
    const handleBeforeUnload = () => persistCamera()
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      // 组件卸载时也保存一次
      persistCamera()
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [persistCamera])

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!isDragging && !isBoxSelecting && !isTerrainDrawing}
      maxPolarAngle={Math.PI / 2 - 0.05}
      enableDamping
      dampingFactor={0.1}
      minDistance={5}
      maxDistance={3000}
    />
  )
}
