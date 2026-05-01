import SunCalc from 'suncalc'
import type { SunData } from '../types'

export function getSunData(lat: number, lng: number, date: Date): SunData {
  const position = SunCalc.getPosition(date, lat, lng)
  const times = SunCalc.getTimes(date, lat, lng)

  return {
    azimuth: position.azimuth,
    altitude: position.altitude,
    sunrise: times.sunrise,
    sunset: times.sunset,
    isNight: position.altitude < 0,
  }
}

export function sunToLightPosition(
  azimuth: number,
  altitude: number,
  distance = 500,  // 增加距离，让阴影相机有更好的视角
): [number, number, number] {
  // SunCalc azimuth: 0=South, clockwise (S→W→N→E)
  // Three.js (Y-up, right-handed): +Z=South, -Z=North, +X=East, -X=West
  // Negate X so clockwise-from-south maps correctly: West→-X, East→+X
  const x = -distance * Math.cos(altitude) * Math.sin(azimuth)
  const y = distance * Math.sin(altitude)
  const z = distance * Math.cos(altitude) * Math.cos(azimuth)
  return [x, y, z]
}

/**
 * 根据太阳高度角计算阴影相机的边界
 * 当太阳角度低时，阴影会延伸很远，需要更大的视锥体
 */
export function calculateShadowCameraBounds(altitude: number): {
  size: number
  far: number
} {
  // 假设场景中最高建筑为 100m
  const maxBuildingHeight = 100
  
  // 当太阳高度角很低时，阴影长度 = 建筑高度 / tan(高度角)
  // 限制最小角度为 5° 以避免无限大的阴影
  const minAltitude = Math.max(altitude, 5 * Math.PI / 180)
  
  // 计算最大阴影长度
  const maxShadowLength = maxBuildingHeight / Math.tan(minAltitude)
  
  // 阴影相机边界需要覆盖：场景大小(500) + 阴影延伸长度
  // 使用 1.2 倍的安全系数
  const requiredSize = Math.max(300, (500 + maxShadowLength) * 0.6)
  
  // 限制最大边界，避免阴影贴图质量过低
  const size = Math.min(requiredSize, 1500)
  
  // far 平面需要足够远以覆盖整个场景深度
  const far = Math.max(1000, size * 2)
  
  return { size, far }
}

export function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

export function getDaylightDuration(sunrise: Date, sunset: Date): string {
  const diffMs = sunset.getTime() - sunrise.getTime()
  const hours = Math.floor(diffMs / 3600000)
  const minutes = Math.floor((diffMs % 3600000) / 60000)
  return `${hours}h ${minutes}min`
}
