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
    case 'river':
      return createRiverGeometries(p)
    case 'ai-circular':
      return createAICircularGeometries(p)
    case 'ai-complex':
      return createAIComplexGeometries(p)
    case 'glb':
      // GLB 模型由 GlbBuildingMesh 组件单独处理，这里返回占位几何体
      return [{ geometry: new THREE.BoxGeometry(10, 10, 10), position: [0, 5, 0] }]
    case 'girder-bridge':
      return createGirderBridgeGeometries(p)
    case 'arch-bridge':
      return createArchBridgeGeometries(p)
    case 'suspension-bridge':
      return createSuspensionBridgeGeometries(p)
    case 'cable-stayed-bridge':
      return createCableStayedBridgeGeometries(p)
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

// ─── 河流（弯曲河道）─────────────────────────────────────

function createRiverGeometries(p: Record<string, number>): GeometryItem[] {
  const length = p.length || 120
  const width = p.width || 10
  const curvature = p.curvature || 30
  const lengthSegs = Math.max(16, Math.floor(p.segments || 48))
  const widthSegs = Math.max(6, Math.floor(width / 2))  // 横向细分

  // 用 CatmullRom 曲线生成河流中心线
  const halfLen = length / 2
  const ctrlPoints = [
    new THREE.Vector3(0, 0, -halfLen),
    new THREE.Vector3(curvature * 0.5, 0, -halfLen * 0.33),
    new THREE.Vector3(-curvature * 0.5, 0, halfLen * 0.33),
    new THREE.Vector3(0, 0, halfLen),
  ]
  const curve = new THREE.CatmullRomCurve3(ctrlPoints)

  const curvePoints = curve.getSpacedPoints(lengthSegs)
  const tangents = curvePoints.map((_, i) => curve.getTangentAt(i / lengthSegs))

  const halfW = width / 2
  const VPS = widthSegs + 1  // 每个截面的顶点数
  const vertices: number[] = []
  const indices: number[] = []
  const uvs: number[] = []

  for (let i = 0; i <= lengthSegs; i++) {
    const pt = curvePoints[i]
    const tan = tangents[i]
    const right = new THREE.Vector3(-tan.z, 0, tan.x).normalize()
    const v = i / lengthSegs

    for (let j = 0; j <= widthSegs; j++) {
      const u = j / widthSegs
      const offset = (u - 0.5) * 2 * halfW  // -halfW ~ +halfW
      vertices.push(
        pt.x + right.x * offset,
        0,
        pt.z + right.z * offset,
      )
      uvs.push(u, v)
    }
  }

  // 连接网格
  for (let i = 0; i < lengthSegs; i++) {
    for (let j = 0; j < widthSegs; j++) {
      const a = i * VPS + j
      const b = a + 1
      const c = (i + 1) * VPS + j + 1
      const d = (i + 1) * VPS + j
      indices.push(a, d, b, b, d, c)
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geom.setIndex(indices)
  geom.computeVertexNormals()

  // 略高于地面，避免 z-fighting
  return [{ geometry: geom, position: [0, 0.15, 0] }]
}

// ─── 梁式桥 ──────────────────────────────────────────────

function createGirderBridgeGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 120
  const width = p.width || 20
  const deckThickness = p.deckThickness || 1.5
  const deckHeight = p.deckHeight || 8
  const pierCount = Math.max(2, p.pierCount || 3)
  const pierWidth = p.pierWidth || 4
  const pierDepth = p.pierDepth || 6
  const girderHeight = p.girderHeight || 2

  // 桥面
  items.push({
    geometry: new THREE.BoxGeometry(length, deckThickness, width),
    position: [0, deckHeight + deckThickness / 2, 0],
  })

  // 主梁（左右两侧）
  const girderY = deckHeight - girderHeight / 2
  items.push({
    geometry: new THREE.BoxGeometry(length, girderHeight, 1.5),
    position: [0, girderY, width / 2 - 0.75],
    color: '#696969',
  })
  items.push({
    geometry: new THREE.BoxGeometry(length, girderHeight, 1.5),
    position: [0, girderY, -width / 2 + 0.75],
    color: '#696969',
  })

  // 桥墩
  const pierSpacing = length / (pierCount - 1)
  for (let i = 0; i < pierCount; i++) {
    const x = -length / 2 + i * pierSpacing
    // 主桥墩
    items.push({
      geometry: new THREE.BoxGeometry(pierWidth, deckHeight, pierDepth),
      position: [x, deckHeight / 2, 0],
      color: '#A0A0A0',
    })
    // 桥墩基础（略宽）
    items.push({
      geometry: new THREE.BoxGeometry(pierWidth + 2, 1.5, pierDepth + 2),
      position: [x, 0.75, 0],
      color: '#808080',
    })
  }

  return items
}

// ─── 拱式桥 ──────────────────────────────────────────────

function createArchBridgeGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 150
  const width = p.width || 20
  const deckThickness = p.deckThickness || 1.5
  const deckHeight = p.deckHeight || 12
  const archHeight = p.archHeight || 25
  const pierWidth = p.pierWidth || 5
  const pierDepth = p.pierDepth || 8
  const spandrelCount = Math.max(2, p.spandrelCount || 6)

  const halfLength = length / 2
  const deckBottomY = deckHeight
  const deckTopY = deckHeight + deckThickness

  // 桥面
  items.push({
    geometry: new THREE.BoxGeometry(length, deckThickness, width),
    position: [0, deckHeight + deckThickness / 2, 0],
  })

  // 主拱圈（使用多个圆柱段模拟抛物线拱）
  const archSegments = 48
  const archThickness = 1.8
  const halfWidth = width / 2

  // 真实上承式拱桥的拱参数：
  // - 拱脚（两端）在桥台处，较低位置
  // - 拱顶（跨中）在桥面下方
  // - 立柱从拱圈向上连接到桥面底部
  //
  // 抛物线公式：y = archSpringingY + archRise * (1 - (x/halfLength)^2)
  // - 在 x = ±halfLength 时（拱脚）：y = archSpringingY
  // - 在 x = 0 时（拱顶）：y = archSpringingY + archRise
  //
  // 为了让拱在桥面下方，我们设置：
  // - 拱脚高度：archSpringingY (较低位置)
  // - 拱顶高度：archSpringingY + archRise (略低于桥面底部)

  const archSpringingY = deckBottomY * 0.15  // 拱脚在较低位置
  const archRise = deckBottomY * 0.7          // 拱的净矢高（从拱脚到拱顶的高度）
  const archCrownY = archSpringingY + archRise  // 拱顶高度

  // 验证拱顶在桥面下方
  // 如果 archCrownY > deckBottomY，说明拱顶在桥面上方，需要调整
  const adjustedArchRise = archCrownY > deckBottomY ? (deckBottomY - archSpringingY) * 0.9 : archRise
  const finalArchCrownY = archSpringingY + adjustedArchRise

  /**
   * 计算主拱圈上某点的高度
   * 公式：y = archSpringingY + adjustedArchRise * (1 - (x/halfLength)^2)
   * - 拱脚（x = ±halfLength）：y = archSpringingY
   * - 拱顶（x = 0）：y = archSpringingY + adjustedArchRise
   */
  function getArchY(x: number): number {
    const normalizedX = x / halfLength
    return archSpringingY + adjustedArchRise * (1 - normalizedX * normalizedX)
  }

  // 创建左拱肋和右拱肋
  for (const sideOffset of [-halfWidth + archThickness, halfWidth - archThickness]) {
    for (let i = 0; i < archSegments; i++) {
      const t1 = i / archSegments
      const t2 = (i + 1) / archSegments

      const x1 = -halfLength + t1 * length
      const x2 = -halfLength + t2 * length
      const y1 = getArchY(x1)
      const y2 = getArchY(x2)

      const midX = (x1 + x2) / 2
      const midY = (y1 + y2) / 2

      const dx = x2 - x1
      const dy = y2 - y1
      const segmentLength = Math.sqrt(dx * dx + dy * dy)

      const archGeom = new THREE.CylinderGeometry(
        archThickness / 2, archThickness / 2, segmentLength, 10
      )

      const angle = Math.atan2(dy, dx)
      archGeom.rotateZ(Math.PI / 2 - angle)

      items.push({
        geometry: archGeom,
        position: [midX, midY, sideOffset],
        color: '#8B4513',
      })
    }
  }

  // 拱肋之间的横系梁（连接左右拱肋）
  const crossBeamCount = Math.floor(archSegments / 6)
  for (let i = 0; i <= crossBeamCount; i++) {
    const t = i / crossBeamCount
    const x = -halfLength + t * length
    const y = getArchY(x)

    items.push({
      geometry: new THREE.BoxGeometry(archThickness * 1.2, archThickness * 1.2, width - archThickness * 2),
      position: [x, y, 0],
      color: '#A0522D',
    })
  }

  // 拱上立柱（从拱圈向上连接到桥面底部）
  const spandrelSpacing = length / (spandrelCount + 1)
  for (let i = 1; i <= spandrelCount; i++) {
    const x = -halfLength + i * spandrelSpacing
    const archY = getArchY(x)
    const columnHeight = deckBottomY - archY

    if (columnHeight > 1.0) {
      // 前后两根立柱
      for (const zOffset of [-halfWidth + archThickness + 1.5, halfWidth - archThickness - 1.5]) {
        items.push({
          geometry: new THREE.BoxGeometry(1.2, columnHeight, 1.2),
          position: [x, archY + columnHeight / 2, zOffset],
          color: '#A0522D',
        })
      }
      // 立柱顶部的盖梁（连接立柱和支撑桥面）
      items.push({
        geometry: new THREE.BoxGeometry(2.5, 1.0, width - archThickness * 2 - 3),
        position: [x, deckBottomY - 0.5, 0],
        color: '#8B4513',
      })
    }
  }

  // 两端桥台（更坚固的支撑结构）
  const abutmentX = [-halfLength, halfLength]
  for (const x of abutmentX) {
    // 桥台基础
    items.push({
      geometry: new THREE.BoxGeometry(pierWidth + 10, 4, pierDepth + 10),
      position: [x, 2, 0],
      color: '#4A4A4A',
    })
    // 桥台主体
    items.push({
      geometry: new THREE.BoxGeometry(pierWidth + 6, deckBottomY * 0.8, pierDepth + 6),
      position: [x, deckBottomY * 0.4, 0],
      color: '#654321',
    })
    // 桥台顶部（连接拱脚和桥面）
    items.push({
      geometry: new THREE.BoxGeometry(pierWidth + 4, deckBottomY * 0.25, pierDepth + 4),
      position: [x, deckBottomY * 0.875, 0],
      color: '#8B4513',
    })
    // 拱脚加强块
    items.push({
      geometry: new THREE.BoxGeometry(pierWidth, 3, pierDepth + 2),
      position: [x, archSpringingY + 1.5, 0],
      color: '#5A4A3A',
    })
  }

  return items
}

// ─── 悬索桥 ──────────────────────────────────────────────

function createSuspensionBridgeGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const mainSpan = p.mainSpan || 200
  const sideSpan = p.sideSpan || 80
  const width = p.width || 25
  const deckThickness = p.deckThickness || 2
  const deckHeight = p.deckHeight || 15
  const towerHeight = p.towerHeight || 60
  const towerWidth = p.towerWidth || 8
  const towerDepth = p.towerDepth || 12
  const mainCableHeight = p.mainCableHeight || 40
  const hangerCount = Math.max(10, p.hangerCount || 20)

  const totalLength = mainSpan + 2 * sideSpan
  const halfMain = mainSpan / 2
  const towerTopY = towerHeight - 1
  const anchorTopY = 20  // 锚碇顶部散索鞍高度

  // 左桥塔位置
  const leftTowerX = -halfMain
  // 右桥塔位置
  const rightTowerX = halfMain
  // 左锚碇位置
  const leftAnchorX = -halfMain - sideSpan - 15
  // 右锚碇位置
  const rightAnchorX = halfMain + sideSpan + 15
  // 桥塔到锚碇的距离
  const sideSpanDist = sideSpan + 15

  // 桥面
  items.push({
    geometry: new THREE.BoxGeometry(totalLength, deckThickness, width),
    position: [0, deckHeight + deckThickness / 2, 0],
  })

  // 桥塔（两座，位于主跨两端）
  const towerX = [leftTowerX, rightTowerX]
  for (const x of towerX) {
    // 主塔柱（分成左右两根，形成门式结构）
    const towerHalfWidth = towerWidth / 2 - 1.5
    for (const sideOffset of [-towerHalfWidth, towerHalfWidth]) {
      items.push({
        geometry: new THREE.BoxGeometry(2.5, towerHeight, towerDepth * 0.4),
        position: [x + sideOffset, towerHeight / 2, 0],
        color: '#4682B4',
      })
    }
    // 塔顶横梁
    items.push({
      geometry: new THREE.BoxGeometry(towerWidth + 2, 2.5, towerDepth * 0.6),
      position: [x, towerHeight - 1.25, 0],
      color: '#5F9EA0',
    })
    // 鞍座（位于塔顶，支撑主缆）
    items.push({
      geometry: new THREE.BoxGeometry(towerWidth + 4, 1.5, towerDepth * 0.8),
      position: [x, towerHeight - 0.75, 0],
      color: '#2F4F4F',
    })
    // 鞍座顶部的弧形支撑
    const saddleCurve = new THREE.CylinderGeometry(
      1.5, 1.5, width * 0.8, 16, 1, false, Math.PI, Math.PI
    )
    saddleCurve.rotateX(Math.PI / 2)
    items.push({
      geometry: saddleCurve,
      position: [x, towerHeight + 0.5, 0],
      color: '#4A4A4A',
    })
    // 塔基
    items.push({
      geometry: new THREE.BoxGeometry(towerWidth + 8, 4, towerDepth + 6),
      position: [x, 2, 0],
      color: '#2F4F4F',
    })
  }

  // 主缆参数
  const cableSegments = 100
  const cableRadius = 0.4
  const halfCableWidth = width / 2 - 1.5

  // 主跨主缆垂度（从塔顶到最低点的距离）
  const mainSag = mainCableHeight * 0.85

  /**
   * 计算主跨主缆上某点的高度
   * 真实悬索桥主跨主缆形状：倒置抛物线（悬链线近似）
   * 公式：y = towerTopY - mainSag * (1 - (x/halfMain)^2)
   * - 在 x = -halfMain（左塔）和 x = halfMain（右塔）时，y = towerTopY（最高点）
   * - 在 x = 0（跨中）时，y = towerTopY - mainSag（最低点）
   */
  function getMainSpanCableY(x: number): number {
    const normalizedX = x / halfMain
    return towerTopY - mainSag * (1 - normalizedX * normalizedX)
  }

  /**
   * 计算边跨主缆上某点的高度
   * 真实悬索桥边跨主缆：从桥塔顶部连接到锚碇顶部散索鞍
   * 形状：近似直线，带有微小抛物线垂度使缆线更自然
   * - 在桥塔处（dist=0），y = towerTopY（最高点）
   * - 在锚碇处（dist=totalSpan），y = anchorTopY（锚碇顶部）
   */
  function getSideSpanCableY(x: number, towerX: number, anchorX: number): number {
    const totalSpan = Math.abs(towerX - anchorX)
    const distFromTower = Math.abs(x - towerX)
    const t = Math.min(distFromTower / totalSpan, 1)
    // 线性插值 + 微小抛物线垂度
    const linearY = towerTopY * (1 - t) + anchorTopY * t
    const sagAmount = 2 // 边跨主缆微小垂度
    return linearY - sagAmount * t * (1 - t)
  }

  // 创建主缆的辅助函数
  function createCableSegment(
    x1: number, y1: number,
    x2: number, y2: number,
    zOffset: number
  ): void {
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    const dx = x2 - x1
    const dy = y2 - y1
    const length = Math.sqrt(dx * dx + dy * dy)

    const cableGeom = new THREE.CylinderGeometry(cableRadius, cableRadius, length, 12)
    const angle = Math.atan2(dy, dx)
    cableGeom.rotateZ(Math.PI / 2 - angle)

    items.push({
      geometry: cableGeom,
      position: [midX, midY, zOffset],
      color: '#5A4A3A',
    })
  }

  // 创建吊杆的辅助函数
  function createHanger(
    x: number, cableY: number,
    deckY: number, zOffset: number
  ): void {
    if (cableY > deckY + 0.5) {
      const hangerLength = cableY - deckY
      items.push({
        geometry: new THREE.CylinderGeometry(0.12, 0.12, hangerLength, 6),
        position: [x, (cableY + deckY) / 2, zOffset],
        color: '#C0C0C0',
      })
    }
  }

  for (const side of [-1, 1]) {
    const zOffset = side * halfCableWidth

    // ─── 左边跨主缆：从左锚碇到左塔 ─────────────────────────────────
    // 真实结构：主缆从锚碇顶部散索鞍延伸到左塔顶部
    // 形状：近似直线，主缆锚固在锚碇中
    const leftSideSegments = Math.floor(cableSegments * sideSpanDist / (mainSpan + 2 * sideSpanDist))
    for (let i = 0; i < leftSideSegments; i++) {
      const t1 = i / leftSideSegments
      const t2 = (i + 1) / leftSideSegments

      const x1 = leftAnchorX + t1 * sideSpanDist
      const x2 = leftAnchorX + t2 * sideSpanDist

      const y1 = getSideSpanCableY(x1, leftTowerX, leftAnchorX)
      const y2 = getSideSpanCableY(x2, leftTowerX, leftAnchorX)

      createCableSegment(x1, y1, x2, y2, zOffset)
    }

    // ─── 主跨主缆：从左塔到右塔 ─────────────────────────────────
    // 真实结构：主缆从左塔顶部向下弯曲到跨中最低点，再向上到右塔顶部
    // 形状：倒置抛物线（悬链线近似）
    for (let i = 0; i < cableSegments; i++) {
      const t1 = i / cableSegments
      const t2 = (i + 1) / cableSegments

      const x1 = leftTowerX + t1 * mainSpan
      const x2 = leftTowerX + t2 * mainSpan
      const y1 = getMainSpanCableY(x1)
      const y2 = getMainSpanCableY(x2)

      createCableSegment(x1, y1, x2, y2, zOffset)
    }

    // ─── 右边跨主缆：从右塔到右锚碇 ─────────────────────────────────
    // 真实结构：主缆从右塔顶部向锚碇延伸，锚固在锚碇散索鞍中
    // 形状：近似直线
    const rightSideSegments = Math.floor(cableSegments * sideSpanDist / (mainSpan + 2 * sideSpanDist))
    for (let i = 0; i < rightSideSegments; i++) {
      const t1 = i / rightSideSegments
      const t2 = (i + 1) / rightSideSegments

      const x1 = rightTowerX + t1 * sideSpanDist
      const x2 = rightTowerX + t2 * sideSpanDist

      const y1 = getSideSpanCableY(x1, rightTowerX, rightAnchorX)
      const y2 = getSideSpanCableY(x2, rightTowerX, rightAnchorX)

      createCableSegment(x1, y1, x2, y2, zOffset)
    }

    // ─── 吊杆：从主缆垂直连接到桥面 ─────────────────────────────────
    const deckTopY = deckHeight + deckThickness

    // 主跨吊杆
    for (let i = 0; i <= hangerCount; i++) {
      const t = i / hangerCount
      const x = leftTowerX + t * mainSpan
      const cableY = getMainSpanCableY(x)
      createHanger(x, cableY, deckTopY, zOffset)
    }

    // 左边跨吊杆（较少）
    const sideHangerCount = Math.floor(hangerCount * 0.3)
    for (let i = 1; i <= sideHangerCount; i++) {
      const t = i / (sideHangerCount + 1)
      const x = leftTowerX - t * sideSpan
      const cableY = getSideSpanCableY(x, leftTowerX, leftAnchorX)
      createHanger(x, cableY, deckTopY, zOffset)
    }

    // 右边跨吊杆（较少）
    for (let i = 1; i <= sideHangerCount; i++) {
      const t = i / (sideHangerCount + 1)
      const x = rightTowerX + t * sideSpan
      const cableY = getSideSpanCableY(x, rightTowerX, rightAnchorX)
      createHanger(x, cableY, deckTopY, zOffset)
    }
  }

  // ─── 锚碇结构：主缆两端的锚固点 ─────────────────────────────────
  // 真实结构：重力式锚碇，依靠自重抵抗主缆拉力
  const anchorPositions = [leftAnchorX, rightAnchorX]
  for (const x of anchorPositions) {
    // 锚碇基础
    items.push({
      geometry: new THREE.BoxGeometry(25, 6, width + 10),
      position: [x, 3, 0],
      color: '#3A3A3A',
    })
    // 锚碇主体
    items.push({
      geometry: new THREE.BoxGeometry(18, 12, width + 6),
      position: [x, 9, 0],
      color: '#4A4A4A',
    })
    // 锚碇顶部（散索鞍位置）
    items.push({
      geometry: new THREE.BoxGeometry(12, 4, width + 2),
      position: [x, 17, 0],
      color: '#5A5A5A',
    })
    // 散索鞍示意
    items.push({
      geometry: new THREE.BoxGeometry(8, 2, width),
      position: [x, 20, 0],
      color: '#6A6A6A',
    })
  }

  return items
}

// ─── 斜拉桥 ──────────────────────────────────────────────

function createCableStayedBridgeGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const mainSpan = p.mainSpan || 180
  const sideSpan = p.sideSpan || 70
  const width = p.width || 25
  const deckThickness = p.deckThickness || 2
  const deckHeight = p.deckHeight || 15
  const towerHeight = p.towerHeight || 50
  const towerWidth = p.towerWidth || 6
  const towerDepth = p.towerDepth || 10
  const cableCount = Math.max(6, p.cableCount || 12)
  const cableFanAngle = p.cableFanAngle || 30

  const totalLength = mainSpan + 2 * sideSpan
  const halfMain = mainSpan / 2

  // 桥面
  items.push({
    geometry: new THREE.BoxGeometry(totalLength, deckThickness, width),
    position: [0, deckHeight + deckThickness / 2, 0],
  })

  // 桥塔（两座）
  const towerX = [-halfMain, halfMain]
  for (const x of towerX) {
    // 主塔柱（A字形简化为矩形）
    items.push({
      geometry: new THREE.BoxGeometry(towerWidth, towerHeight, towerDepth),
      position: [x, towerHeight / 2, 0],
      color: '#5F9EA0',
    })
    // 塔基
    items.push({
      geometry: new THREE.BoxGeometry(towerWidth + 5, 3, towerDepth + 5),
      position: [x, 1.5, 0],
      color: '#2F4F4F',
    })
  }

  // 斜拉索（扇形布置）
  const halfCableWidth = width / 2 - 0.5
  const towerTopY = towerHeight - 2

  // 左桥塔的拉索
  for (let towerIdx = 0; towerIdx < 2; towerIdx++) {
    const towerXPos = towerX[towerIdx]
    const direction = towerIdx === 0 ? 1 : -1

    // 主跨方向拉索
    for (let i = 1; i <= cableCount; i++) {
      const ratio = i / cableCount
      const cableX = towerXPos + direction * ratio * halfMain
      const cableY = deckHeight + deckThickness

      // 塔上的连接点（从下到上分布）
      const towerCableY = deckHeight + 2 + ratio * (towerTopY - deckHeight - 2)

      // 前后两面的拉索
      for (const side of [-1, 1]) {
        const zOffset = side * halfCableWidth

        const start = new THREE.Vector3(towerXPos, towerCableY, zOffset)
        const end = new THREE.Vector3(cableX, cableY, zOffset)
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
        const dir = new THREE.Vector3().subVectors(end, start)
        const length = dir.length()

        const cableGeom = new THREE.CylinderGeometry(0.12, 0.12, length, 6)
        cableGeom.rotateX(Math.PI / 2)
        cableGeom.lookAt(dir)

        items.push({
          geometry: cableGeom,
          position: [mid.x, mid.y, mid.z],
          color: '#FFFFFF',
        })
      }
    }

    // 边跨方向拉索（较少）
    const sideCableCount = Math.floor(cableCount * 0.6)
    for (let i = 1; i <= sideCableCount; i++) {
      const ratio = i / sideCableCount
      const cableX = towerXPos - direction * ratio * sideSpan
      const cableY = deckHeight + deckThickness
      const towerCableY = deckHeight + 2 + ratio * (towerTopY - deckHeight - 2) * 0.7

      for (const side of [-1, 1]) {
        const zOffset = side * halfCableWidth

        const start = new THREE.Vector3(towerXPos, towerCableY, zOffset)
        const end = new THREE.Vector3(cableX, cableY, zOffset)
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
        const dir = new THREE.Vector3().subVectors(end, start)
        const length = dir.length()

        const cableGeom = new THREE.CylinderGeometry(0.12, 0.12, length, 6)
        cableGeom.rotateX(Math.PI / 2)
        cableGeom.lookAt(dir)

        items.push({
          geometry: cableGeom,
          position: [mid.x, mid.y, mid.z],
          color: '#FFFFFF',
        })
      }
    }
  }

  return items
}
