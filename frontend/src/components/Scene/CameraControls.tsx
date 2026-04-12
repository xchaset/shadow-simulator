import { useRef, useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useStore } from '../../store/useStore'

/**
 * 默认视角：从北方（-Z）高处向南俯瞰，能看到地面阴影。
 * 拖拽建筑物时自动禁用轨道控制。
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
