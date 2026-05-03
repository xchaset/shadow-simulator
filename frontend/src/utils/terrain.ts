import type { TerrainData, LakeRegion } from '../types'

const TERRAIN_RESOLUTION = 128

/**
 * 根据世界坐标采样地形高度
 * @param wx 世界 X 坐标
 * @param wz 世界 Z 坐标
 * @param terrainData 地形数据
 * @param canvasSize 画布尺寸
 * @returns 该位置的地形高度，无地形时返回 0
 */
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

  // 超出画布范围
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

  // 双线性插值
  const h00 = heights[y0 * resolution + x0]
  const h10 = heights[y0 * resolution + x1]
  const h01 = heights[y1 * resolution + x0]
  const h11 = heights[y1 * resolution + x1]

  const h0 = h00 * (1 - tx) + h10 * tx
  const h1 = h01 * (1 - tx) + h11 * tx

  return h0 * (1 - ty) + h1 * ty
}

/**
 * 批量更新建筑高度以贴合地形
 * @returns 是否需要更新（地形存在且有建筑）
 */
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
