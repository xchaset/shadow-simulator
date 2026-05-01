import * as THREE from 'three'
import { createBuildingGeometries } from '../components/Buildings/BuildingFactory'

describe('BuildingFactory', () => {
  const types = [
    'box', 'cylinder', 'prism', 'l-shape', 'u-shape',
    't-shape', 'stepped', 'podium-tower', 'dome', 'gable-roof',
  ] as const

  types.forEach(type => {
    it(`should create geometry for ${type}`, () => {
      const result = createBuildingGeometries(type, undefined)
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
      result.forEach(item => {
        expect(item.geometry).toBeInstanceOf(THREE.BufferGeometry)
        expect(item.position).toBeDefined()
        expect(item.position).toHaveLength(3)
      })
    })
  })

  it('should accept custom params for box', () => {
    const result = createBuildingGeometries('box', { width: 30, depth: 20, height: 100 })
    expect(result).toHaveLength(1)
    // Position Y should be half the height
    expect(result[0].position[1]).toBeCloseTo(50)
  })

  it('should create multiple geometries for composite shapes', () => {
    const lResult = createBuildingGeometries('l-shape', undefined)
    expect(lResult.length).toBeGreaterThanOrEqual(2)

    const podiumResult = createBuildingGeometries('podium-tower', undefined)
    expect(podiumResult.length).toBeGreaterThanOrEqual(2)
  })
})
