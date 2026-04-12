import type { Building, BuildingType } from '../types'
import { createBuilding } from './buildings'

// ─── Types ────────────────────────────────────────────────

export interface BuildingAnalysisParams {
  floors: number
  width: number
  depth: number
  floorHeight: number
  roofType: 'flat' | 'gable' | 'hip'
  windowLayout: {
    rows: number
    cols: number
    width: number
    height: number
  }
  material: {
    wallColor: string
    roofColor: string
  }
}

export interface AnalysisResult {
  success: boolean
  params: BuildingAnalysisParams
  timestamp: string
}

// ─── API ──────────────────────────────────────────────────

const API_BASE = '/api'

/**
 * 上传建筑图片并获取分析结果
 */
export async function analyzeBuilding(imageBase64: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE}/ai/analyze-building`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64 }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json()
}

// ─── Conversion ───────────────────────────────────────────

/**
 * 将 LLM 分析结果转换为 shadow-simulator 的 Building 对象
 */
export function analysisToBuildings(
  params: BuildingAnalysisParams,
  position: [number, number] = [0, 0],
): Building[] {
  const buildings: Building[] = []
  const totalHeight = params.floors * params.floorHeight

  // 根据屋顶类型选择建筑类型
  if (params.roofType === 'gable') {
    // 坡屋顶建筑
    const b = createBuilding('gable-roof', position)
    b.name = `AI 建筑 (坡屋顶 ${params.floors}F)`
    b.params = {
      width: params.width,
      depth: params.depth,
      wallHeight: totalHeight,
      ridgeHeight: Math.max(2, params.width * 0.2),
    }
    b.color = params.material.wallColor
    buildings.push(b)
  } else if (params.floors > 10) {
    // 高层建筑 → 裙楼+塔楼
    const podiumFloors = Math.min(3, Math.floor(params.floors * 0.15))
    const podiumHeight = podiumFloors * params.floorHeight
    const towerHeight = totalHeight - podiumHeight

    const b = createBuilding('podium-tower', position)
    b.name = `AI 建筑 (高层 ${params.floors}F)`
    b.params = {
      podiumWidth: params.width,
      podiumDepth: params.depth,
      podiumHeight,
      towerWidth: params.width * 0.6,
      towerDepth: params.depth * 0.6,
      towerHeight,
    }
    b.color = params.material.wallColor
    buildings.push(b)
  } else if (params.floors > 5) {
    // 多层建筑 → 阶梯退台
    const b = createBuilding('stepped', position)
    b.name = `AI 建筑 (多层 ${params.floors}F)`
    b.params = {
      baseWidth: params.width,
      baseDepth: params.depth,
      levels: Math.min(params.floors, 4),
      stepback: 2,
      levelHeight: totalHeight / Math.min(params.floors, 4),
    }
    b.color = params.material.wallColor
    buildings.push(b)
  } else {
    // 低层建筑 → 长方体
    const b = createBuilding('box', position)
    b.name = `AI 建筑 (${params.floors}F)`
    b.params = {
      width: params.width,
      depth: params.depth,
      height: totalHeight,
    }
    b.color = params.material.wallColor
    buildings.push(b)
  }

  return buildings
}

// ─── Helpers ──────────────────────────────────────────────

/**
 * File → base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
