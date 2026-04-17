import { useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useStore } from '../../store/useStore'
import * as THREE from 'three'

/**
 * 调试组件 - 在 3D 场景中显示建筑物的位置标记
 */
export function DebugMarkers() {
  const buildings = useStore(s => s.buildings)
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)

  if (buildings.length === 0) return null

  return (
    <group ref={groupRef}>
      {/* 为每个建筑物添加红色标记点 */}
      {buildings.slice(0, 10).map((b) => (
        <mesh
          key={b.id}
          position={[b.position[0], (b.height ?? 0) + 0.5, b.position[1]]}
        >
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      ))}
      {/* 原点标记（黄色大球） */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      {/* 坐标轴 */}
      <axesHelper args={[50]} />
    </group>
  )
}
