import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { getSunData, sunToLightPosition, calculateShadowCameraBounds } from '../utils/sunCalc'

export function useSunPosition() {
  const location = useStore(s => s.location)
  const dateTime = useStore(s => s.dateTime)
  const canvasSize = useStore(s => s.canvasSize)

  const sunData = useMemo(
    () => getSunData(location.lat, location.lng, dateTime),
    [location.lat, location.lng, dateTime],
  )

  const lightPosition = useMemo(() => {
    // 根据场景大小动态计算光源距离，确保光源在场景外部
    // 使用场景大小的 0.75 倍作为基础距离，再加上额外的安全距离
    const baseDistance = canvasSize * 0.75
    const additionalDistance = 500 // 额外的安全距离，确保低角度太阳时也有足够距离
    const distance = baseDistance + additionalDistance
    return sunToLightPosition(sunData.azimuth, sunData.altitude, distance)
  }, [sunData.azimuth, sunData.altitude, canvasSize])

  const shadowBounds = useMemo(
    () => calculateShadowCameraBounds(sunData.altitude, canvasSize),
    [sunData.altitude, canvasSize],
  )

  const ambientIntensity = useMemo(() => {
    if (sunData.isNight) return 0.1
    return Math.max(0.15, Math.min(0.6, sunData.altitude / (Math.PI / 2) * 0.6))
  }, [sunData.altitude, sunData.isNight])

  const directionalIntensity = useMemo(() => {
    if (sunData.isNight) return 0
    return Math.max(0, Math.min(2.0, sunData.altitude / (Math.PI / 4) * 1.5))
  }, [sunData.altitude, sunData.isNight])

  return {
    ...sunData,
    lightPosition,
    shadowBounds,
    ambientIntensity,
    directionalIntensity,
  }
}
