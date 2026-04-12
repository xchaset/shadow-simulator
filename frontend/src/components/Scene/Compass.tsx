import { Text } from '@react-three/drei'
import * as THREE from 'three'

/**
 * 在地面边缘标注东西南北方位
 *
 * 坐标系映射（SunCalc 约定）:
 *   +Z = 南 (S)
 *   -Z = 北 (N)
 *   +X = 西 (W)
 *   -X = 东 (E)
 */

const GROUND_HALF = 100 // 地面 200×200 的一半
const LABEL_OFFSET = GROUND_HALF + 6 // 标注放在地面边缘外侧
const FONT_SIZE = 6
const FONT_COLOR = '#666666'
const ACCENT_COLOR = '#dc2626' // 北（红色突出）

interface CompassLabelProps {
  text: string
  position: [number, number, number]
  color?: string
}

function CompassLabel({ text, position, color = FONT_COLOR }: CompassLabelProps) {
  return (
    <Text
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={FONT_SIZE}
      color={color}
      anchorX="center"
      anchorY="middle"
      font={undefined}
    >
      {text}
    </Text>
  )
}

/** 地面上的十字方位线 */
function CompassLines() {
  const material = new THREE.LineBasicMaterial({
    color: '#999999',
    transparent: true,
    opacity: 0.4,
  })

  const nsGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.05, -GROUND_HALF),
    new THREE.Vector3(0, 0.05, GROUND_HALF),
  ])

  const ewGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-GROUND_HALF, 0.05, 0),
    new THREE.Vector3(GROUND_HALF, 0.05, 0),
  ])

  return (
    <group>
      <lineSegments geometry={nsGeom} material={material} />
      <lineSegments geometry={ewGeom} material={material} />
    </group>
  )
}

export function Compass() {
  return (
    <group>
      {/* 方位文字 */}
      <CompassLabel text="N 北" position={[0, 0.1, -LABEL_OFFSET]} color={ACCENT_COLOR} />
      <CompassLabel text="S 南" position={[0, 0.1, LABEL_OFFSET]} />
      <CompassLabel text="E 东" position={[-LABEL_OFFSET, 0.1, 0]} />
      <CompassLabel text="W 西" position={[LABEL_OFFSET, 0.1, 0]} />

      {/* 十字方位线 */}
      <CompassLines />
    </group>
  )
}
