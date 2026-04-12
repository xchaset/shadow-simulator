import { useRef, useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../../store/useStore'

/**
 * 默认视角：从北方（-Z）高处向南俯瞰，能看到地面阴影。
 * 拖拽建筑物时自动禁用轨道控制。
 * 动态调整 near/far 裁剪面，避免缩放时出现渲染空白。
 */
export function CameraControls() {
  const controlsRef = useRef<any>(null)
  const isDragging = useStore(s => s.isDragging)

  // 初始化相机位置：从北方看向原点
  useEffect(() => {
    const ctrl = controlsRef.current
    if (!ctrl) return
    ctrl.object.position.set(0, 100, -130)
    ctrl.target.set(0, 0, 0)
    ctrl.update()
  }, [])

  // 动态调整 near/far 裁剪面，根据相机到目标的距离自适应
  useFrame(() => {
    const ctrl = controlsRef.current
    if (!ctrl) return
    const camera = ctrl.object
    const distance = camera.position.distanceTo(ctrl.target)

    // near 取距离的 0.1%（最小 0.1），far 取距离的 20 倍（最小 3000）
    camera.near = Math.max(0.1, distance * 0.001)
    camera.far = Math.max(3000, distance * 20)
    camera.updateProjectionMatrix()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!isDragging}
      maxPolarAngle={Math.PI / 2 - 0.05}
      enableDamping
      dampingFactor={0.1}
      minDistance={5}
      maxDistance={1500}
    />
  )
}
