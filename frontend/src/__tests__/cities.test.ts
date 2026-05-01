import { HOT_CITIES, getCityByName } from '../utils/cities'

describe('cities', () => {
  it('should have at least 10 hot cities', () => {
    expect(HOT_CITIES.length).toBeGreaterThanOrEqual(10)
  })

  it('each city should have name, lat, lng', () => {
    HOT_CITIES.forEach(city => {
      expect(city.name).toBeTruthy()
      expect(city.lat).toBeGreaterThan(-90)
      expect(city.lat).toBeLessThan(90)
      expect(city.lng).toBeGreaterThan(-180)
      expect(city.lng).toBeLessThan(180)
    })
  })

  it('should find city by name', () => {
    const beijing = getCityByName('北京')
    expect(beijing).toBeDefined()
    expect(beijing!.lat).toBeCloseTo(39.9042, 1)
  })

  it('should return undefined for unknown city', () => {
    expect(getCityByName('亚特兰蒂斯')).toBeUndefined()
  })
})
