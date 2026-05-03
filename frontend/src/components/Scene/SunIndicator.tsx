import { useMemo } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { useSunPosition } from '../../hooks/useSunPosition'
import { useStore } from '../../store/useStore'
import { getSunData, sunToLightPosition } from '../../utils/sunCalc'

/** 太阳轨迹弧线上的采样点数 */
const SAMPLES = 120
/** 默认光源距离（用于计算太阳指示器的基准大小） */
const DEFAULT_LIGHT_DISTANCE = 500
/** 太阳球体半径 */
const SUN_RADIUS = 8
/** 太阳光晕半径 */
const SUN_GLOW_RADIUS = 14

export function SunIndicator() {
  const { lightPosition, isNight, altitude } = useSunPosition()
  const location = useStore(s => s.location)
  const dateTime = useStore(s => s.dateTime)

  // 计算光源到场景中心的距离
  const lightDistance = useMemo(() => {
    return Math.sqrt(
      lightPosition[0] ** 2 + lightPosition[1] ** 2 + lightPosition[2] ** 2,
    )
  }, [lightPosition])

  // 计算太阳指示器的缩放因子，使其在任何距离下都有合适的视觉大小
  const sunScale = useMemo(() => {
    return Math.max(1, lightDistance / DEFAULT_LIGHT_DISTANCE)
  }, [lightDistance])

  // ── 当前太阳位置（直接使用 lightPosition，不进行归一化，确保方向一致） ──
  const sunPos: [number, number, number] = useMemo(() => {
    if (lightDistance === 0) return [0, DEFAULT_LIGHT_DISTANCE, 0]
    return [
      lightPosition[0],
      Math.max(lightPosition[1], 2 * sunScale),
      lightPosition[2],
    ]
  }, [lightPosition, lightDistance, sunScale])

  // ── 太阳强度和颜色（根据高度角动态变化） ──
  const sunVisuals = useMemo(() => {
    if (isNight) {
      return {
        color: '#4a5568',
        glowColor: '#2d3748',
        glowRadius: SUN_GLOW_RADIUS * 0.5 * sunScale,
        glowOpacity: 0.05,
        intensity: 0.2,
        sunRadius: SUN_RADIUS * sunScale,
      }
    }

    // 太阳高度角归一化 (0~1)
    const altitudeNorm = Math.max(0, Math.min(1, altitude / (Math.PI / 2)))
    
    // 早晨/黄昏 (altitude < 0.3): 橙色、强光晕
    // 中午 (altitude > 0.6): 亮黄色、弱光晕
    if (altitudeNorm < 0.15) {
      // 日出/日落：深橙色，大光晕
      return {
        color: '#f97316',
        glowColor: '#fed7aa',
        glowRadius: SUN_GLOW_RADIUS * 1.8 * sunScale,
        glowOpacity: 0.4,
        intensity: 0.6,
        sunRadius: SUN_RADIUS * sunScale,
      }
    } else if (altitudeNorm < 0.3) {
      // 早晨/傍晚：橙色，较大光晕
      const t = (altitudeNorm - 0.15) / 0.15
      return {
        color: '#fb923c',
        glowColor: '#ffedd5',
        glowRadius: SUN_GLOW_RADIUS * (1.8 - t * 0.5) * sunScale,
        glowOpacity: 0.4 - t * 0.1,
        intensity: 0.6 + t * 0.2,
        sunRadius: SUN_RADIUS * sunScale,
      }
    } else if (altitudeNorm < 0.6) {
      // 上午/下午：金黄色，中等光晕
      const t = (altitudeNorm - 0.3) / 0.3
      return {
        color: '#fbbf24',
        glowColor: '#fde68a',
        glowRadius: SUN_GLOW_RADIUS * (1.3 - t * 0.3) * sunScale,
        glowOpacity: 0.3 - t * 0.1,
        intensity: 0.8 + t * 0.2,
        sunRadius: SUN_RADIUS * sunScale,
      }
    } else {
      // 中午：亮黄色，小光晕
      const t = (altitudeNorm - 0.6) / 0.4
      return {
        color: '#fde047',
        glowColor: '#fef08a',
        glowRadius: SUN_GLOW_RADIUS * (1.0 - t * 0.2) * sunScale,
        glowOpacity: 0.2 - t * 0.05,
        intensity: 1.0,
        sunRadius: SUN_RADIUS * sunScale,
      }
    }
  }, [isNight, altitude, sunScale])

  // ── 全天轨迹弧线（日出→日落）：使用与 lightPosition 相同的距离 ──
  const pathPoints = useMemo(() => {
    const day = new Date(dateTime)
    day.setHours(0, 0, 0, 0)

    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= SAMPLES; i++) {
      const t = new Date(day.getTime() + (i / SAMPLES) * 86400000)
      const data = getSunData(location.lat, location.lng, t)
      if (data.altitude < 0) continue
      // 使用与当前 lightPosition 相同的距离，确保轨迹线与太阳位置一致
      const pos = sunToLightPosition(data.azimuth, data.altitude, lightDistance)
      pts.push(new THREE.Vector3(pos[0], Math.max(pos[1], 0.5 * sunScale), pos[2]))
    }
    return pts
  }, [location.lat, location.lng, dateTime, lightDistance, sunScale])

  // ── 太阳到地面的投影虚线 ──
  const projLine = useMemo(() => {
    if (altitude <= 0) return null
    return [
      new THREE.Vector3(sunPos[0], sunPos[1], sunPos[2]),
      new THREE.Vector3(sunPos[0], 0.2 * sunScale, sunPos[2]),
    ]
  }, [sunPos, altitude, sunScale])

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
          dashSize={2 * sunScale}
          gapSize={1 * sunScale}
        />
      )}

      {/* 太阳球体 */}
      <mesh position={sunPos}>
        <sphereGeometry args={[sunVisuals.sunRadius, 24, 24]} />
        <meshBasicMaterial
          color={sunVisuals.color}
        />
      </mesh>

      {/* 太阳光晕（随时间动态变化） */}
      <mesh position={sunPos}>
        <sphereGeometry args={[sunVisuals.glowRadius, 24, 24]} />
        <meshBasicMaterial
          color={sunVisuals.glowColor}
          transparent
          opacity={sunVisuals.glowOpacity}
        />
      </mesh>

      {/* 投影虚线（太阳 → 地面） */}
      {projLine && (
        <Line
          points={projLine}
          color="#f59e0b"
          lineWidth={1}
          transparent
          opacity={0.3}
          dashed
          dashSize={1.5 * sunScale}
          gapSize={1 * sunScale}
        />
      )}
    </group>
  )
}
