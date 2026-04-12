import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { getSunData, sunToLightPosition, calculateShadowCameraBounds } from '../utils/sunCalc'

export function useSunPosition() {
  const location = useStore(s => s.location)
  const dateTime = useStore(s => s.dateTime)

  const sunData = useMemo(
    () => getSunData(location.lat, location.lng, dateTime),
    [location.lat, location.lng, dateTime],
  )

  const lightPosition = useMemo(
    () => sunToLightPosition(sunData.azimuth, sunData.altitude),
    [sunData.azimuth, sunData.altitude],
  )

  const shadowBounds = useMemo(
    () => calculateShadowCameraBounds(sunData.altitude),
    [sunData.altitude],
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
