import { getSunData, sunToLightPosition, formatTime, getDaylightDuration } from '../utils/sunCalc'

describe('sunCalc', () => {
  const beijing = { lat: 39.9042, lng: 116.4074 }
  const summerDate = new Date(2026, 5, 21, 12, 0, 0) // June 21 noon

  it('should calculate sun position for Beijing summer noon', () => {
    const data = getSunData(beijing.lat, beijing.lng, summerDate)
    expect(data.altitude).toBeGreaterThan(1.0)
    expect(data.isNight).toBe(false)
  })

  it('should calculate sunrise and sunset', () => {
    const data = getSunData(beijing.lat, beijing.lng, summerDate)
    expect(data.sunrise).toBeInstanceOf(Date)
    expect(data.sunset).toBeInstanceOf(Date)
    expect(data.sunrise.getHours()).toBeLessThanOrEqual(6)
    expect(data.sunset.getHours()).toBeGreaterThanOrEqual(19)
  })

  it('should detect night time', () => {
    const nightDate = new Date(2026, 5, 21, 2, 0, 0)
    const data = getSunData(beijing.lat, beijing.lng, nightDate)
    expect(data.isNight).toBe(true)
  })

  it('should convert sun position to 3D light coordinates', () => {
    const pos = sunToLightPosition(Math.PI / 4, Math.PI / 4, 100)
    expect(pos).toHaveLength(3)
    expect(pos[1]).toBeGreaterThan(0)
  })

  it('should return [0,0,0]-ish when sun is below horizon', () => {
    const pos = sunToLightPosition(0, -0.1, 100)
    expect(pos[1]).toBeLessThan(0)
  })

  it('formatTime should format date to HH:MM', () => {
    const d = new Date(2026, 0, 1, 6, 5, 0)
    expect(formatTime(d)).toBe('06:05')
  })

  it('getDaylightDuration should return readable duration', () => {
    const sunrise = new Date(2026, 0, 1, 6, 0, 0)
    const sunset = new Date(2026, 0, 1, 18, 30, 0)
    expect(getDaylightDuration(sunrise, sunset)).toBe('12h 30min')
  })
})
