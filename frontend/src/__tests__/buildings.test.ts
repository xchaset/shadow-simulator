import { BUILDING_PRESETS, getDefaultParams, createBuilding } from '../utils/buildings'
import type { BuildingType } from '../types'

describe('buildings', () => {
  it('should have presets for all building types', () => {
    const types: BuildingType[] = [
      'box', 'cylinder', 'prism', 'l-shape', 'u-shape',
      't-shape', 'stepped', 'podium-tower', 'dome', 'gable-roof',
    ]
    types.forEach(t => {
      expect(BUILDING_PRESETS[t]).toBeDefined()
      expect(BUILDING_PRESETS[t].label).toBeTruthy()
    })
  })

  it('should return default params for each type', () => {
    const params = getDefaultParams('box')
    expect(params.width).toBeGreaterThan(0)
    expect(params.depth).toBeGreaterThan(0)
    expect(params.height).toBeGreaterThan(0)
  })

  it('should create a building with unique id', () => {
    const b1 = createBuilding('box')
    const b2 = createBuilding('box')
    expect(b1.id).not.toBe(b2.id)
    expect(b1.type).toBe('box')
    expect(b1.params.width).toBeGreaterThan(0)
  })

  it('should create building with custom position', () => {
    const b = createBuilding('cylinder', [10, 20])
    expect(b.position).toEqual([10, 20])
  })

  it('should assign different colors to different buildings', () => {
    const colors = new Set()
    for (let i = 0; i < 5; i++) {
      colors.add(createBuilding('box').color)
    }
    expect(colors.size).toBeGreaterThan(1)
  })
})
