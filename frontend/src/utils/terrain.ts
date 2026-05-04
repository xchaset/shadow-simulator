import type { TerrainData, LakeRegion } from '../types'

const TERRAIN_RESOLUTION = 128

/**
 * 重新映射地形数据，使其在画布尺寸变化时保持在相同的世界位置
 * @param terrainData 原始地形数据
 * @param oldCanvasSize 旧画布尺寸
 * @param newCanvasSize 新画布尺寸
 * @returns 重新映射后的地形数据
 */
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

  // 遍历新地形的每个顶点，计算对应的世界坐标
  // 然后根据旧画布尺寸，从旧地形数据中采样高度
  for (let iy = 0; iy < resolution; iy++) {
    for (let ix = 0; ix < resolution; ix++) {
      const newIdx = iy * resolution + ix

      // 计算新地形中该索引对应的世界坐标
      // u, v 范围: 0 ~ 1
      const u = ix / (resolution - 1)
      const v = iy / (resolution - 1)

      // 世界坐标
      const worldX = (u - 0.5) * newCanvasSize
      const worldZ = (v - 0.5) * newCanvasSize

      // 计算这个世界坐标在旧画布中的相对位置
      const oldU = (worldX + oldHalfSize) / oldCanvasSize
      const oldV = (worldZ + oldHalfSize) / oldCanvasSize

      // 如果在旧画布范围内，进行双线性插值采样
      if (oldU >= 0 && oldU <= 1 && oldV >= 0 && oldV <= 1) {
        const fx = oldU * (resolution - 1)
        const fy = oldV * (resolution - 1)

        const x0 = Math.floor(fx)
        const y0 = Math.floor(fy)
        const x1 = Math.min(x0 + 1, resolution - 1)
        const y1 = Math.min(y0 + 1, resolution - 1)

        const tx = fx - x0
        const ty = fy - y0

        // 高度双线性插值
        const heights = terrainData.heights as Float32Array
        const h00 = heights[y0 * resolution + x0]
        const h10 = heights[y0 * resolution + x1]
        const h01 = heights[y1 * resolution + x0]
        const h11 = heights[y1 * resolution + x1]

        const h0 = h00 * (1 - tx) + h10 * tx
        const h1 = h01 * (1 - tx) + h10 * tx
        const height = h0 * (1 - ty) + h1 * ty

        newHeights[newIdx] = height

        // 水标记双线性插值（取最近邻或阈值插值）
        if (newWaterMask && terrainData.waterMask) {
          const waterMask = terrainData.waterMask as Uint8Array
          // 对于水标记，使用最近邻插值或简单阈值
          // 这里使用简单的方式：如果周围超过一半是水，则标记为水
          let waterCount = 0
          if (waterMask[y0 * resolution + x0]) waterCount++
          if (waterMask[y0 * resolution + x1]) waterCount++
          if (waterMask[y1 * resolution + x0]) waterCount++
          if (waterMask[y1 * resolution + x1]) waterCount++

          newWaterMask[newIdx] = waterCount >= 2 ? 1 : 0
        }
      } else {
        // 超出旧画布范围，保持默认值（高度为0，无水）
        newHeights[newIdx] = 0
        if (newWaterMask) {
          newWaterMask[newIdx] = 0
        }
      }
    }
  }

  return {
    resolution: terrainData.resolution,
    heights: newHeights,
    maxHeight: terrainData.maxHeight,
    waterMask: newWaterMask,
  }
}

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
