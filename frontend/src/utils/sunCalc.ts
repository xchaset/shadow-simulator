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
  distance = 100,
): [number, number, number] {
  // SunCalc azimuth: 0=South, clockwise (S→W→N→E)
  // Three.js (Y-up, right-handed): +Z=South, -Z=North, +X=East, -X=West
  // Negate X so clockwise-from-south maps correctly: West→-X, East→+X
  const x = -distance * Math.cos(altitude) * Math.sin(azimuth)
  const y = distance * Math.sin(altitude)
  const z = distance * Math.cos(altitude) * Math.cos(azimuth)
  return [x, y, z]
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
