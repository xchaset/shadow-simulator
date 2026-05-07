import type { TerrainData, LakeRegion } from '../types'

const TERRAIN_RESOLUTION = 128
const DEFAULT_TERRAIN_COLOR: [number, number, number] = [139 / 255, 115 / 255, 85 / 255]

export function remapTerrainData(
  terrainData: TerrainData,
  oldCanvasSize: number,
  newCanvasSize: number
): TerrainData {
  if (oldCanvasSize === newCanvasSize || !terrainData) return terrainData

  const resolution = terrainData.resolution
  const oldHalfSize = oldCanvasSize / 2
  const newHalfSize = newCanvasSize / 2

  const newHeights = new Float32Array(resolution * resolution)
  const newWaterMask = terrainData.waterMask ? new Uint8Array(resolution * resolution) : undefined
  const newColorData = terrainData.colorData ? new Float32Array(resolution * resolution * 3) : undefined

  for (let iy = 0; iy < resolution; iy++) {
    for (let ix = 0; ix < resolution; ix++) {
      const newIdx = iy * resolution + ix

      const u = ix / (resolution - 1)
      const v = iy / (resolution - 1)

      const worldX = (u - 0.5) * newCanvasSize
      const worldZ = (v - 0.5) * newCanvasSize

      const oldU = (worldX + oldHalfSize) / oldCanvasSize
      const oldV = (worldZ + oldHalfSize) / oldCanvasSize

      if (oldU >= 0 && oldU <= 1 && oldV >= 0 && oldV <= 1) {
        const fx = oldU * (resolution - 1)
        const fy = oldV * (resolution - 1)

        const x0 = Math.floor(fx)
        const y0 = Math.floor(fy)
        const x1 = Math.min(x0 + 1, resolution - 1)
        const y1 = Math.min(y0 + 1, resolution - 1)

        const tx = fx - x0
        const ty = fy - y0

        const heights = terrainData.heights as Float32Array
        const h00 = heights[y0 * resolution + x0]
        const h10 = heights[y0 * resolution + x1]
        const h01 = heights[y1 * resolution + x0]
        const h11 = heights[y1 * resolution + x1]

        const h0 = h00 * (1 - tx) + h10 * tx
        const h1 = h01 * (1 - tx) + h10 * tx
        const height = h0 * (1 - ty) + h1 * ty

        newHeights[newIdx] = height

        if (newWaterMask && terrainData.waterMask) {
          const waterMask = terrainData.waterMask as Uint8Array
          let waterCount = 0
          if (waterMask[y0 * resolution + x0]) waterCount++
          if (waterMask[y0 * resolution + x1]) waterCount++
          if (waterMask[y1 * resolution + x0]) waterCount++
          if (waterMask[y1 * resolution + x1]) waterCount++

          newWaterMask[newIdx] = waterCount >= 2 ? 1 : 0
        }

        if (newColorData && terrainData.colorData) {
          const colorData = terrainData.colorData as Float32Array
          
          const idx00 = (y0 * resolution + x0) * 3
          const idx10 = (y0 * resolution + x1) * 3
          const idx01 = (y1 * resolution + x0) * 3
          const idx11 = (y1 * resolution + x1) * 3

          const r00 = colorData[idx00]
          const r10 = colorData[idx10]
          const r01 = colorData[idx01]
          const r11 = colorData[idx11]

          const g00 = colorData[idx00 + 1]
          const g10 = colorData[idx10 + 1]
          const g01 = colorData[idx01 + 1]
          const g11 = colorData[idx11 + 1]

          const b00 = colorData[idx00 + 2]
          const b10 = colorData[idx10 + 2]
          const b01 = colorData[idx01 + 2]
          const b11 = colorData[idx11 + 2]

          const r0 = r00 * (1 - tx) + r10 * tx
          const r1 = r01 * (1 - tx) + r11 * tx
          const r = r0 * (1 - ty) + r1 * ty

          const g0 = g00 * (1 - tx) + g10 * tx
          const g1 = g01 * (1 - tx) + g11 * tx
          const g = g0 * (1 - ty) + g1 * ty

          const b0 = b00 * (1 - tx) + b10 * tx
          const b1 = b01 * (1 - tx) + b11 * tx
          const b = b0 * (1 - ty) + b1 * ty

          const newColorIdx = newIdx * 3
          newColorData[newColorIdx] = r
          newColorData[newColorIdx + 1] = g
          newColorData[newColorIdx + 2] = b
        }
      } else {
        newHeights[newIdx] = 0
        if (newWaterMask) {
          newWaterMask[newIdx] = 0
        }
        if (newColorData) {
          const newColorIdx = newIdx * 3
          newColorData[newColorIdx] = DEFAULT_TERRAIN_COLOR[0]
          newColorData[newColorIdx + 1] = DEFAULT_TERRAIN_COLOR[1]
          newColorData[newColorIdx + 2] = DEFAULT_TERRAIN_COLOR[2]
        }
      }
    }
  }

  return {
    resolution: terrainData.resolution,
    heights: newHeights,
    maxHeight: terrainData.maxHeight,
    waterMask: newWaterMask,
    colorData: newColorData,
  }
}

export function getTerrainHeightAt(
  wx: number,
  wz: number,
  terrainData: TerrainData | null,
  canvasSize: number
): number {
  if (!terrainData) return 0

  const halfSize = canvasSize / 2
  const u = (wx + halfSize) / canvasSize
  const v = (wz + halfSize) / canvasSize

  if (u < 0 || u > 1 || v < 0 || v > 1) return 0

  const resolution = terrainData.resolution
  const fx = u * (resolution - 1)
  const fy = v * (resolution - 1)

  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const x1 = Math.min(x0 + 1, resolution - 1)
  const y1 = Math.min(y0 + 1, resolution - 1)

  const tx = fx - x0
  const ty = fy - y0

  const heights = terrainData.heights as Float32Array

  const h00 = heights[y0 * resolution + x0]
  const h10 = heights[y0 * resolution + x1]
  const h01 = heights[y1 * resolution + x0]
  const h11 = heights[y1 * resolution + x1]

  const h0 = h00 * (1 - tx) + h10 * tx
  const h1 = h01 * (1 - tx) + h10 * tx

  return h0 * (1 - ty) + h1 * ty
}

export function updateBuildingHeightsForTerrain(
  buildings: any[],
  terrainData: TerrainData | null,
  canvasSize: number
): any[] {
  if (!terrainData || buildings.length === 0) return buildings

  return buildings.map(b => {
    const newHeight = getTerrainHeightAt(b.position[0], b.position[1], terrainData, canvasSize)
    if (Math.abs((b.baseHeight ?? 0) - newHeight) < 0.01) return b
    return { ...b, baseHeight: newHeight }
  })
}
