import { useMemo } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { useSunPosition } from '../../hooks/useSunPosition'
import { useStore } from '../../store/useStore'
import { getSunData, sunToLightPosition } from '../../utils/sunCalc'

/** 太阳轨迹弧线上的采样点数 */
const SAMPLES = 120
/** 太阳轨迹弧线的最小半径 */
const MIN_ARC_RADIUS = 80
/** 弧线半径相对最高建筑的倍数（保证太阳始终高于建筑） */
const ARC_RADIUS_FACTOR = 3.0
/** 太阳球体半径 */
const SUN_RADIUS = 8
/** 太阳光晕半径 */
const SUN_GLOW_RADIUS = 14

export function SunIndicator() {
  const { lightPosition, isNight, altitude } = useSunPosition()
  const location = useStore(s => s.location)
  const dateTime = useStore(s => s.dateTime)
  const buildings = useStore(s => s.buildings)

  // ── 动态弧线半径：根据最高建筑自适应 ──
  const arcRadius = useMemo(() => {
    const maxHeight = buildings.reduce((max, b) => {
      const h = b.params.height ?? 0
      return h > max ? h : max
    }, 0)
    return Math.max(MIN_ARC_RADIUS, maxHeight * ARC_RADIUS_FACTOR)
  }, [buildings])

  // ── 当前太阳位置（归一化到弧线半径） ──
  const sunPos: [number, number, number] = useMemo(() => {
    const len = Math.sqrt(
      lightPosition[0] ** 2 + lightPosition[1] ** 2 + lightPosition[2] ** 2,
    )
    if (len === 0) return [0, arcRadius, 0]
    const scale = arcRadius / len
    return [
      lightPosition[0] * scale,
      Math.max(lightPosition[1] * scale, 2),
      lightPosition[2] * scale,
    ]
  }, [lightPosition, arcRadius])

  // ── 太阳强度和颜色（根据高度角动态变化） ──
  const sunVisuals = useMemo(() => {
    if (isNight) {
      return {
        color: '#4a5568',
        glowColor: '#2d3748',
        glowRadius: SUN_GLOW_RADIUS * 0.5,
        glowOpacity: 0.05,
        intensity: 0.2,
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
        glowRadius: SUN_GLOW_RADIUS * 1.8,
        glowOpacity: 0.4,
        intensity: 0.6,
      }
    } else if (altitudeNorm < 0.3) {
      // 早晨/傍晚：橙色，较大光晕
      const t = (altitudeNorm - 0.15) / 0.15
      return {
        color: '#fb923c',
        glowColor: '#ffedd5',
        glowRadius: SUN_GLOW_RADIUS * (1.8 - t * 0.5),
        glowOpacity: 0.4 - t * 0.1,
        intensity: 0.6 + t * 0.2,
      }
    } else if (altitudeNorm < 0.6) {
      // 上午/下午：金黄色，中等光晕
      const t = (altitudeNorm - 0.3) / 0.3
      return {
        color: '#fbbf24',
        glowColor: '#fde68a',
        glowRadius: SUN_GLOW_RADIUS * (1.3 - t * 0.3),
        glowOpacity: 0.3 - t * 0.1,
        intensity: 0.8 + t * 0.2,
      }
    } else {
      // 中午：亮黄色，小光晕
      const t = (altitudeNorm - 0.6) / 0.4
      return {
        color: '#fde047',
        glowColor: '#fef08a',
        glowRadius: SUN_GLOW_RADIUS * (1.0 - t * 0.2),
        glowOpacity: 0.2 - t * 0.05,
        intensity: 1.0,
      }
    }
  }, [isNight, altitude])

  // ── 全天轨迹弧线（日出→日落） ──
  const pathPoints = useMemo(() => {
    const day = new Date(dateTime)
    day.setHours(0, 0, 0, 0)

    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= SAMPLES; i++) {
      const t = new Date(day.getTime() + (i / SAMPLES) * 86400000)
      const data = getSunData(location.lat, location.lng, t)
      if (data.altitude < 0) continue
      const pos = sunToLightPosition(data.azimuth, data.altitude, arcRadius)
      pts.push(new THREE.Vector3(pos[0], Math.max(pos[1], 0.5), pos[2]))
    }
    return pts
  }, [location.lat, location.lng, dateTime, arcRadius])

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
        <sphereGeometry args={[SUN_RADIUS, 24, 24]} />
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
          dashSize={1.5}
          gapSize={1}
        />
      )}
    </group>
  )
}
