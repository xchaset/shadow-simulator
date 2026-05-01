import { useRef, useMemo } from 'react'
import * as THREE from 'three'

interface SelectionBoxProps {
  start: [number, number] | null
  end: [number, number] | null
}

/**
 * 框选矩形可视化组件
 * 在 3D 地面上绘制半透明的选择矩形
 */
export function SelectionBox({ start, end }: SelectionBoxProps) {
  const lineRef = useRef<THREE.LineSegments>(null)

  // 计算矩形顶点
  const points = useMemo(() => {
    if (!start || !end) return null

    const minX = Math.min(start[0], end[0])
    const maxX = Math.max(start[0], end[0])
    const minZ = Math.min(start[1], end[1])
    const maxZ = Math.max(start[1], end[1])

    // 矩形四个角 + 回到起点（闭合）
    const vertices = new Float32Array([
      minX, 0.05, minZ,  // 左下
      maxX, 0.05, minZ,  // 右下
      maxX, 0.05, minZ,  // 右下
      maxX, 0.05, maxZ,  // 右上
      maxX, 0.05, maxZ,  // 右上
      minX, 0.05, maxZ,  // 左上
      minX, 0.05, maxZ,  // 左上
      minX, 0.05, minZ,  // 左下
    ])

    return vertices
  }, [start, end])

  if (!points) return null

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(points, 3))

  return (
    <lineSegments ref={lineRef}>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color="#1677ff" linewidth={2} />
    </lineSegments>
  )
}
