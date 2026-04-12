import { useMemo } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { useSunPosition } from '../../hooks/useSunPosition'
import { useStore } from '../../store/useStore'
import { getSunData, sunToLightPosition } from '../../utils/sunCalc'

/** 太阳轨迹弧线上的采样点数 */
const SAMPLES = 120
/** 太阳指示球 & 轨迹弧线的半径（距场景中心的距离） */
const ARC_RADIUS = 80

export function SunIndicator() {
  const { lightPosition, isNight, altitude } = useSunPosition()
  const location = useStore(s => s.location)
  const dateTime = useStore(s => s.dateTime)

  // ── 当前太阳位置（归一化到弧线半径） ──
  const sunPos: [number, number, number] = useMemo(() => {
    const len = Math.sqrt(
      lightPosition[0] ** 2 + lightPosition[1] ** 2 + lightPosition[2] ** 2,
    )
    if (len === 0) return [0, ARC_RADIUS, 0]
    const scale = ARC_RADIUS / len
    return [
      lightPosition[0] * scale,
      Math.max(lightPosition[1] * scale, 2), // 保证不沉入地面
      lightPosition[2] * scale,
    ]
  }, [lightPosition])

  // ── 全天轨迹弧线（日出→日落） ──
  const pathPoints = useMemo(() => {
    const day = new Date(dateTime)
    day.setHours(0, 0, 0, 0)

    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= SAMPLES; i++) {
      const t = new Date(day.getTime() + (i / SAMPLES) * 86400000)
      const data = getSunData(location.lat, location.lng, t)
      // 只画地平线以上的部分
      if (data.altitude < 0) continue
      const pos = sunToLightPosition(data.azimuth, data.altitude, ARC_RADIUS)
      pts.push(new THREE.Vector3(pos[0], Math.max(pos[1], 0.5), pos[2]))
    }
    return pts
  }, [location.lat, location.lng, dateTime])

  // ── 太阳到地面的投影虚线 ──
  const projLine = useMemo(() => {
    if (altitude <= 0) return null
    return [
      new THREE.Vector3(sunPos[0], sunPos[1], sunPos[2]),
      new THREE.Vector3(sunPos[0], 0.2, sunPos[2]),
    ]
  }, [sunPos, altitude])

  return (
    <group>
      {/* 轨迹弧线 */}
      {pathPoints.length >= 2 && (
        <Line
          points={pathPoints}
          color="#f59e0b"
          lineWidth={1.5}
          transparent
          opacity={0.45}
          dashed
          dashSize={2}
          gapSize={1}
        />
      )}

      {/* 太阳球体 */}
      <mesh position={sunPos}>
        <sphereGeometry args={[2.5, 24, 24]} />
        <meshBasicMaterial
          color={isNight ? '#4a5568' : '#fbbf24'}
        />
      </mesh>

      {/* 太阳光晕 */}
      {!isNight && (
        <mesh position={sunPos}>
          <sphereGeometry args={[4, 24, 24]} />
          <meshBasicMaterial
            color="#fde68a"
            transparent
            opacity={0.2}
          />
        </mesh>
      )}

      {/* 投影虚线（太阳 → 地面） */}
      {projLine && (
        <Line
          points={projLine}
          color="#f59e0b"
          lineWidth={1}
          transparent
          opacity={0.3}
          dashed
          dashSize={1.5}
          gapSize={1}
        />
      )}
    </group>
  )
}
