import { saveScene, loadScene, exportSceneJSON, importSceneJSON } from '../utils/storage'
import type { Building, Location } from '../types'

describe('storage', () => {
  const mockBuildings: Building[] = [
    {
      id: 'test-1',
      name: 'Test Building',
      type: 'box',
      params: { width: 20, depth: 15, height: 50 },
      position: [10, 20],
      rotation: 45,
      color: '#888',
    },
  ]
  const mockLocation: Location = { lat: 39.9, lng: 116.4, cityName: '北京' }
  const mockDate = new Date(2026, 3, 11, 14, 0, 0)

  beforeEach(() => {
    localStorage.clear()
  })

  it('should save and load scene from localStorage', () => {
    saveScene(mockBuildings, mockLocation, mockDate)
    const loaded = loadScene()
    expect(loaded).not.toBeNull()
    expect(loaded!.buildings).toHaveLength(1)
    expect(loaded!.buildings[0].id).toBe('test-1')
    expect(loaded!.location.cityName).toBe('北京')
  })

  it('should return null when no saved scene', () => {
    expect(loadScene()).toBeNull()
  })

  it('should export scene as JSON string', () => {
    const json = exportSceneJSON(mockBuildings, mockLocation, mockDate)
    const parsed = JSON.parse(json)
    expect(parsed.buildings).toHaveLength(1)
    expect(parsed.location.cityName).toBe('北京')
    expect(parsed.dateTime).toBeDefined()
  })

  it('should import scene from JSON string', () => {
    const json = exportSceneJSON(mockBuildings, mockLocation, mockDate)
    const result = importSceneJSON(json)
    expect(result).not.toBeNull()
    expect(result!.buildings[0].type).toBe('box')
  })

  it('should return null for invalid JSON', () => {
    expect(importSceneJSON('not json')).toBeNull()
    expect(importSceneJSON('{"invalid": true}')).toBeNull()
  })
})
