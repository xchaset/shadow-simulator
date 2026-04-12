import type { Building, BuildingType } from '../types'
import { createBuilding } from './buildings'

// ─── Types ────────────────────────────────────────────────

export interface LevelParams {
  height: number
  width?: number
  depth?: number
  radius?: number
  roofType: 'flat' | 'gable' | 'hip' | 'chinese-eave' | 'dome'
  roofOverhang?: number
}

export interface BuildingAnalysisParams {
  shape: 'rectangular' | 'circular' | 'complex'

  // 简单矩形
  floors?: number
  width?: number
  depth?: number
  floorHeight?: number
  roofType?: 'flat' | 'gable' | 'hip' | 'chinese-eave' | 'dome'

  // 圆形
  radius?: number
  segments?: number

  // 多层
  levels?: LevelParams[]

  // 窗户
  windowLayout?: {
    rows: number
    cols: number
    width: number
    height: number
  }

  // 材质
  material: {
    wallColor: string
    roofColor: string
    roofTexture?: 'tile' | 'metal' | 'concrete'
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

// ─── roofType → 数字编码 ─────────────────────────────────

const ROOF_CODE: Record<string, number> = {
  flat: 0,
  'chinese-eave': 1,
  dome: 2,
  gable: 3,
  hip: 4,
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

  if (params.shape === 'circular' && params.levels?.length) {
    // ── 圆形多层建筑 ──
    const b = createBuilding('ai-circular', position)
    b.name = `AI 建筑 (圆形 ${params.levels.length}层)`
    const p: Record<string, number> = {
      segments: params.segments || 48,
      levelCount: params.levels.length,
    }
    params.levels.forEach((lv, i) => {
      p[`level_${i}_height`] = lv.height
      p[`level_${i}_radius`] = lv.radius || params.radius || 10
      p[`level_${i}_roofType`] = ROOF_CODE[lv.roofType] ?? 0
      p[`level_${i}_overhang`] = lv.roofOverhang || 0
    })
    // 存 roofColor 供 BuildingMesh 使用
    ;(p as any).roofColor = params.material.roofColor
    b.params = p
    b.color = params.material.wallColor
    buildings.push(b)
  } else if (params.shape === 'complex' && params.levels?.length) {
    // ── 矩形多层收分建筑 ──
    const b = createBuilding('ai-complex', position)
    b.name = `AI 建筑 (复杂 ${params.levels.length}层)`
    const p: Record<string, number> = {
      levelCount: params.levels.length,
    }
    params.levels.forEach((lv, i) => {
      p[`level_${i}_height`] = lv.height
      p[`level_${i}_width`] = lv.width || params.width || 20
      p[`level_${i}_depth`] = lv.depth || params.depth || 20
      p[`level_${i}_roofType`] = ROOF_CODE[lv.roofType] ?? 0
      p[`level_${i}_overhang`] = lv.roofOverhang || 0
    })
    ;(p as any).roofColor = params.material.roofColor
    b.params = p
    b.color = params.material.wallColor
    buildings.push(b)
  } else {
    // ── 简单矩形建筑（兼容旧逻辑）──
    const totalHeight = (params.floors || 5) * (params.floorHeight || 3)
    const w = params.width || 20
    const d = params.depth || 15
    const roofType = params.roofType || 'flat'

    if (roofType === 'gable') {
      const b = createBuilding('gable-roof', position)
      b.name = `AI 建筑 (坡屋顶 ${params.floors}F)`
      b.params = {
        width: w,
        depth: d,
        wallHeight: totalHeight,
        ridgeHeight: Math.max(2, w * 0.2),
      }
      b.color = params.material.wallColor
      buildings.push(b)
    } else if ((params.floors || 5) > 10) {
      const podiumFloors = Math.min(3, Math.floor((params.floors || 5) * 0.15))
      const podiumHeight = podiumFloors * (params.floorHeight || 3)
      const towerHeight = totalHeight - podiumHeight
      const b = createBuilding('podium-tower', position)
      b.name = `AI 建筑 (高层 ${params.floors}F)`
      b.params = {
        podiumWidth: w,
        podiumDepth: d,
        podiumHeight,
        towerWidth: w * 0.6,
        towerDepth: d * 0.6,
        towerHeight,
      }
      b.color = params.material.wallColor
      buildings.push(b)
    } else {
      const b = createBuilding('box', position)
      b.name = `AI 建筑 (${params.floors || 5}F)`
      b.params = { width: w, depth: d, height: totalHeight }
      b.color = params.material.wallColor
      buildings.push(b)
    }
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
