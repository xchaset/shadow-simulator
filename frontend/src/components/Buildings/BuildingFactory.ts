import * as THREE from 'three'
import type { BuildingType } from '../../types'
import { getDefaultParams } from '../../utils/buildings'

export interface GeometryItem {
  geometry: THREE.BufferGeometry
  position: [number, number, number]
  color?: string  // 覆盖建筑默认颜色（如树干用棕色）
}

export function createBuildingGeometries(
  type: BuildingType,
  params?: Record<string, number>,
): GeometryItem[] {
  const p = params ?? getDefaultParams(type)

  switch (type) {
    case 'box':
      return [{
        geometry: new THREE.BoxGeometry(p.width, p.height, p.depth),
        position: [0, p.height / 2, 0],
      }]
    case 'cylinder':
      return [{
        geometry: new THREE.CylinderGeometry(p.radius, p.radius, p.height, p.segments || 32),
        position: [0, p.height / 2, 0],
      }]
    case 'prism':
      return [{
        geometry: new THREE.CylinderGeometry(p.radius, p.radius, p.height, p.sides || 6),
        position: [0, p.height / 2, 0],
      }]
    case 'l-shape': {
      const w = p.width, h = p.height
      return [
        { geometry: new THREE.BoxGeometry(p.wing1Length, h, w), position: [p.wing1Length / 2 - w / 2, h / 2, 0] },
        { geometry: new THREE.BoxGeometry(w, h, p.wing2Length), position: [0, h / 2, p.wing2Length / 2 - w / 2] },
      ]
    }
    case 'u-shape': {
      const w = p.width, h = p.height
      return [
        { geometry: new THREE.BoxGeometry(w, h, p.wing1Length), position: [-p.backLength / 2 + w / 2, h / 2, p.wing1Length / 2] },
        { geometry: new THREE.BoxGeometry(w, h, p.wing2Length), position: [p.backLength / 2 - w / 2, h / 2, p.wing2Length / 2] },
        { geometry: new THREE.BoxGeometry(p.backLength, h, w), position: [0, h / 2, 0] },
      ]
    }
    case 't-shape': {
      const w = p.width, h = p.height
      return [
        { geometry: new THREE.BoxGeometry(p.crossLength, h, w), position: [0, h / 2, -p.stemLength / 2 + w / 2] },
        { geometry: new THREE.BoxGeometry(w, h, p.stemLength), position: [0, h / 2, 0] },
      ]
    }
    case 'stepped': {
      const items: GeometryItem[] = []
      for (let i = 0; i < p.levels; i++) {
        const shrink = i * p.stepback * 2
        const w = p.baseWidth - shrink
        const d = p.baseDepth - shrink
        if (w <= 0 || d <= 0) break
        items.push({
          geometry: new THREE.BoxGeometry(w, p.levelHeight, d),
          position: [0, i * p.levelHeight + p.levelHeight / 2, 0],
        })
      }
      return items
    }
    case 'podium-tower':
      return [
        { geometry: new THREE.BoxGeometry(p.podiumWidth, p.podiumHeight, p.podiumDepth), position: [0, p.podiumHeight / 2, 0] },
        { geometry: new THREE.BoxGeometry(p.towerWidth, p.towerHeight, p.towerDepth), position: [0, p.podiumHeight + p.towerHeight / 2, 0] },
      ]
    case 'dome':
      return [
        { geometry: new THREE.CylinderGeometry(p.radius, p.radius, p.cylinderHeight, 32), position: [0, p.cylinderHeight / 2, 0] },
        { geometry: new THREE.SphereGeometry(p.radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, p.cylinderHeight, 0] },
      ]
    case 'gable-roof': {
      const hw = p.width / 2, hd = p.depth / 2, rh = p.ridgeHeight
      const roofGeom = new THREE.BufferGeometry()
      const vertices = new Float32Array([
        // Front triangle
        -hw, 0, -hd, hw, 0, -hd, 0, rh, -hd,
        // Back triangle
        -hw, 0, hd, 0, rh, hd, hw, 0, hd,
        // Left slope
        -hw, 0, -hd, 0, rh, -hd, 0, rh, hd, -hw, 0, hd,
        // Right slope
        hw, 0, -hd, hw, 0, hd, 0, rh, hd, 0, rh, -hd,
      ])
      const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 6, 8, 9, 10, 11, 12, 10, 12, 13]
      roofGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      roofGeom.setIndex(indices)
      roofGeom.computeVertexNormals()
      return [
        { geometry: new THREE.BoxGeometry(p.width, p.wallHeight, p.depth), position: [0, p.wallHeight / 2, 0] },
        { geometry: roofGeom, position: [0, p.wallHeight, 0] },
      ]
    }
    case 'road':
      return [{
        geometry: new THREE.BoxGeometry(p.width, 0.15, p.length),
        position: [0, 0.075, 0],
      }]
    case 'green-belt':
      return [{
        geometry: new THREE.BoxGeometry(p.width, p.height, p.length),
        position: [0, p.height / 2, 0],
      }]
    case 'tree': {
      // 树干（棕色圆柱）
      const trunk: GeometryItem = {
        geometry: new THREE.CylinderGeometry(p.trunkRadius, p.trunkRadius * 1.2, p.trunkHeight, 8),
        position: [0, p.trunkHeight / 2, 0],
        color: '#8B5E3C',
      }
      // 树冠（绿色椭球）
      const canopyGeom = new THREE.SphereGeometry(p.canopyRadius, 16, 12)
      canopyGeom.scale(1, p.canopyHeight / (p.canopyRadius * 2), 1)
      const canopy: GeometryItem = {
        geometry: canopyGeom,
        position: [0, p.trunkHeight + p.canopyHeight / 2, 0],
      }
      return [trunk, canopy]
    }
    case 'ai-circular':
      return createAICircularGeometries(p)
    case 'ai-complex':
      return createAIComplexGeometries(p)
    default:
      return [{ geometry: new THREE.BoxGeometry(10, 30, 10), position: [0, 15, 0] }]
  }
}

// ─── AI 圆形多层建筑（天坛、圆形塔楼等）─────────────────

/**
 * params 编码规则：
 *   segments: 圆形分段数
 *   levelCount: 层数
 *   level_{i}_height, level_{i}_radius, level_{i}_roofType, level_{i}_overhang
 *   roofType 编码: 0=flat, 1=chinese-eave, 2=dome, 3=gable, 4=hip
 */
function createAICircularGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const seg = p.segments || 48
  const levelCount = p.levelCount || 1
  let currentY = 0

  for (let i = 0; i < levelCount; i++) {
    const h = p[`level_${i}_height`] || 4
    const r = p[`level_${i}_radius`] || 10
    const roofCode = p[`level_${i}_roofType`] ?? 0
    const overhang = p[`level_${i}_overhang`] || 0

    // 主体圆柱
    items.push({
      geometry: new THREE.CylinderGeometry(r, r, h, seg),
      position: [0, currentY + h / 2, 0],
    })

    // 飞檐 / 屋顶
    if (roofCode === 1) {
      // chinese-eave: 用扁圆柱 + 圆锥模拟飞檐
      const eaveR = r + overhang
      const eaveThickness = 0.6
      // 飞檐底盘
      items.push({
        geometry: new THREE.CylinderGeometry(eaveR, eaveR * 1.05, eaveThickness, seg),
        position: [0, currentY + h, 0],
        color: '__roof__',
      })
      // 飞檐上方的锥形坡面
      const slopeH = overhang * 0.8
      items.push({
        geometry: new THREE.ConeGeometry(eaveR, slopeH, seg),
        position: [0, currentY + h + eaveThickness / 2 + slopeH / 2, 0],
        color: '__roof__',
      })
      // 飞檐是装饰，不影响层间堆叠
      currentY += h
    } else if (roofCode === 2) {
      // dome: 半球穹顶
      items.push({
        geometry: new THREE.SphereGeometry(r, seg, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        position: [0, currentY + h, 0],
        color: '__roof__',
      })
      currentY += h
    } else {
      // flat
      currentY += h
    }
  }

  return items
}

// ─── AI 复杂多层建筑（矩形收分、塔楼等）─────────────────

/**
 * params 编码规则：
 *   levelCount: 层数
 *   level_{i}_height, level_{i}_width, level_{i}_depth, level_{i}_roofType, level_{i}_overhang
 */
function createAIComplexGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const levelCount = p.levelCount || 1
  let currentY = 0

  for (let i = 0; i < levelCount; i++) {
    const h = p[`level_${i}_height`] || 5
    const w = p[`level_${i}_width`] || 20
    const d = p[`level_${i}_depth`] || 20
    const roofCode = p[`level_${i}_roofType`] ?? 0
    const overhang = p[`level_${i}_overhang`] || 0

    // 主体方块
    items.push({
      geometry: new THREE.BoxGeometry(w, h, d),
      position: [0, currentY + h / 2, 0],
    })

    // 飞檐 / 屋顶
    if (roofCode === 1) {
      // chinese-eave
      const eaveW = w + overhang * 2
      const eaveD = d + overhang * 2
      const eaveThickness = 0.6
      items.push({
        geometry: new THREE.BoxGeometry(eaveW, eaveThickness, eaveD),
        position: [0, currentY + h + eaveThickness / 2, 0],
        color: '__roof__',
      })
      // 坡面用扁的四棱锥近似
      const slopeH = overhang * 0.7
      const roofGeom = new THREE.ConeGeometry(Math.max(eaveW, eaveD) * 0.7, slopeH, 4)
      roofGeom.rotateY(Math.PI / 4)
      items.push({
        geometry: roofGeom,
        position: [0, currentY + h + eaveThickness + slopeH / 2, 0],
        color: '__roof__',
      })
      currentY += h
    } else if (roofCode === 3) {
      // gable
      const rh = Math.max(2, w * 0.2)
      const hw = w / 2, hd = d / 2
      const roofGeom = new THREE.BufferGeometry()
      const vertices = new Float32Array([
        -hw, 0, -hd, hw, 0, -hd, 0, rh, -hd,
        -hw, 0, hd, 0, rh, hd, hw, 0, hd,
        -hw, 0, -hd, 0, rh, -hd, 0, rh, hd, -hw, 0, hd,
        hw, 0, -hd, hw, 0, hd, 0, rh, hd, 0, rh, -hd,
      ])
      const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 6, 8, 9, 10, 11, 12, 10, 12, 13]
      roofGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      roofGeom.setIndex(indices)
      roofGeom.computeVertexNormals()
      items.push({
        geometry: roofGeom,
        position: [0, currentY + h, 0],
        color: '__roof__',
      })
      currentY += h
    } else if (roofCode === 4) {
      // hip
      const slopeH = Math.max(2, Math.min(w, d) * 0.25)
      items.push({
        geometry: new THREE.ConeGeometry(Math.max(w, d) * 0.7, slopeH, 4),
        position: [0, currentY + h + slopeH / 2, 0],
        color: '__roof__',
      })
      currentY += h
    } else {
      currentY += h
    }
  }

  return items
}
