import type { Building, BuildingType, Location, SunData, AppState } from '../types'

describe('Type definitions', () => {
  it('should create a valid Building object', () => {
    const building: Building = {
      id: 'test-1',
      name: '测试建筑',
      type: 'box',
      params: { width: 20, depth: 15, height: 50 },
      position: [0, 0],
      rotation: 0,
      color: '#8899aa',
    }
    expect(building.id).toBe('test-1')
    expect(building.type).toBe('box')
  })

  it('should create a valid Location object', () => {
    const loc: Location = {
      lat: 39.9042,
      lng: 116.4074,
      cityName: '北京',
    }
    expect(loc.lat).toBeCloseTo(39.9042)
  })

  it('should create a valid SunData object', () => {
    const sun: SunData = {
      azimuth: 3.14,
      altitude: 0.8,
      sunrise: new Date('2026-04-11T06:12:00'),
      sunset: new Date('2026-04-11T18:34:00'),
      isNight: false,
    }
    expect(sun.isNight).toBe(false)
  })
})
