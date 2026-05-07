import * as THREE from 'three'
import type { BuildingType, RoadMode, RoadHeightMode, TerrainData, RoadLaneConfig, LaneLineType } from '../../types'
import { getDefaultParams } from '../../utils/buildings'

export interface GeometryItem {
  geometry: THREE.BufferGeometry
  position: [number, number, number]
  color?: string
  opacity?: number
}

export function mergeGeometriesByColor(items: GeometryItem[]): GeometryItem[] {
  const colorGroups: Map<string | undefined, GeometryItem[]> = new Map()

  for (const item of items) {
    const key = item.color
    if (!colorGroups.has(key)) {
      colorGroups.set(key, [])
    }
    colorGroups.get(key)!.push(item)
  }

  const mergedItems: GeometryItem[] = []

  for (const [color, groupItems] of colorGroups) {
    if (groupItems.length === 1) {
      mergedItems.push(groupItems[0])
      continue
    }

    const geometries: THREE.BufferGeometry[] = []

    for (const item of groupItems) {
      const clonedGeom = item.geometry.clone()
      const matrix = new THREE.Matrix4().makeTranslation(
        item.position[0],
        item.position[1],
        item.position[2]
      )
      clonedGeom.applyMatrix4(matrix)
      geometries.push(clonedGeom)
    }

    const mergedGeom = mergeBufferGeometries(geometries)

    if (mergedGeom) {
      mergedItems.push({
        geometry: mergedGeom,
        position: [0, 0, 0],
        color: color,
        opacity: groupItems[0].opacity,
      })
    }
  }

  return mergedItems
}

function mergeBufferGeometries(
  geometries: THREE.BufferGeometry[]
): THREE.BufferGeometry | null {
  if (geometries.length === 0) return null
  if (geometries.length === 1) return geometries[0]

  const merged = new THREE.BufferGeometry()

  const attributes: Map<string, THREE.BufferAttribute[]> = new Map()
  let totalVertices = 0
  let totalIndices = 0

  for (const geom of geometries) {
    totalVertices += geom.getAttribute('position').count
    if (geom.index) {
      totalIndices += geom.index.count
    }
  }

  for (const geom of geometries) {
    for (const name of Object.keys(geom.attributes)) {
      if (!attributes.has(name)) {
        attributes.set(name, [])
      }
      attributes.get(name)!.push(geom.getAttribute(name) as THREE.BufferAttribute)
    }
  }

  for (const [name, attrs] of attributes) {
    const firstAttr = attrs[0]
    const itemSize = firstAttr.itemSize
    const normalized = firstAttr.normalized
    const arrayType = firstAttr.array.constructor as new (length: number) => Float32Array | Uint32Array | Uint16Array
    const mergedArray = new arrayType(totalVertices * itemSize)

    let offset = 0
    for (const attr of attrs) {
      const count = attr.count
      for (let i = 0; i < count * itemSize; i++) {
        mergedArray[offset + i] = attr.array[i]
      }
      offset += count * itemSize
    }

    merged.setAttribute(name, new THREE.BufferAttribute(mergedArray, itemSize, normalized))
  }

  const hasIndices = geometries.every(g => g.index !== null)
  if (hasIndices) {
    const indexArray = new Uint32Array(totalIndices)
    let indexOffset = 0
    let vertexOffset = 0

    for (const geom of geometries) {
      if (geom.index) {
        for (let i = 0; i < geom.index.count; i++) {
          indexArray[indexOffset + i] = geom.index.getX(i) + vertexOffset
        }
        indexOffset += geom.index.count
      }
      vertexOffset += geom.getAttribute('position').count
    }

    merged.setIndex(new THREE.BufferAttribute(indexArray, 1))
  } else {
    let vertexOffset = 0
    for (const geom of geometries) {
      if (geom.groups && geom.groups.length > 0) {
        for (const group of geom.groups) {
          merged.addGroup(
            group.start + vertexOffset,
            group.count,
            group.materialIndex
          )
        }
      }
      vertexOffset += geom.getAttribute('position').count
    }
  }

  merged.computeBoundingBox()
  merged.computeBoundingSphere()

  return merged
}





export interface RoadCurveOptions {
  pathPoints: Array<{ x: number; z: number }>
  width: number
  thickness: number
  segments: number
  curveTension: number
  heightMode: RoadHeightMode
  elevation: number
  terrainData: TerrainData | null
  canvasSize: number
  baseX?: number
  baseZ?: number
  laneConfig?: RoadLaneConfig
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
        -hw, 0, -hd, hw, 0, -hd, 0, rh, -hd,
        -hw, 0, hd, 0, rh, hd, hw, 0, hd,
        -hw, 0, -hd, 0, rh, -hd, 0, rh, hd, -hw, 0, hd,
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
      const trunk: GeometryItem = {
        geometry: new THREE.CylinderGeometry(p.trunkRadius, p.trunkRadius * 1.2, p.trunkHeight, 8),
        position: [0, p.trunkHeight / 2, 0],
        color: '#8B5E3C',
      }
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
    case 'glb':
      return [{ geometry: new THREE.BoxGeometry(10, 10, 10), position: [0, 5, 0] }]
    case 'girder-bridge':
      return createGirderBridgeGeometries(p)
    case 'arch-bridge':
      return createArchBridgeGeometries(p)
    case 'suspension-bridge':
      return createSuspensionBridgeGeometries(p)
    case 'cable-stayed-bridge':
      return createCableStayedBridgeGeometries(p)
    case 'basketball-court':
      return createBasketballCourtGeometries(p)
    case 'football-field':
      return createFootballFieldGeometries(p)
    case 'tennis-court':
      return createTennisCourtGeometries(p)
    case 'gymnasium':
      return createGymnasiumGeometries(p)
    // ─── 车辆类型 ──────────────────────────────────────────────
    case 'car':
      return createCarGeometries(p)
    case 'suv':
      return createSuvGeometries(p)
    case 'van':
      return createVanGeometries(p)
    case 'truck':
      return createTruckGeometries(p)
    case 'bus':
      return createBusGeometries(p)
    case 'city-bus':
      return createCityBusGeometries(p)
    case 'train':
      return createTrainGeometries(p)
    // ─── 船舶类型 ──────────────────────────────────────────────
    case 'cargo-ship':
      return createCargoShipGeometries(p)
    case 'container-ship':
      return createContainerShipGeometries(p)
    case 'cruise-ship':
      return createCruiseShipGeometries(p)
    case 'pleasure-boat':
      return createPleasureBoatGeometries(p)
    // ─── 交通设施类型 ──────────────────────────────────────────────
    case 'traffic-light':
      return createTrafficLightGeometries(p)
    case 'street-sign':
      return createStreetSignGeometries(p)
    case 'street-lamp':
      return createStreetLampGeometries(p)
    default:
      return [{ geometry: new THREE.BoxGeometry(10, 30, 10), position: [0, 15, 0] }]
  }
}

interface RoadCurvePoint {
  position: THREE.Vector3
  tangent: THREE.Vector3
  right: THREE.Vector3
  baseY: number
  distance: number
}

function buildRoadCurvePoints(
  options: RoadCurveOptions
): RoadCurvePoint[] {
  const {
    pathPoints,
    segments,
    curveTension,
    heightMode,
    elevation,
    terrainData,
    canvasSize,
    baseX = 0,
    baseZ = 0,
  } = options

  if (!pathPoints || pathPoints.length < 2) return []

  let curvePoints: THREE.Vector3[] = []

  if (pathPoints.length === 2) {
    curvePoints = [
      new THREE.Vector3(pathPoints[0].x, 0, pathPoints[0].z),
      new THREE.Vector3(pathPoints[1].x, 0, pathPoints[1].z),
    ]
  } else {
    const ctrlPoints = pathPoints.map(p => new THREE.Vector3(p.x, 0, p.z))
    const curve = new THREE.CatmullRomCurve3(ctrlPoints)
    curve.curveType = 'centripetal'
    curve.tension = curveTension
    const totalSegments = Math.max(segments, pathPoints.length * 4)
    curvePoints = curve.getSpacedPoints(totalSegments)
  }

  const result: RoadCurvePoint[] = []
  let accumulatedDistance = 0

  for (let i = 0; i < curvePoints.length; i++) {
    const pt = curvePoints[i]
    const nextPt = i < curvePoints.length - 1 ? curvePoints[i + 1] : curvePoints[i - 1]
    const prevPt = i > 0 ? curvePoints[i - 1] : curvePoints[i + 1]

    if (i > 0) {
      const prevResultPt = result[i - 1]
      accumulatedDistance += pt.distanceTo(curvePoints[i - 1])
    }

    let tangent: THREE.Vector3
    if (i === 0) {
      tangent = new THREE.Vector3().subVectors(nextPt, pt).normalize()
    } else if (i === curvePoints.length - 1) {
      tangent = new THREE.Vector3().subVectors(pt, prevPt).normalize()
    } else {
      const t1 = new THREE.Vector3().subVectors(pt, prevPt).normalize()
      const t2 = new THREE.Vector3().subVectors(nextPt, pt).normalize()
      tangent = new THREE.Vector3().addVectors(t1, t2).normalize()
    }

    const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()

    let baseY = 0
    if (heightMode === 'elevated') {
      baseY = elevation
    } else if (heightMode === 'follow-terrain' && terrainData) {
      baseY = getTerrainHeightAtSimple(pt.x + baseX, pt.z + baseZ, terrainData, canvasSize)
    }

    result.push({
      position: pt.clone(),
      tangent: tangent.clone(),
      right: right.clone(),
      baseY,
      distance: accumulatedDistance,
    })
  }

  return result
}

function getLineColor(lineType: LaneLineType): string {
  switch (lineType) {
    case 'double-yellow':
      return '#FFD700'
    case 'white-edge':
      return '#FFFFFF'
    case 'solid':
      return '#FFFFFF'
    case 'dashed':
      return '#FFFFFF'
    default:
      return '#FFFFFF'
  }
}

function createLaneLineGeometry(
  curvePoints: RoadCurvePoint[],
  lateralOffset: number,
  lineType: LaneLineType,
  lineWidth: number,
  laneConfig: RoadLaneConfig,
  roadThickness: number
): GeometryItem[] {
  const items: GeometryItem[] = []
  const pointCount = curvePoints.length

  if (pointCount < 2) return items

  const lineThickness = 0.03
  const halfLineW = lineWidth / 2

  if (lineType === 'dashed') {
    const dashLength = laneConfig.dashedLineLength
    const gapLength = laneConfig.dashedLineGap
    const totalLength = curvePoints[pointCount - 1].distance

    let currentDist = 0
    let dashStartIndex = 0

    while (currentDist < totalLength) {
      const dashStartDist = currentDist
      const dashEndDist = currentDist + dashLength

      if (dashStartDist >= totalLength) break

      let startIdx = dashStartIndex
      let endIdx = pointCount - 1

      for (let i = dashStartIndex; i < pointCount; i++) {
        if (curvePoints[i].distance >= dashStartDist) {
          startIdx = i
          break
        }
      }

      for (let i = startIdx; i < pointCount; i++) {
        if (curvePoints[i].distance >= Math.min(dashEndDist, totalLength)) {
          endIdx = i
          break
        }
      }

      if (startIdx < endIdx) {
        const vertices: number[] = []
        const indices: number[] = []

        for (let i = startIdx; i <= endIdx; i++) {
          const cp = curvePoints[i]
          const yOffset = cp.baseY + roadThickness / 2 + 0.01

          const lineLeft = new THREE.Vector3(
            cp.position.x - cp.right.x * (lateralOffset + halfLineW),
            yOffset,
            cp.position.z - cp.right.z * (lateralOffset + halfLineW)
          )
          const lineRight = new THREE.Vector3(
            cp.position.x + cp.right.x * (lateralOffset - halfLineW),
            yOffset,
            cp.position.z + cp.right.z * (lateralOffset - halfLineW)
          )

          const v = (i - startIdx) / (endIdx - startIdx)
          const baseIdx = (i - startIdx) * 2

          vertices.push(
            lineLeft.x, lineLeft.y, lineLeft.z,
            lineRight.x, lineRight.y, lineRight.z
          )

          if (i > startIdx) {
            const prevBaseIdx = baseIdx - 2
            indices.push(
              prevBaseIdx, baseIdx, prevBaseIdx + 1,
              prevBaseIdx + 1, baseIdx, baseIdx + 1
            )
          }
        }

        const geom = new THREE.BufferGeometry()
        geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
        geom.setIndex(indices)
        geom.computeVertexNormals()

        items.push({
          geometry: geom,
          position: [0, 0, 0],
          color: getLineColor(lineType),
        })
      }

      currentDist = dashEndDist + gapLength
      dashStartIndex = endIdx
    }
  } else {
    const vertices: number[] = []
    const indices: number[] = []

    for (let i = 0; i < pointCount; i++) {
      const cp = curvePoints[i]
      const yOffset = cp.baseY + roadThickness / 2 + 0.01

      if (lineType === 'double-yellow') {
        const gap = 0.15
        const lineLeft1 = new THREE.Vector3(
          cp.position.x - cp.right.x * (lateralOffset + halfLineW + gap / 2),
          yOffset,
          cp.position.z - cp.right.z * (lateralOffset + halfLineW + gap / 2)
        )
        const lineRight1 = new THREE.Vector3(
          cp.position.x - cp.right.x * (lateralOffset - halfLineW + gap / 2),
          yOffset,
          cp.position.z - cp.right.z * (lateralOffset - halfLineW + gap / 2)
        )
        const lineLeft2 = new THREE.Vector3(
          cp.position.x - cp.right.x * (lateralOffset + halfLineW - gap / 2),
          yOffset,
          cp.position.z - cp.right.z * (lateralOffset + halfLineW - gap / 2)
        )
        const lineRight2 = new THREE.Vector3(
          cp.position.x - cp.right.x * (lateralOffset - halfLineW - gap / 2),
          yOffset,
          cp.position.z - cp.right.z * (lateralOffset - halfLineW - gap / 2)
        )

        const baseIdx = i * 4
        vertices.push(
          lineLeft1.x, lineLeft1.y, lineLeft1.z,
          lineRight1.x, lineRight1.y, lineRight1.z,
          lineLeft2.x, lineLeft2.y, lineLeft2.z,
          lineRight2.x, lineRight2.y, lineRight2.z
        )

        if (i > 0) {
          const prevBaseIdx = baseIdx - 4
          indices.push(
            prevBaseIdx, baseIdx, prevBaseIdx + 1,
            prevBaseIdx + 1, baseIdx, baseIdx + 1,
            prevBaseIdx + 2, baseIdx + 2, prevBaseIdx + 3,
            prevBaseIdx + 3, baseIdx + 2, baseIdx + 3
          )
        }
      } else {
        const lineLeft = new THREE.Vector3(
          cp.position.x - cp.right.x * (lateralOffset + halfLineW),
          yOffset,
          cp.position.z - cp.right.z * (lateralOffset + halfLineW)
        )
        const lineRight = new THREE.Vector3(
          cp.position.x - cp.right.x * (lateralOffset - halfLineW),
          yOffset,
          cp.position.z - cp.right.z * (lateralOffset - halfLineW)
        )

        const baseIdx = i * 2
        vertices.push(
          lineLeft.x, lineLeft.y, lineLeft.z,
          lineRight.x, lineRight.y, lineRight.z
        )

        if (i > 0) {
          const prevBaseIdx = baseIdx - 2
          indices.push(
            prevBaseIdx, baseIdx, prevBaseIdx + 1,
            prevBaseIdx + 1, baseIdx, baseIdx + 1
          )
        }
      }
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geom.setIndex(indices)
    geom.computeVertexNormals()

    items.push({
      geometry: geom,
      position: [0, 0, 0],
      color: getLineColor(lineType),
    })
  }

  return items
}

function createRoadSurfaceGeometry(
  curvePoints: RoadCurvePoint[],
  width: number,
  thickness: number
): GeometryItem[] {
  const items: GeometryItem[] = []
  const pointCount = curvePoints.length

  if (pointCount < 2) return items

  const halfW = width / 2
  const halfT = thickness / 2

  const vertices: number[] = []
  const indices: number[] = []
  const uvs: number[] = []
  const normals: number[] = []

  for (let i = 0; i < pointCount; i++) {
    const cp = curvePoints[i]
    const baseY = cp.baseY

    const bottomLeft = new THREE.Vector3(
      cp.position.x - cp.right.x * halfW,
      baseY - halfT,
      cp.position.z - cp.right.z * halfW
    )
    const bottomRight = new THREE.Vector3(
      cp.position.x + cp.right.x * halfW,
      baseY - halfT,
      cp.position.z + cp.right.z * halfW
    )
    const topLeft = new THREE.Vector3(
      cp.position.x - cp.right.x * halfW,
      baseY + halfT,
      cp.position.z - cp.right.z * halfW
    )
    const topRight = new THREE.Vector3(
      cp.position.x + cp.right.x * halfW,
      baseY + halfT,
      cp.position.z + cp.right.z * halfW
    )

    const v = i / (pointCount - 1)

    vertices.push(
      bottomLeft.x, bottomLeft.y, bottomLeft.z,
      bottomRight.x, bottomRight.y, bottomRight.z,
      topRight.x, topRight.y, topRight.z,
      topLeft.x, topLeft.y, topLeft.z,
    )

    const normal = new THREE.Vector3().crossVectors(cp.tangent, cp.right).normalize()
    for (let j = 0; j < 4; j++) {
      normals.push(normal.x, normal.y, normal.z)
    }

    uvs.push(0, v, 1, v, 1, v, 0, v)
  }

  for (let i = 0; i < pointCount - 1; i++) {
    const a = i * 4
    const b = a + 1
    const c = a + 2
    const d = a + 3
    const e = a + 4
    const f = a + 5
    const g = a + 6
    const h = a + 7

    indices.push(
      a, e, b, b, e, f,
      b, f, c, c, f, g,
      c, g, d, d, g, h,
      d, h, a, a, h, e,
      d, c, a, c, b, a,
      e, h, f, h, g, f,
    )
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geom.setIndex(indices)

  items.push({
    geometry: geom,
    position: [0, 0, 0],
  })

  return items
}

export function createCurvedRoadGeometries(
  options: RoadCurveOptions
): GeometryItem[] {
  const {
    pathPoints,
    width,
    thickness,
    laneConfig,
  } = options

  if (!pathPoints || pathPoints.length < 2) {
    return [{
      geometry: new THREE.BoxGeometry(width, thickness, 10),
      position: [0, thickness / 2, 0],
    }]
  }

  const curvePoints = buildRoadCurvePoints(options)
  const items: GeometryItem[] = []

  const roadSurfaceItems = createRoadSurfaceGeometry(curvePoints, width, thickness)
  items.push(...roadSurfaceItems)

  // 使用提供的 laneConfig，或者使用默认配置
  const effectiveLaneConfig = laneConfig || {
    laneCount: 2,
    laneWidth: 3.5,
    centerLineType: 'double-yellow' as const,
    laneDividerType: 'dashed' as const,
    edgeLineType: 'white-edge' as const,
    dashedLineLength: 4,
    dashedLineGap: 6,
    showLaneLines: true,
  }

  if (effectiveLaneConfig.showLaneLines) {
    const lineWidth = 0.15
    const laneWidth = effectiveLaneConfig.laneWidth
    const laneCount = effectiveLaneConfig.laneCount
    const totalLaneWidth = laneCount * laneWidth
    const halfTotalLaneW = totalLaneWidth / 2

    // 注意：在 createLaneLineGeometry 中：
    // - 正的 lateralOffset = 向左移动
    // - 负的 lateralOffset = 向右移动
    // 所以：位置 x（相对于中心，向右为正）对应的 offset = -x

    // 生成所有车道线（边线和分隔线）
    for (let i = 0; i <= laneCount; i++) {
      // 线的位置（相对于中心，向右为正）
      const position = -halfTotalLaneW + i * laneWidth
      const offset = -position

      // 确定线的类型
      let lineType: LaneLineType
      let isCenterLine = false

      // 检查是否是边线
      if (i === 0 || i === laneCount) {
        lineType = effectiveLaneConfig.edgeLineType
      }
      // 检查是否是偶数车道数的中心线位置
      else if (laneCount % 2 === 0 && i === laneCount / 2) {
        lineType = effectiveLaneConfig.centerLineType
        isCenterLine = true
      }
      // 检查是否是奇数车道数的中间车道中心（不是分隔线位置，跳过）
      else if (laneCount % 2 === 1 && Math.abs(i - laneCount / 2) < 0.001) {
        continue
      }
      else {
        // 普通分隔线
        lineType = effectiveLaneConfig.laneDividerType
      }

      items.push(...createLaneLineGeometry(
        curvePoints,
        offset,
        lineType,
        lineWidth,
        effectiveLaneConfig,
        thickness
      ))
    }

    // 对于奇数车道数，在中心位置添加单独的中心线
    if (laneCount % 2 === 1 && laneCount >= 3) {
      const centerOffset = 0
      items.push(...createLaneLineGeometry(
        curvePoints,
        centerOffset,
        'solid',
        lineWidth,
        effectiveLaneConfig,
        thickness
      ))
    }
  }

  return items
}

function getTerrainHeightAtSimple(
  x: number,
  z: number,
  terrainData: TerrainData,
  canvasSize: number
): number {
  const halfSize = canvasSize / 2
  const u = (x + halfSize) / canvasSize
  const v = (z + halfSize) / canvasSize

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
  const h1 = h01 * (1 - tx) + h11 * tx

  return h0 * (1 - ty) + h1 * ty
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


// ─── 篮球场 ──────────────────────────────────────────────

function createBasketballCourtGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 28
  const width = p.width || 15
  const floorThickness = p.floorThickness || 0.2
  const poleHeight = p.poleHeight || 4
  const backboardWidth = p.backboardWidth || 1.8
  const backboardHeight = p.backboardHeight || 1.05

  const halfLength = length / 2
  const halfWidth = width / 2

  items.push({
    geometry: new THREE.BoxGeometry(length, floorThickness, width),
    position: [0, floorThickness / 2, 0],
    color: '#D2B48C',
  })

  const lineThickness = 0.05
  const lineHeight = 0.02

  for (const side of [-halfWidth, halfWidth]) {
    items.push({
      geometry: new THREE.BoxGeometry(length, lineHeight, lineThickness),
      position: [0, floorThickness + lineHeight / 2, side],
      color: '#FFFFFF',
    })
  }

  for (const end of [-halfLength, halfLength]) {
    items.push({
      geometry: new THREE.BoxGeometry(lineThickness, lineHeight, width),
      position: [end, floorThickness + lineHeight / 2, 0],
      color: '#FFFFFF',
    })
  }

  items.push({
    geometry: new THREE.BoxGeometry(lineThickness, lineHeight, width),
    position: [0, floorThickness + lineHeight / 2, 0],
    color: '#FFFFFF',
  })

  const centerCircleRadius = 1.8
  const circleSegments = 32
  for (let i = 0; i < circleSegments; i++) {
    const t1 = i / circleSegments
    const t2 = (i + 1) / circleSegments
    const x1 = Math.cos(t1 * Math.PI * 2) * centerCircleRadius
    const z1 = Math.sin(t1 * Math.PI * 2) * centerCircleRadius
    const x2 = Math.cos(t2 * Math.PI * 2) * centerCircleRadius
    const z2 = Math.sin(t2 * Math.PI * 2) * centerCircleRadius

    const midX = (x1 + x2) / 2
    const midZ = (z1 + z2) / 2
    const dx = x2 - x1
    const dz = z2 - z1
    const segmentLength = Math.sqrt(dx * dx + dz * dz)

    const lineGeom = new THREE.BoxGeometry(segmentLength, lineHeight, lineThickness)
    const angle = Math.atan2(dz, dx)
    lineGeom.rotateY(-angle)

    items.push({
      geometry: lineGeom,
      position: [midX, floorThickness + lineHeight / 2, midZ],
      color: '#FFFFFF',
    })
  }

  for (const endSign of [-1, 1]) {
    const endX = endSign * halfLength

    // ─── 立柱 ──────────────────────────────────────
    // 在场外 0.5m 处
    items.push({
      geometry: new THREE.BoxGeometry(0.12, poleHeight, 0.12),
      position: [endX + endSign * 0.5, floorThickness + poleHeight / 2, 0],
      color: '#808080',
    })

    // ─── 篮板 ──────────────────────────────────────
    // 距端线 1.2m（标准 FIBA 距离）
    const backboardX = endX - endSign * 1.2
    const backboardY = floorThickness + poleHeight - backboardHeight / 2
    items.push({
      geometry: new THREE.BoxGeometry(0.05, backboardHeight, backboardWidth),
      position: [backboardX, backboardY, 0],
      color: '#FFFFFF',
    })

    // ─── 伸臂（水平支架）─ 从立柱连接到篮板背面 ────
    const poleFace = endX + endSign * 0.44       // 立柱前端面
    const backboardBack = backboardX + endSign * 0.025  // 篮板背面
    const armLength = Math.abs(backboardBack - poleFace)
    const armCenterX = (poleFace + backboardBack) / 2

    // 伸臂在篮板中心高度，直接连接篮板背面
    items.push({
      geometry: new THREE.BoxGeometry(armLength, 0.08, 0.08),
      position: [armCenterX, backboardY, 0],
      color: '#808080',
    })

    // 上撑杆 - 从伸臂末端连接到篮板上沿
    const bracketLen = Math.abs(backboardBack - (backboardX - endSign * 0.025))
    const bracketCenterX = (backboardBack + (backboardX - endSign * 0.025)) / 2
    items.push({
      geometry: new THREE.BoxGeometry(bracketLen, 0.05, 0.05),
      position: [bracketCenterX, backboardY + backboardHeight / 2 - 0.05, 0],
      color: '#808080',
    })
    // 下撑杆 - 从伸臂末端连接到篮筐下沿
    items.push({
      geometry: new THREE.BoxGeometry(bracketLen, 0.05, 0.05),
      position: [bracketCenterX, backboardY - backboardHeight / 2 + 0.05, 0],
      color: '#808080',
    })

    // ─── 篮筐 ──────────────────────────────────────
    // 半径 0.225m（标准 Φ450mm），完全伸出篮板前端面
    const hoopRadius = 0.225
    const hoopSegments = 24
    const backboardFront = backboardX - endSign * 0.025
    // 篮筐中心在篮板前端面往前 0.1m 处
    const hoopCenterX = backboardFront - endSign * (0.1 + hoopRadius)

    for (let i = 0; i < hoopSegments; i++) {
      const t1 = i / hoopSegments
      const t2 = (i + 1) / hoopSegments
      const x1 = Math.cos(t1 * Math.PI * 2) * hoopRadius
      const z1 = Math.sin(t1 * Math.PI * 2) * hoopRadius
      const x2 = Math.cos(t2 * Math.PI * 2) * hoopRadius
      const z2 = Math.sin(t2 * Math.PI * 2) * hoopRadius

      const midX = (x1 + x2) / 2
      const midZ = (z1 + z2) / 2
      const dx = x2 - x1
      const dz = z2 - z1
      const segmentLength = Math.sqrt(dx * dx + dz * dz)

      const hoopGeom = new THREE.CylinderGeometry(0.008, 0.008, segmentLength, 6)
      hoopGeom.rotateX(Math.PI / 2)
      hoopGeom.rotateY(Math.atan2(dx, dz))

      items.push({
        geometry: hoopGeom,
        position: [hoopCenterX + midX, floorThickness + 3.05, midZ],
        color: '#FF6600',
      })
    }

    // ─── 罚球区（梯形）─────────────────────────────
    // FIBA 标准：底线宽 6m，罚球线处宽 3.6m，长 5.8m
    const ftLineWidth = 3.6
    const ftBaseWidth = 6.0
    const ftLength = 5.8
    const ftLineX = endX - endSign * ftLength  // 罚球线

    // 两侧边线（梯形斜边），用分段小线段模拟
    const ftZSegments = 8
    for (let zSign of [-1, 1]) {
      for (let i = 0; i < ftZSegments; i++) {
        const t1 = i / ftZSegments
        const t2 = (i + 1) / ftZSegments
        const x1 = endX - endSign * t1 * ftLength
        const z1 = zSign * (ftBaseWidth / 2 - t1 * (ftBaseWidth - ftLineWidth) / 2)
        const x2 = endX - endSign * t2 * ftLength
        const z2 = zSign * (ftBaseWidth / 2 - t2 * (ftBaseWidth - ftLineWidth) / 2)
        const segMidX = (x1 + x2) / 2
        const segMidZ = (z1 + z2) / 2
        const sx = x2 - x1
        const sz = z2 - z1
        const sl = Math.sqrt(sx * sx + sz * sz)
        const lineGeom = new THREE.BoxGeometry(sl, lineHeight, lineThickness)
        lineGeom.rotateY(-Math.atan2(sz, sx))
        items.push({
          geometry: lineGeom,
          position: [segMidX, floorThickness + lineHeight / 2, segMidZ],
          color: '#FFFFFF',
        })
      }
    }
    // 罚球线
    items.push({
      geometry: new THREE.BoxGeometry(lineThickness, lineHeight, ftLineWidth),
      position: [ftLineX, floorThickness + lineHeight / 2, 0],
      color: '#FFFFFF',
    })
    // 罚球圈（半径 1.8m 半圆，朝向球场）
    const ftCircleRadius = 1.8
    const ftCircleSegs = 20
    for (let i = 0; i < ftCircleSegs; i++) {
      const t1 = Math.PI / 2 + (i / ftCircleSegs) * Math.PI
      const t2 = Math.PI / 2 + ((i + 1) / ftCircleSegs) * Math.PI
      const x1 = ftLineX + endSign * ftCircleRadius * Math.cos(t1)
      const z1 = ftCircleRadius * Math.sin(t1)
      const x2 = ftLineX + endSign * ftCircleRadius * Math.cos(t2)
      const z2 = ftCircleRadius * Math.sin(t2)
      const midX = (x1 + x2) / 2
      const midZ = (z1 + z2) / 2
      const dx = x2 - x1
      const dz = z2 - z1
      const sl = Math.sqrt(dx * dx + dz * dz)
      const lineGeom = new THREE.BoxGeometry(sl, lineHeight, lineThickness)
      lineGeom.rotateY(-Math.atan2(dz, dx))
      items.push({
        geometry: lineGeom,
        position: [midX, floorThickness + lineHeight / 2, midZ],
        color: '#FFFFFF',
      })
    }

    // ─── 三分线 ──────────────────────────────────────
    // FIBA: 半径 6.75m，平行线距边线 0.9m
    const threePtRadius = 6.75
    const threePtParZ = halfWidth - 0.9  // 6.6
    const basketCenterX = endX - endSign * 1.35  // 篮圈中心投影（距端线 1.35m）

    const dxThree = Math.sqrt(threePtRadius * threePtRadius - threePtParZ * threePtParZ)
    const arcStartX = basketCenterX - endSign * dxThree

    // 平行线 - 从底线到弧线起点
    const parLineLen = Math.abs(endX - arcStartX)
    const parLineCenterX = (endX + arcStartX) / 2
    // 上侧平行线
    items.push({
      geometry: new THREE.BoxGeometry(parLineLen, lineHeight, lineThickness),
      position: [parLineCenterX, floorThickness + lineHeight / 2, threePtParZ],
      color: '#FFFFFF',
    })
    // 下侧平行线
    items.push({
      geometry: new THREE.BoxGeometry(parLineLen, lineHeight, lineThickness),
      position: [parLineCenterX, floorThickness + lineHeight / 2, -threePtParZ],
      color: '#FFFFFF',
    })

    // 三分弧线
    const threePtSegs = 32
    const maxAngle = Math.asin(Math.min(threePtParZ / threePtRadius, 1))
    for (let i = 0; i < threePtSegs; i++) {
      const t1 = maxAngle - (i / threePtSegs) * 2 * maxAngle
      const t2 = maxAngle - ((i + 1) / threePtSegs) * 2 * maxAngle
      const x1 = basketCenterX - endSign * threePtRadius * Math.cos(t1)
      const z1 = threePtRadius * Math.sin(t1)
      const x2 = basketCenterX - endSign * threePtRadius * Math.cos(t2)
      const z2 = threePtRadius * Math.sin(t2)
      const midX = (x1 + x2) / 2
      const midZ = (z1 + z2) / 2
      const dx = x2 - x1
      const dz = z2 - z1
      const sl = Math.sqrt(dx * dx + dz * dz)
      const lineGeom = new THREE.BoxGeometry(sl, lineHeight, lineThickness)
      lineGeom.rotateY(-Math.atan2(dz, dx))
      items.push({
        geometry: lineGeom,
        position: [midX, floorThickness + lineHeight / 2, midZ],
        color: '#FFFFFF',
      })
    }
  }

  return items
}


// ─── 足球场 ──────────────────────────────────────────────

function createFootballFieldGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 105
  const width = p.width || 68
  const floorThickness = p.floorThickness || 0.2
  const goalHeight = p.goalHeight || 2.44
  const goalWidth = p.goalWidth || 7.32

  const halfLength = length / 2
  const halfWidth = width / 2
  const lineThickness = 0.12
  const lineHeight = 0.02
  const goalDepth = 2.0

  items.push({
    geometry: new THREE.BoxGeometry(length, floorThickness, width),
    position: [0, floorThickness / 2, 0],
    color: '#228B22',
  })

  for (const side of [-halfWidth + lineThickness / 2, halfWidth - lineThickness / 2]) {
    items.push({
      geometry: new THREE.BoxGeometry(length, lineHeight, lineThickness),
      position: [0, floorThickness + lineHeight / 2, side],
      color: '#FFFFFF',
    })
  }

  for (const end of [-halfLength + lineThickness / 2, halfLength - lineThickness / 2]) {
    items.push({
      geometry: new THREE.BoxGeometry(lineThickness, lineHeight, width),
      position: [end, floorThickness + lineHeight / 2, 0],
      color: '#FFFFFF',
    })
  }

  items.push({
    geometry: new THREE.BoxGeometry(lineThickness, lineHeight, width),
    position: [0, floorThickness + lineHeight / 2, 0],
    color: '#FFFFFF',
  })

  const centerCircleRadius = 9.15
  const circleSegments = 64
  for (let i = 0; i < circleSegments; i++) {
    const t1 = i / circleSegments
    const t2 = (i + 1) / circleSegments
    const x1 = Math.cos(t1 * Math.PI * 2) * centerCircleRadius
    const z1 = Math.sin(t1 * Math.PI * 2) * centerCircleRadius
    const x2 = Math.cos(t2 * Math.PI * 2) * centerCircleRadius
    const z2 = Math.sin(t2 * Math.PI * 2) * centerCircleRadius

    const midX = (x1 + x2) / 2
    const midZ = (z1 + z2) / 2
    const dx = x2 - x1
    const dz = z2 - z1
    const segmentLength = Math.sqrt(dx * dx + dz * dz)

    const lineGeom = new THREE.BoxGeometry(segmentLength, lineHeight, lineThickness)
    const angle = Math.atan2(dz, dx)
    lineGeom.rotateY(-angle)

    items.push({
      geometry: lineGeom,
      position: [midX, floorThickness + lineHeight / 2, midZ],
      color: '#FFFFFF',
    })
  }

  items.push({
    geometry: new THREE.CylinderGeometry(0.1, 0.1, lineHeight, 8),
    position: [0, floorThickness + lineHeight / 2, 0],
    color: '#FFFFFF',
  })

  for (const endSign of [-1, 1]) {
    const endX = endSign * halfLength

    const penaltyAreaWidth = 40.32
    const penaltyAreaLength = 16.5
    const penaltyAreaHalfWidth = penaltyAreaWidth / 2
    const penaltyAreaBackX = endX - endSign * penaltyAreaLength

    items.push({
      geometry: new THREE.BoxGeometry(penaltyAreaLength, lineHeight, lineThickness),
      position: [endX - endSign * penaltyAreaLength / 2, floorThickness + lineHeight / 2, -penaltyAreaHalfWidth + lineThickness / 2],
      color: '#FFFFFF',
    })
    items.push({
      geometry: new THREE.BoxGeometry(penaltyAreaLength, lineHeight, lineThickness),
      position: [endX - endSign * penaltyAreaLength / 2, floorThickness + lineHeight / 2, penaltyAreaHalfWidth - lineThickness / 2],
      color: '#FFFFFF',
    })
    items.push({
      geometry: new THREE.BoxGeometry(lineThickness, lineHeight, penaltyAreaWidth),
      position: [penaltyAreaBackX, floorThickness + lineHeight / 2, 0],
      color: '#FFFFFF',
    })

    const goalAreaWidth = 18.32
    const goalAreaLength = 5.5
    const goalAreaHalfWidth = goalAreaWidth / 2
    const goalAreaBackX = endX - endSign * goalAreaLength

    items.push({
      geometry: new THREE.BoxGeometry(goalAreaLength, lineHeight, lineThickness),
      position: [endX - endSign * goalAreaLength / 2, floorThickness + lineHeight / 2, -goalAreaHalfWidth + lineThickness / 2],
      color: '#FFFFFF',
    })
    items.push({
      geometry: new THREE.BoxGeometry(goalAreaLength, lineHeight, lineThickness),
      position: [endX - endSign * goalAreaLength / 2, floorThickness + lineHeight / 2, goalAreaHalfWidth - lineThickness / 2],
      color: '#FFFFFF',
    })
    items.push({
      geometry: new THREE.BoxGeometry(lineThickness, lineHeight, goalAreaWidth),
      position: [goalAreaBackX, floorThickness + lineHeight / 2, 0],
      color: '#FFFFFF',
    })

    const penaltySpotX = endX - endSign * 11
    items.push({
      geometry: new THREE.CylinderGeometry(0.1, 0.1, lineHeight, 8),
      position: [penaltySpotX, floorThickness + lineHeight / 2, 0],
      color: '#FFFFFF',
    })

    const cornerRadius = 1.0
    const cornerSegments = 16

    for (const zSign of [-1, 1]) {
      const cornerZ = zSign * halfWidth
      const baseAngle = endSign === 1 ? (zSign === 1 ? Math.PI : Math.PI / 2) : (zSign === 1 ? -Math.PI / 2 : 0)

      for (let i = 0; i < cornerSegments; i++) {
        const t1 = i / cornerSegments
        const t2 = (i + 1) / cornerSegments
        const angle1 = baseAngle + t1 * Math.PI / 2
        const angle2 = baseAngle + t2 * Math.PI / 2

        const x1 = endX + Math.cos(angle1) * cornerRadius
        const z1 = cornerZ + Math.sin(angle1) * cornerRadius
        const x2 = endX + Math.cos(angle2) * cornerRadius
        const z2 = cornerZ + Math.sin(angle2) * cornerRadius

        const midX = (x1 + x2) / 2
        const midZ = (z1 + z2) / 2
        const dx = x2 - x1
        const dz = z2 - z1
        const segmentLength = Math.sqrt(dx * dx + dz * dz)

        const lineGeom = new THREE.BoxGeometry(segmentLength, lineHeight, lineThickness)
        const segAngle = Math.atan2(dz, dx)
        lineGeom.rotateY(-segAngle)

        items.push({
          geometry: lineGeom,
          position: [midX, floorThickness + lineHeight / 2, midZ],
          color: '#FFFFFF',
        })
      }
    }

    const goalHalfWidth = goalWidth / 2
    const postThickness = 0.12
    const backX = endX + endSign * goalDepth

    // ─── 前门柱 ──────────────────────────────
    for (const zSign of [-1, 1]) {
      items.push({
        geometry: new THREE.CylinderGeometry(postThickness / 2, postThickness / 2, goalHeight, 8),
        position: [endX, floorThickness + goalHeight / 2, zSign * goalHalfWidth],
        color: '#FFFFFF',
      })
    }

    // ─── 前横梁 ──────────────────────────────
    const crossbarGeom = new THREE.CylinderGeometry(postThickness / 2, postThickness / 2, goalWidth, 8)
    crossbarGeom.rotateX(Math.PI / 2)
    items.push({
      geometry: crossbarGeom,
      position: [endX, floorThickness + goalHeight, 0],
      color: '#FFFFFF',
    })

    // ─── 球网（从门框斜向下拉到地面）───────
    // 后端落地位置比前端宽：每边宽 0.5m
    const backHalfWidth = goalHalfWidth + 0.5

    // 左侧网（三角形）：左门柱 → 地面左后锚点
    const leftNetVerts = new Float32Array([
      endX, floorThickness, -goalHalfWidth,                // 左门柱底
      endX, floorThickness + goalHeight, -goalHalfWidth,   // 左门柱顶
      backX, floorThickness, -backHalfWidth,               // 左后地面锚点
    ])
    const leftNetGeom = new THREE.BufferGeometry()
    leftNetGeom.setAttribute('position', new THREE.BufferAttribute(leftNetVerts, 3))
    leftNetGeom.setIndex([0, 1, 2])
    leftNetGeom.computeVertexNormals()
    items.push({
      geometry: leftNetGeom,
      position: [0, 0, 0],
      color: '#E8E8E8',
      opacity: 0.2,
    })

    // 右侧网（三角形）：右门柱 → 地面右后锚点
    const rightNetVerts = new Float32Array([
      endX, floorThickness + goalHeight, goalHalfWidth,    // 右门柱顶
      endX, floorThickness, goalHalfWidth,                 // 右门柱底
      backX, floorThickness, backHalfWidth,                // 右后地面锚点
    ])
    const rightNetGeom = new THREE.BufferGeometry()
    rightNetGeom.setAttribute('position', new THREE.BufferAttribute(rightNetVerts, 3))
    rightNetGeom.setIndex([0, 1, 2])
    rightNetGeom.computeVertexNormals()
    items.push({
      geometry: rightNetGeom,
      position: [0, 0, 0],
      color: '#E8E8E8',
      opacity: 0.2,
    })

    // 顶网（四边形）：横梁 → 地面后端线
    const topNetVerts = new Float32Array([
      endX, floorThickness + goalHeight, -goalHalfWidth,   // 横梁左端
      endX, floorThickness + goalHeight, goalHalfWidth,    // 横梁右端
      backX, floorThickness, backHalfWidth,                // 右后地面锚点
      backX, floorThickness, -backHalfWidth,               // 左后地面锚点
    ])
    const topNetGeom = new THREE.BufferGeometry()
    topNetGeom.setAttribute('position', new THREE.BufferAttribute(topNetVerts, 3))
    topNetGeom.setIndex([0, 1, 2, 0, 2, 3])
    topNetGeom.computeVertexNormals()
    items.push({
      geometry: topNetGeom,
      position: [0, 0, 0],
      color: '#E8E8E8',
      opacity: 0.2,
    })
  }

  return items
}


// ─── 网球场 ──────────────────────────────────────────────

function createTennisCourtGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 23.77
  const width = p.width || 10.97
  const singleWidth = p.singleWidth || 8.23
  const floorThickness = p.floorThickness || 0.2
  const netHeight = p.netHeight || 0.914

  const halfLength = length / 2
  const halfWidth = width / 2
  const halfSingleWidth = singleWidth / 2
  const lineThickness = 0.05
  const lineHeight = 0.02

  items.push({
    geometry: new THREE.BoxGeometry(length, floorThickness, width),
    position: [0, floorThickness / 2, 0],
    color: '#4169E1',
  })

  for (const side of [-halfWidth, halfWidth]) {
    items.push({
      geometry: new THREE.BoxGeometry(length, lineHeight, lineThickness),
      position: [0, floorThickness + lineHeight / 2, side],
      color: '#FFFFFF',
    })
  }

  for (const end of [-halfLength, halfLength]) {
    items.push({
      geometry: new THREE.BoxGeometry(lineThickness, lineHeight, width),
      position: [end, floorThickness + lineHeight / 2, 0],
      color: '#FFFFFF',
    })
  }

  for (const side of [-halfSingleWidth, halfSingleWidth]) {
    items.push({
      geometry: new THREE.BoxGeometry(length, lineHeight, lineThickness),
      position: [0, floorThickness + lineHeight / 2, side],
      color: '#FFFFFF',
    })
  }

  items.push({
    geometry: new THREE.BoxGeometry(lineThickness, lineHeight, width),
    position: [0, floorThickness + lineHeight / 2, 0],
    color: '#FFFFFF',
  })

  const serviceLineDist = 6.4
  for (const endSign of [-1, 1]) {
    const lineX = endSign * serviceLineDist
    items.push({
      geometry: new THREE.BoxGeometry(lineThickness, lineHeight, singleWidth),
      position: [lineX, floorThickness + lineHeight / 2, 0],
      color: '#FFFFFF',
    })
  }

  items.push({
    geometry: new THREE.BoxGeometry(serviceLineDist * 2, lineHeight, lineThickness),
    position: [0, floorThickness + lineHeight / 2, 0],
    color: '#FFFFFF',
  })

  const netWidth = width + 1
  const netThickness = 0.05

  for (const side of [-halfWidth - 0.5, halfWidth + 0.5]) {
    items.push({
      geometry: new THREE.CylinderGeometry(0.05, 0.05, 1.07, 8),
      position: [0, floorThickness + 1.07 / 2, side],
      color: '#808080',
    })
  }

  items.push({
    geometry: new THREE.BoxGeometry(netThickness, 0.02, netWidth),
    position: [0, floorThickness + netHeight, 0],
    color: '#FFFFFF',
  })

  items.push({
    geometry: new THREE.BoxGeometry(netThickness, netHeight, netWidth),
    position: [0, floorThickness + netHeight / 2, 0],
    color: '#C0C0C0',
  })

  return items
}


// ─── 体育馆 ──────────────────────────────────────────────

function createGymnasiumGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 80
  const width = p.width || 60
  const height = p.height || 25
  const wallThickness = p.wallThickness || 1.5
  const roofHeight = p.roofHeight || 12
  const entranceWidth = p.entranceWidth || 12
  const entranceHeight = p.entranceHeight || 6

  const halfLength = length / 2
  const halfWidth = width / 2

  items.push({
    geometry: new THREE.BoxGeometry(length, height, width),
    position: [0, height / 2, 0],
    color: '#F5F5DC',
  })

  for (const end of [-halfLength + wallThickness / 2, halfLength - wallThickness / 2]) {
    items.push({
      geometry: new THREE.BoxGeometry(wallThickness, height, width),
      position: [end, height / 2, 0],
      color: '#D2B48C',
    })
  }

  for (const side of [-halfWidth + wallThickness / 2, halfWidth - wallThickness / 2]) {
    items.push({
      geometry: new THREE.BoxGeometry(length, height, wallThickness),
      position: [0, height / 2, side],
      color: '#D2B48C',
    })
  }

  for (const endSign of [-1, 1]) {
    const endX = endSign * halfLength

    items.push({
      geometry: new THREE.BoxGeometry(wallThickness, entranceHeight, entranceWidth),
      position: [endX, entranceHeight / 2, 0],
      color: '#2F4F4F',
    })

    items.push({
      geometry: new THREE.BoxGeometry(entranceWidth + 2, 1, wallThickness),
      position: [endX - endSign * wallThickness / 2, entranceHeight + 0.5, 0],
      color: '#8B4513',
    })
  }

  const roofSegments = 20
  const roofLength = length + 4
  const roofWidth = width + 4
  const halfRoofLength = roofLength / 2
  const halfRoofWidth = roofWidth / 2

  for (let i = 0; i < roofSegments; i++) {
    const x1 = -halfRoofLength + (i / roofSegments) * roofLength
    const x2 = -halfRoofLength + ((i + 1) / roofSegments) * roofLength

    const leftRoofGeom = new THREE.BufferGeometry()
    const leftVertices = new Float32Array([
      x1, height, -halfRoofWidth,
      x2, height, -halfRoofWidth,
      x2, height + roofHeight, 0,
      x1, height + roofHeight, 0,
    ])
    const leftIndices = [0, 1, 2, 0, 2, 3]
    leftRoofGeom.setAttribute('position', new THREE.BufferAttribute(leftVertices, 3))
    leftRoofGeom.setIndex(leftIndices)
    leftRoofGeom.computeVertexNormals()

    items.push({
      geometry: leftRoofGeom,
      position: [0, 0, 0],
      color: '#8B4513',
    })

    const rightRoofGeom = new THREE.BufferGeometry()
    const rightVertices = new Float32Array([
      x1, height, halfRoofWidth,
      x2, height, halfRoofWidth,
      x2, height + roofHeight, 0,
      x1, height + roofHeight, 0,
    ])
    const rightIndices = [0, 2, 1, 0, 3, 2]
    rightRoofGeom.setAttribute('position', new THREE.BufferAttribute(rightVertices, 3))
    rightRoofGeom.setIndex(rightIndices)
    rightRoofGeom.computeVertexNormals()

    items.push({
      geometry: rightRoofGeom,
      position: [0, 0, 0],
      color: '#8B4513',
    })
  }

  items.push({
    geometry: new THREE.BoxGeometry(roofLength, 0.3, 1),
    position: [0, height + roofHeight, 0],
    color: '#654321',
  })

  for (const endSign of [-1, 1]) {
    const endX = endSign * halfRoofLength

    const gableGeom = new THREE.BufferGeometry()
    const gableVertices = new Float32Array([
      endX, height, -halfRoofWidth,
      endX, height, halfRoofWidth,
      endX, height + roofHeight, 0,
    ])
    const gableIndices = [0, 1, 2]
    gableGeom.setAttribute('position', new THREE.BufferAttribute(gableVertices, 3))
    gableGeom.setIndex(gableIndices)
    gableGeom.computeVertexNormals()

    items.push({
      geometry: gableGeom,
      position: [0, 0, 0],
      color: '#D2B48C',
    })
  }

  const windowWidth = 3
  const windowHeight = 4
  const windowCount = 6
  const windowSpacing = length / (windowCount + 1)

  for (const sideSign of [-1, 1]) {
    const sideZ = sideSign * (halfWidth - wallThickness / 2)
    for (let i = 1; i <= windowCount; i++) {
      const windowX = -halfLength + i * windowSpacing
      items.push({
        geometry: new THREE.BoxGeometry(0.1, windowHeight, windowWidth),
        position: [windowX, height / 2 + 1, sideZ],
        color: '#87CEEB',
      })
    }
  }

  items.push({
    geometry: new THREE.BoxGeometry(length - wallThickness * 4, 0.2, width - wallThickness * 4),
    position: [0, 0.1, 0],
    color: '#DEB887',
  })

  const bleacherWidth = 8
  const bleacherDepth = 1.5
  const bleacherHeight = 0.6
  const bleacherRows = 6

  for (let row = 0; row < bleacherRows; row++) {
    items.push({
      geometry: new THREE.BoxGeometry(length * 0.7, bleacherHeight, bleacherDepth),
      position: [0, row * bleacherHeight + bleacherHeight / 2, -halfWidth + wallThickness + row * bleacherDepth + bleacherDepth / 2],
      color: '#A0522D',
    })
  }

  for (let row = 0; row < bleacherRows; row++) {
    items.push({
      geometry: new THREE.BoxGeometry(length * 0.7, bleacherHeight, bleacherDepth),
      position: [0, row * bleacherHeight + bleacherHeight / 2, halfWidth - wallThickness - row * bleacherDepth - bleacherDepth / 2],
      color: '#A0522D',
    })
  }

  return items
}


// ─── 车辆类型几何生成函数 ──────────────────────────────────────────────

function createCarGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 4.5
  const width = p.width || 1.8
  const height = p.height || 1.5
  const wheelRadius = p.wheelRadius || 0.35
  const wheelWidth = p.wheelWidth || 0.2

  const hl = length / 2
  const hw = width / 2
  const gc = 0.05 // ground clearance
  const bh = height * 0.45 // lower body height
  const ch = height * 0.55 // cabin height

  // ─── 连续车身轮廓（Shape + ExtrudeGeometry）───
  // 俯视逆时针：前保底 → 前保顶 → 引擎盖 → 前挡 → 车顶 → 后挡 → 后备箱 → 后保底
  const bodyShape = new THREE.Shape()
  bodyShape.moveTo(hl, gc)
  bodyShape.lineTo(hl - 0.08, gc + bh * 0.25)
  bodyShape.lineTo(hl - hl * 0.6, gc + bh * 0.85)
  bodyShape.lineTo(hl * 0.35, gc + bh + ch * 0.96)
  bodyShape.lineTo(-hl * 0.45, gc + bh + ch * 0.96)
  bodyShape.lineTo(-hl * 0.68, gc + bh * 0.72)
  bodyShape.lineTo(-hl + 0.08, gc + bh * 0.25)
  bodyShape.lineTo(-hl, gc)
  bodyShape.closePath()

  const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, {
    depth: width * 0.94,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 2,
  })
  bodyGeom.translate(0, 0, -width * 0.47)
  bodyGeom.computeVertexNormals()
  items.push({ geometry: bodyGeom, position: [0, 0, 0] })

  // ─── 车轮 ───
  const wheelPositions = [
    [-hl * 0.65, hw - wheelWidth / 2],
    [-hl * 0.65, -hw + wheelWidth / 2],
    [hl * 0.65, hw - wheelWidth / 2],
    [hl * 0.65, -hw + wheelWidth / 2],
  ]
  for (const [wx, wz] of wheelPositions) {
    const wheelGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16)
    wheelGeom.rotateX(Math.PI / 2)
    items.push({
      geometry: wheelGeom,
      position: [wx, wheelRadius, wz],
      color: '#1A1A1A',
    })
  }

  // ─── 车窗 ───
  const windowShape = new THREE.Shape()
  windowShape.moveTo(hl * 0.36, gc + bh + ch * 0.06)
  windowShape.lineTo(hl * 0.36, gc + bh + ch * 0.90)
  windowShape.lineTo(-hl * 0.44, gc + bh + ch * 0.90)
  windowShape.lineTo(-hl * 0.44, gc + bh + ch * 0.06)
  windowShape.closePath()
  const windowGeom = new THREE.ExtrudeGeometry(windowShape, {
    depth: width * 0.80,
    bevelEnabled: false,
  })
  windowGeom.translate(0, 0, -width * 0.40)
  windowGeom.computeVertexNormals()
  items.push({
    geometry: windowGeom,
    position: [0, 0, 0],
    color: '#87CEEB',
    opacity: 0.5,
  })

  // ─── 前灯 & 尾灯 ───
  items.push({
    geometry: new THREE.BoxGeometry(0.04, bh * 0.25, width * 0.3),
    position: [hl + 0.02, gc + bh * 0.3, 0],
    color: '#FFE082',
  })
  items.push({
    geometry: new THREE.BoxGeometry(0.04, bh * 0.2, width * 0.25),
    position: [-hl - 0.02, gc + bh * 0.25, 0],
    color: '#EF5350',
  })

  return mergeGeometriesByColor(items)
}


function createSuvGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 4.8
  const width = p.width || 1.9
  const height = p.height || 1.7
  const wheelRadius = p.wheelRadius || 0.4
  const wheelWidth = p.wheelWidth || 0.25
  const gc = p.groundClearance || 0.2

  const hl = length / 2
  const hw = width / 2
  const bh = height * 0.48
  const ch = height * 0.52

  // ─── 连续车身轮廓 ───
  // SUV：较高的底盘、直立车尾
  const bodyShape = new THREE.Shape()
  bodyShape.moveTo(hl, gc)
  bodyShape.lineTo(hl - 0.10, gc + bh * 0.25)
  bodyShape.lineTo(hl * 0.40, gc + bh * 0.85)
  bodyShape.lineTo(hl * 0.28, gc + bh + ch * 0.96)
  bodyShape.lineTo(-hl * 0.50, gc + bh + ch * 0.96)
  bodyShape.lineTo(-hl * 0.75, gc + bh * 0.70)
  bodyShape.lineTo(-hl + 0.10, gc + bh * 0.20)
  bodyShape.lineTo(-hl, gc)
  bodyShape.closePath()

  const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, {
    depth: width * 0.96,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 2,
  })
  bodyGeom.translate(0, 0, -width * 0.48)
  bodyGeom.computeVertexNormals()
  items.push({ geometry: bodyGeom, position: [0, 0, 0] })

  // ─── 车轮 ───
  const wheelPositions = [
    [-hl * 0.68, hw - wheelWidth / 2],
    [-hl * 0.68, -hw + wheelWidth / 2],
    [hl * 0.68, hw - wheelWidth / 2],
    [hl * 0.68, -hw + wheelWidth / 2],
  ]
  for (const [wx, wz] of wheelPositions) {
    const wheelGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16)
    wheelGeom.rotateX(Math.PI / 2)
    items.push({
      geometry: wheelGeom,
      position: [wx, wheelRadius, wz],
      color: '#1A1A1A',
    })
  }

  // ─── 车窗 ───
  const windowShape = new THREE.Shape()
  windowShape.moveTo(hl * 0.30, gc + bh + ch * 0.05)
  windowShape.lineTo(hl * 0.30, gc + bh + ch * 0.91)
  windowShape.lineTo(-hl * 0.48, gc + bh + ch * 0.91)
  windowShape.lineTo(-hl * 0.48, gc + bh + ch * 0.05)
  windowShape.closePath()
  const windowGeom = new THREE.ExtrudeGeometry(windowShape, {
    depth: width * 0.84,
    bevelEnabled: false,
  })
  windowGeom.translate(0, 0, -width * 0.42)
  windowGeom.computeVertexNormals()
  items.push({
    geometry: windowGeom,
    position: [0, 0, 0],
    color: '#87CEEB',
    opacity: 0.5,
  })

  // ─── 行李架 ───
  items.push({
    geometry: new THREE.BoxGeometry(length * 0.35, 0.04, width * 0.75),
    position: [0, gc + bh + ch + 0.02, 0],
    color: '#808080',
  })

  // ─── 灯 ───
  items.push({
    geometry: new THREE.BoxGeometry(0.04, bh * 0.3, width * 0.32),
    position: [hl + 0.02, gc + bh * 0.30, 0],
    color: '#FFE082',
  })
  items.push({
    geometry: new THREE.BoxGeometry(0.04, bh * 0.22, width * 0.28),
    position: [-hl - 0.02, gc + bh * 0.22, 0],
    color: '#EF5350',
  })

  return mergeGeometriesByColor(items)
}


function createVanGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 5.5
  const width = p.width || 2.0
  const height = p.height || 2.2
  const wheelRadius = p.wheelRadius || 0.38
  const wheelWidth = p.wheelWidth || 0.22

  const hl = length / 2
  const hw = width / 2
  const gc = 0.05
  const bh = height * 0.35
  const ch = height * 0.65

  // ─── 连续车身轮廓（单厢车）───
  const bodyShape = new THREE.Shape()
  bodyShape.moveTo(hl, gc)
  bodyShape.lineTo(hl - 0.08, gc + bh * 0.20)
  bodyShape.lineTo(hl * 0.60, gc + bh * 0.85)
  bodyShape.lineTo(hl * 0.50, gc + bh + ch * 0.96)
  bodyShape.lineTo(-hl * 0.55, gc + bh + ch * 0.96)
  bodyShape.lineTo(-hl + 0.08, gc + bh * 0.20)
  bodyShape.lineTo(-hl, gc)
  bodyShape.closePath()

  const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, {
    depth: width * 0.96,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.03,
    bevelSegments: 2,
  })
  bodyGeom.translate(0, 0, -width * 0.48)
  bodyGeom.computeVertexNormals()
  items.push({ geometry: bodyGeom, position: [0, 0, 0] })

  // ─── 车轮 ───
  const wheelPositions = [
    [-hl * 0.78, hw - wheelWidth / 2],
    [-hl * 0.78, -hw + wheelWidth / 2],
    [hl * 0.62, hw - wheelWidth / 2],
    [hl * 0.62, -hw + wheelWidth / 2],
  ]
  for (const [wx, wz] of wheelPositions) {
    const wheelGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16)
    wheelGeom.rotateX(Math.PI / 2)
    items.push({
      geometry: wheelGeom,
      position: [wx, wheelRadius, wz],
      color: '#1A1A1A',
    })
  }

  // ─── 侧窗（整体式）───
  const windowShape = new THREE.Shape()
  windowShape.moveTo(hl * 0.52, gc + bh + ch * 0.04)
  windowShape.lineTo(hl * 0.52, gc + bh + ch * 0.91)
  windowShape.lineTo(-hl * 0.53, gc + bh + ch * 0.91)
  windowShape.lineTo(-hl * 0.53, gc + bh + ch * 0.04)
  windowShape.closePath()
  const windowGeom = new THREE.ExtrudeGeometry(windowShape, {
    depth: width * 0.86,
    bevelEnabled: false,
  })
  windowGeom.translate(0, 0, -width * 0.43)
  windowGeom.computeVertexNormals()
  items.push({
    geometry: windowGeom,
    position: [0, 0, 0],
    color: '#87CEEB',
    opacity: 0.4,
  })

  return mergeGeometriesByColor(items)
}


function createTruckGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 12.0
  const width = p.width || 2.5
  const height = p.height || 3.5
  const wheelRadius = p.wheelRadius || 0.5
  const wheelWidth = p.wheelWidth || 0.3
  const cabLength = p.cabLength || 3.0
  const cargoLength = p.cargoLength || 7.0
  const cargoHeight = p.cargoHeight || 2.5

  const hl = length / 2
  const hw = width / 2
  const gc = 0.1

  // ─── 驾驶室（连续轮廓）───
  const cabShape = new THREE.Shape()
  const cabH = height * 0.45
  const cabWinH = height * 0.50
  cabShape.moveTo(-hl + cabLength, gc)
  cabShape.lineTo(-hl + cabLength, gc + cabH * 0.85)
  cabShape.lineTo(-hl + cabLength * 0.70, gc + cabH + cabWinH * 0.96)
  cabShape.lineTo(-hl + cabLength * 0.12, gc + cabH + cabWinH * 0.96)
  cabShape.lineTo(-hl + cabLength * 0.05, gc + cabH * 0.85)
  cabShape.lineTo(-hl, gc + cabH * 0.15)
  cabShape.lineTo(-hl, gc)
  cabShape.closePath()

  const cabGeom = new THREE.ExtrudeGeometry(cabShape, {
    depth: width * 0.90,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 2,
  })
  cabGeom.translate(0, 0, -width * 0.45)
  cabGeom.computeVertexNormals()
  items.push({ geometry: cabGeom, position: [0, 0, 0] })

  // ─── 货箱（连续长方体）───
  const cargoX = -hl + cabLength + (length - cabLength - cargoLength) / 2 + cargoLength / 2
  items.push({
    geometry: new THREE.BoxGeometry(cargoLength, cargoHeight, width * 0.98),
    position: [cargoX, gc + cargoHeight / 2, 0],
    color: '#D4A574',
  })
  // 货箱顶部圆角棱 - 同色合并
  const topEdge = new THREE.Shape()
  topEdge.moveTo(cargoX + cargoLength / 2 - 0.05, gc + cargoHeight + 0.02)
  topEdge.lineTo(cargoX + cargoLength / 2 - 0.05, gc + cargoHeight + 0.10)
  topEdge.lineTo(cargoX - cargoLength / 2 + 0.05, gc + cargoHeight + 0.10)
  topEdge.lineTo(cargoX - cargoLength / 2 + 0.05, gc + cargoHeight + 0.02)
  topEdge.closePath()
  const topEdgeGeom = new THREE.ExtrudeGeometry(topEdge, {
    depth: width * 0.99,
    bevelEnabled: false,
  })
  topEdgeGeom.translate(0, 0, -width * 0.495)
  topEdgeGeom.computeVertexNormals()
  items.push({
    geometry: topEdgeGeom,
    position: [0, 0, 0],
    color: '#D4A574',
  })

  // ─── 车轮 ───
  const wheelPositions = [
    [-hl * 0.72, hw - wheelWidth / 2],
    [-hl * 0.72, -hw + wheelWidth / 2],
    [hl * 0.28, hw - wheelWidth / 2],
    [hl * 0.28, -hw + wheelWidth / 2],
    [hl * 0.55, hw - wheelWidth / 2],
    [hl * 0.55, -hw + wheelWidth / 2],
    [hl * 0.82, hw - wheelWidth / 2],
    [hl * 0.82, -hw + wheelWidth / 2],
  ]
  for (const [wx, wz] of wheelPositions) {
    const wheelGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16)
    wheelGeom.rotateX(Math.PI / 2)
    items.push({
      geometry: wheelGeom,
      position: [wx, wheelRadius, wz],
      color: '#1A1A1A',
    })
  }

  // ─── 前挡风 ───
  const windshieldShape = new THREE.Shape()
  windshieldShape.moveTo(-hl + cabLength * 0.72, gc + cabH + cabWinH * 0.10)
  windshieldShape.lineTo(-hl + cabLength * 0.72, gc + cabH + cabWinH * 0.90)
  windshieldShape.lineTo(-hl + cabLength * 0.14, gc + cabH + cabWinH * 0.90)
  windshieldShape.lineTo(-hl + cabLength * 0.14, gc + cabH + cabWinH * 0.10)
  windshieldShape.closePath()
  const windshieldGeom = new THREE.ExtrudeGeometry(windshieldShape, {
    depth: width * 0.80,
    bevelEnabled: false,
  })
  windshieldGeom.translate(0, 0, -width * 0.40)
  windshieldGeom.computeVertexNormals()
  items.push({
    geometry: windshieldGeom,
    position: [0, 0, 0],
    color: '#87CEEB',
    opacity: 0.5,
  })

  // ─── 尾灯 ───
  items.push({
    geometry: new THREE.BoxGeometry(0.05, height * 0.15, width * 0.35),
    position: [cargoX + cargoLength / 2 + 0.025, gc + cargoHeight * 0.15, 0],
    color: '#EF5350',
  })

  return mergeGeometriesByColor(items)
}


function createBusGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 10.0
  const width = p.width || 2.5
  const height = p.height || 3.2
  const wheelRadius = p.wheelRadius || 0.45
  const wheelWidth = p.wheelWidth || 0.28
  const windowCount = p.windowCount || 8

  const hl = length / 2
  const hw = width / 2
  const gc = 0.05

  // ─── 连续车身（单层巴士，前方挡风倾斜）───
  const bodyShape = new THREE.Shape()
  bodyShape.moveTo(hl, gc)
  bodyShape.lineTo(hl, gc + height * 0.92)
  bodyShape.lineTo(hl - 0.6, gc + height * 0.97)
  bodyShape.lineTo(-hl, gc + height * 0.97)
  bodyShape.lineTo(-hl, gc + height * 0.10)
  bodyShape.lineTo(-hl, gc)
  bodyShape.closePath()

  const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, {
    depth: width * 0.98,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.03,
    bevelSegments: 2,
  })
  bodyGeom.translate(0, 0, -width * 0.49)
  bodyGeom.computeVertexNormals()
  items.push({ geometry: bodyGeom, position: [0, 0, 0] })

  // ─── 白色上层车身（连续的 Extrude 覆盖）───
  const upperShape = new THREE.Shape()
  upperShape.moveTo(hl - 0.02, gc + height * 0.32)
  upperShape.lineTo(hl - 0.02, gc + height * 0.88)
  upperShape.lineTo(hl - 0.60, gc + height * 0.96)
  upperShape.lineTo(-hl + 0.02, gc + height * 0.96)
  upperShape.lineTo(-hl + 0.02, gc + height * 0.32)
  upperShape.closePath()
  const upperGeom = new THREE.ExtrudeGeometry(upperShape, {
    depth: width * 0.94,
    bevelEnabled: false,
  })
  upperGeom.translate(0, 0, -width * 0.47)
  upperGeom.computeVertexNormals()
  items.push({ geometry: upperGeom, position: [0, 0, 0], color: '#FFFFFF' })

  // ─── 连续车窗带 ───
  const winH = windowCount * (length * 0.75 / (windowCount + 1)) * 0.65
  const winStartX = -hl + 0.6
  const winEndX = hl - 0.9
  const windowBandShape = new THREE.Shape()
  windowBandShape.moveTo(winEndX, gc + height * 0.38)
  windowBandShape.lineTo(winEndX, gc + height * 0.78)
  windowBandShape.lineTo(winStartX, gc + height * 0.78)
  windowBandShape.lineTo(winStartX, gc + height * 0.38)
  windowBandShape.closePath()
  const windowBandGeom = new THREE.ExtrudeGeometry(windowBandShape, {
    depth: width * 0.02,
    bevelEnabled: false,
  })
  windowBandGeom.translate(0, 0, -width * 0.01)
  windowBandGeom.computeVertexNormals()
  // 左侧车窗带
  items.push({
    geometry: windowBandGeom.clone(),
    position: [0, 0, 0],
    color: '#87CEEB',
    opacity: 0.5,
  })
  // 右侧车窗带（复制并翻转）
  const rightBandGeom = windowBandGeom.clone()
  items.push({
    geometry: rightBandGeom,
    position: [0, 0, -width * 0.96],
    color: '#87CEEB',
    opacity: 0.5,
  })

  // ─── 前挡风 ───
  const frontWinShape = new THREE.Shape()
  frontWinShape.moveTo(hl - 0.02, gc + height * 0.40)
  frontWinShape.lineTo(hl - 0.02, gc + height * 0.85)
  frontWinShape.lineTo(hl - 0.55, gc + height * 0.92)
  frontWinShape.lineTo(hl - 0.55, gc + height * 0.40)
  frontWinShape.closePath()
  const frontWinGeom = new THREE.ExtrudeGeometry(frontWinShape, {
    depth: width * 0.90,
    bevelEnabled: false,
  })
  frontWinGeom.translate(0, 0, -width * 0.45)
  frontWinGeom.computeVertexNormals()
  items.push({
    geometry: frontWinGeom,
    position: [0, 0, 0],
    color: '#87CEEB',
    opacity: 0.5,
  })

  // ─── 车轮 ───
  const wheelPositions = [
    [-hl * 0.75, hw - wheelWidth / 2],
    [-hl * 0.75, -hw + wheelWidth / 2],
    [hl * 0.60, hw - wheelWidth / 2],
    [hl * 0.60, -hw + wheelWidth / 2],
  ]
  for (const [wx, wz] of wheelPositions) {
    const wheelGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16)
    wheelGeom.rotateX(Math.PI / 2)
    items.push({
      geometry: wheelGeom,
      position: [wx, wheelRadius, wz],
      color: '#1A1A1A',
    })
  }

  // ─── 尾灯 ───
  items.push({
    geometry: new THREE.BoxGeometry(0.05, height * 0.25, width * 0.5),
    position: [-hl - 0.025, gc + height * 0.25, 0],
    color: '#EF5350',
  })

  return mergeGeometriesByColor(items)
}


function createCityBusGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 12.0
  const width = p.width || 2.5
  const height = p.height || 3.0
  const wheelRadius = p.wheelRadius || 0.45
  const wheelWidth = p.wheelWidth || 0.28
  const doorWidth = p.doorWidth || 1.2

  const hl = length / 2
  const hw = width / 2
  const gc = 0.05

  // ─── 连续车身轮廓 ───
  const bodyShape = new THREE.Shape()
  bodyShape.moveTo(hl, gc)
  bodyShape.lineTo(hl, gc + height * 0.94)
  bodyShape.lineTo(hl - 0.6, gc + height * 0.98)
  bodyShape.lineTo(-hl, gc + height * 0.98)
  bodyShape.lineTo(-hl, gc + height * 0.08)
  bodyShape.lineTo(-hl, gc)
  bodyShape.closePath()

  const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, {
    depth: width * 0.98,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 2,
  })
  bodyGeom.translate(0, 0, -width * 0.49)
  bodyGeom.computeVertexNormals()
  items.push({ geometry: bodyGeom, position: [0, 0, 0] })

  // ─── 白色上层车身 ───
  const upperShape = new THREE.Shape()
  upperShape.moveTo(hl - 0.02, gc + height * 0.28)
  upperShape.lineTo(hl - 0.02, gc + height * 0.91)
  upperShape.lineTo(hl - 0.60, gc + height * 0.96)
  upperShape.lineTo(-hl + 0.02, gc + height * 0.96)
  upperShape.lineTo(-hl + 0.02, gc + height * 0.28)
  upperShape.closePath()
  const upperGeom = new THREE.ExtrudeGeometry(upperShape, {
    depth: width * 0.94,
    bevelEnabled: false,
  })
  upperGeom.translate(0, 0, -width * 0.47)
  upperGeom.computeVertexNormals()
  items.push({ geometry: upperGeom, position: [0, 0, 0], color: '#FFFFFF' })

  // ─── 连续车窗带 ───
  const winStartX = -hl + 0.8 + doorWidth + 0.5
  const winEndX = hl - 1.0
  const leftWinEndX = -hl + 0.8
  const leftWinStartX = -hl + 0.2

  // 左侧车窗块
  const leftWinShape = new THREE.Shape()
  leftWinShape.moveTo(leftWinEndX, gc + height * 0.34)
  leftWinShape.lineTo(leftWinEndX, gc + height * 0.80)
  leftWinShape.lineTo(leftWinStartX, gc + height * 0.80)
  leftWinShape.lineTo(leftWinStartX, gc + height * 0.34)
  leftWinShape.closePath()
  const leftWinGeom = new THREE.ExtrudeGeometry(leftWinShape, {
    depth: width * 0.02,
    bevelEnabled: false,
  })
  leftWinGeom.translate(0, 0, -width * 0.01)
  leftWinGeom.computeVertexNormals()
  items.push({
    geometry: leftWinGeom.clone(),
    position: [0, 0, 0],
    color: '#87CEEB',
    opacity: 0.5,
  })
  items.push({
    geometry: leftWinGeom,
    position: [0, 0, -width * 0.96],
    color: '#87CEEB',
    opacity: 0.5,
  })

  // 右侧车窗块（门后）
  const rightWinShape = new THREE.Shape()
  rightWinShape.moveTo(winEndX, gc + height * 0.34)
  rightWinShape.lineTo(winEndX, gc + height * 0.80)
  rightWinShape.lineTo(winStartX, gc + height * 0.80)
  rightWinShape.lineTo(winStartX, gc + height * 0.34)
  rightWinShape.closePath()
  const rightWinGeom = new THREE.ExtrudeGeometry(rightWinShape, {
    depth: width * 0.02,
    bevelEnabled: false,
  })
  rightWinGeom.translate(0, 0, -width * 0.01)
  rightWinGeom.computeVertexNormals()
  items.push({
    geometry: rightWinGeom.clone(),
    position: [0, 0, 0],
    color: '#87CEEB',
    opacity: 0.5,
  })
  items.push({
    geometry: rightWinGeom,
    position: [0, 0, -width * 0.96],
    color: '#87CEEB',
    opacity: 0.5,
  })

  // ─── 前挡风 ───
  const frontWinShape = new THREE.Shape()
  frontWinShape.moveTo(hl - 0.02, gc + height * 0.35)
  frontWinShape.lineTo(hl - 0.02, gc + height * 0.88)
  frontWinShape.lineTo(hl - 0.55, gc + height * 0.94)
  frontWinShape.lineTo(hl - 0.55, gc + height * 0.35)
  frontWinShape.closePath()
  const frontWinGeom = new THREE.ExtrudeGeometry(frontWinShape, {
    depth: width * 0.90,
    bevelEnabled: false,
  })
  frontWinGeom.translate(0, 0, -width * 0.45)
  frontWinGeom.computeVertexNormals()
  items.push({
    geometry: frontWinGeom,
    position: [0, 0, 0],
    color: '#87CEEB',
    opacity: 0.5,
  })

  // ─── 车门 ───
  items.push({
    geometry: new THREE.BoxGeometry(doorWidth, height * 0.55, 0.05),
    position: [leftWinEndX + doorWidth / 2, gc + height * 0.28, hw * 0.98 + 0.025],
    color: '#333333',
  })

  // ─── 车轮 ───
  const wheelPositions = [
    [-hl * 0.80, hw - wheelWidth / 2],
    [-hl * 0.80, -hw + wheelWidth / 2],
    [hl * 0.35, hw - wheelWidth / 2],
    [hl * 0.35, -hw + wheelWidth / 2],
    [hl * 0.75, hw - wheelWidth / 2],
    [hl * 0.75, -hw + wheelWidth / 2],
  ]
  for (const [wx, wz] of wheelPositions) {
    const wheelGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16)
    wheelGeom.rotateX(Math.PI / 2)
    items.push({
      geometry: wheelGeom,
      position: [wx, wheelRadius, wz],
      color: '#1A1A1A',
    })
  }

  // ─── 车顶广告牌 ───
  items.push({
    geometry: new THREE.BoxGeometry(length * 0.4, 0.12, width * 0.80),
    position: [-hl * 0.5, gc + height + 0.06, 0],
    color: '#E8E8E8',
  })

  // ─── 尾灯 ───
  items.push({
    geometry: new THREE.BoxGeometry(0.05, height * 0.3, width * 0.5),
    position: [-hl - 0.025, gc + height * 0.25, 0],
    color: '#EF5350',
  })

  return mergeGeometriesByColor(items)
}


function createTrainGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 25.0
  const width = p.width || 3.0
  const height = p.height || 4.0
  const wheelRadius = p.wheelRadius || 0.5
  const wheelWidth = p.wheelWidth || 0.25
  const carriageCount = p.carriageCount || 3
  const carriageLength = p.carriageLength || 7.0
  const windowHeight = p.windowHeight || 1.2
  const windowCount = p.windowCount || 6

  const halfLength = length / 2
  const halfWidth = width / 2

  const locomotiveLength = length - carriageCount * carriageLength - (carriageCount - 1) * 0.5
  items.push({
    geometry: new THREE.BoxGeometry(locomotiveLength, height * 0.4, width),
    position: [-halfLength + locomotiveLength / 2, height * 0.2, 0],
  })

  const locomotiveCabinHeight = height * 0.45
  items.push({
    geometry: new THREE.BoxGeometry(locomotiveLength * 0.8, locomotiveCabinHeight, width * 0.8),
    position: [-halfLength + locomotiveLength / 2, height * 0.4 + locomotiveCabinHeight / 2, 0],
  })

  const chimneyHeight = height * 0.3
  items.push({
    geometry: new THREE.BoxGeometry(width * 0.3, chimneyHeight, width * 0.3),
    position: [-halfLength + locomotiveLength * 0.2, height * 0.85 + chimneyHeight / 2, 0],
    color: '#333333',
  })

  let carriageX = -halfLength + locomotiveLength + 0.5
  for (let c = 0; c < carriageCount; c++) {
    items.push({
      geometry: new THREE.BoxGeometry(carriageLength, height * 0.4, width),
      position: [carriageX + carriageLength / 2, height * 0.2, 0],
    })

    const carriageUpperHeight = height * 0.55
    items.push({
      geometry: new THREE.BoxGeometry(carriageLength * 0.95, carriageUpperHeight, width * 0.95),
      position: [carriageX + carriageLength / 2, height * 0.4 + carriageUpperHeight / 2, 0],
      color: '#FFFFFF',
    })

    const windowWidth = (carriageLength * 0.8) / (windowCount + 1)
    const windowY = height * 0.45 + windowHeight / 2
    for (let i = 0; i < windowCount; i++) {
      const windowX = carriageX + carriageLength * 0.1 + (i + 0.5) * windowWidth
      for (const sideSign of [-1, 1]) {
        items.push({
          geometry: new THREE.BoxGeometry(windowWidth * 0.85, windowHeight, 0.05),
          position: [windowX, windowY, sideSign * (halfWidth * 0.95 + 0.025)],
          color: '#87CEEB',
        })
      }
    }

    carriageX += carriageLength + 0.5
  }

  const wheelPositions = [
    [-halfLength * 0.9, halfWidth - wheelWidth / 2],
    [-halfLength * 0.9, -halfWidth + wheelWidth / 2],
    [-halfLength * 0.6, halfWidth - wheelWidth / 2],
    [-halfLength * 0.6, -halfWidth + wheelWidth / 2],
  ]

  carriageX = -halfLength + locomotiveLength + 0.5
  for (let c = 0; c < carriageCount; c++) {
    wheelPositions.push(
      [carriageX + carriageLength * 0.2, halfWidth - wheelWidth / 2],
      [carriageX + carriageLength * 0.2, -halfWidth + wheelWidth / 2],
      [carriageX + carriageLength * 0.8, halfWidth - wheelWidth / 2],
      [carriageX + carriageLength * 0.8, -halfWidth + wheelWidth / 2]
    )
    carriageX += carriageLength + 0.5
  }

  for (const [wx, wz] of wheelPositions) {
    const wheelGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16)
    wheelGeom.rotateX(Math.PI / 2)
    items.push({
      geometry: wheelGeom,
      position: [wx, wheelRadius, wz],
      color: '#1A1A1A',
    })
  }

  items.push({
    geometry: new THREE.BoxGeometry(0.8, height * 0.35, width * 0.25),
    position: [-halfLength + 0.4, height * 0.35, 0],
    color: '#E8E8E8',
  })

  return mergeGeometriesByColor(items)
}


// ─── 船体辅助：连续 V 形底船壳几何 ────────────────────────────────

function createShipHullGeometry(
  length: number,
  beam: number,
  depth: number,
  bowRatio: number,
  sternRatio: number,
  segments: number = 30,
  vertSegs: number = 2,
): THREE.BufferGeometry {
  const hl = length / 2
  const hw = beam / 2
  const cols = segments
  const rows = vertSegs
  const verts: number[] = []
  const idx: number[] = []

  // 生成网格顶点：行=垂直方向，列=长度方向
  // 每列: 0=deck左, 1=deck右, 中间行=侧边插值点, 最后=keel
  for (let i = 0; i <= cols; i++) {
    const t = i / cols
    const x = -hl + t * length

    let wf: number
    if (t < sternRatio) {
      wf = t / sternRatio
    } else if (t > 1 - bowRatio) {
      wf = (1 - t) / bowRatio
    } else {
      wf = 1
    }
    wf = Math.pow(wf, 0.6)
    const cw = hw * wf

    for (let j = 0; j <= rows; j++) {
      const vy = depth * (1 - j / rows) // deck=0*row, keel=rows
      const vzFactor = 1 - (j / rows) * 0.5 // 顶部cw, keel处收窄50%
      const vzw = cw * vzFactor
      // TL
      verts.push(x, vy, -vzw)
      // TR
      verts.push(x, vy, vzw)
    }
  }

  const stride = (rows + 1) * 2

  for (let i = 1; i <= cols; i++) {
    const a = (i - 1) * stride
    const b = i * stride

    for (let j = 0; j < rows; j++) {
      const r0 = j * 2
      const r1 = (j + 1) * 2

      // 左侧面 — 从 -Z 看（左舷朝外），逆时针绕法
      // 对角线统一: prev_top → curr_bot (左上→右下)
      idx.push(b + r0, a + r0, b + r1)        // currTL, prevTL, currBL
      idx.push(b + r1, a + r0, a + r1)        // currBL, prevTL, prevBL

      // 右侧面 — 从 +Z 看（右舷朝外），逆时针绕法
      // 对角线统一: prev_top → curr_bot (左上→右下)
      idx.push(b + r0 + 1, a + r0 + 1, b + r1 + 1)  // currTR, prevTR, currBR
      idx.push(b + r1 + 1, a + r0 + 1, a + r1 + 1)  // currBR, prevTR, prevBR
    }
  }

  // 甲板 — 从 +Y 看朝上，逆时针绕法
  for (let i = 1; i <= cols; i++) {
    const a = (i - 1) * stride
    const b = i * stride
    idx.push(a, a + 1, b)       // prevTL, prevTR, currTL
    idx.push(b + 1, a + 1, b)   // currTR, prevTR, currTL
  }

  // 艉封板 — 从 -X 看朝外，逆时针绕法
  for (let j = 0; j < rows; j++) {
    const r0 = j * 2
    const r1 = (j + 1) * 2
    idx.push(r0, r0 + 1, r1)        // TL, TR, BL
    idx.push(r0 + 1, r1 + 1, r1)    // TR, BR, BL
  }

  // 艏封板 — 从 +X 看朝外，逆时针绕法
  const last = cols * stride
  for (let j = 0; j < rows; j++) {
    const r0 = j * 2
    const r1 = (j + 1) * 2
    idx.push(last + r0, last + r0 + 1, last + r1)        // TL, TR, BL
    idx.push(last + r0 + 1, last + r1 + 1, last + r1)    // TR, BR, BL
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geom.setIndex(idx)
  geom.computeVertexNormals()
  return geom
}


// ─── 船舶类型几何生成函数 ──────────────────────────────────────────────

function createCargoShipGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 120.0
  const width = p.width || 20.0
  const height = p.height || 25.0
  const draft = p.draft || 5.0
  const holdLength = p.holdLength || 80.0
  const holdWidth = p.holdWidth || 16.0
  const holdHeight = p.holdHeight || 8.0
  const superstructureHeight = p.superstructureHeight || 12.0

  const hl = length / 2
  const hw = width / 2

  // ─── 连续 V 底船壳 ───
  const hullDepth = height * 0.45
  const hullGeom = createShipHullGeometry(length * 0.92, width, hullDepth, 0.20, 0.08, 40)
  hullGeom.translate(0, -draft, 0)
  items.push({ geometry: hullGeom, position: [0, 0, 0] })

  // ─── 甲板 ───
  const deckGeom = new THREE.BoxGeometry(length * 0.75, 0.3, width * 0.92)
  const deckY = -draft + hullDepth
  items.push({
    geometry: deckGeom,
    position: [0, deckY + 0.15, 0],
    color: '#8B4513',
  })

  // ─── 货舱 ───
  const holdX = -hl * 0.25
  items.push({
    geometry: new THREE.BoxGeometry(holdLength, holdHeight, holdWidth),
    position: [holdX, deckY + 0.3 + holdHeight / 2, 0],
    color: '#666666',
  })
  // 货舱盖
  items.push({
    geometry: new THREE.BoxGeometry(holdLength + 1, 0.3, holdWidth + 1),
    position: [holdX, deckY + 0.3 + holdHeight + 0.15, 0],
    color: '#8B4513',
  })

  // ─── 上层建筑（连续轮廓）───
  const sbLength = length * 0.15
  const sbWidth = width * 0.60
  const sbX = hl - sbLength / 2
  const sbShape = new THREE.Shape()
  sbShape.moveTo(-sbLength / 2, 0)
  sbShape.lineTo(sbLength / 2, 0)
  sbShape.lineTo(sbLength / 2, superstructureHeight)
  sbShape.lineTo(-sbLength / 2, superstructureHeight)
  sbShape.closePath()
  const sbGeom = new THREE.ExtrudeGeometry(sbShape, {
    depth: sbWidth,
    bevelEnabled: false,
  })
  sbGeom.translate(sbX, deckY + 0.3, -sbWidth / 2)
  sbGeom.computeVertexNormals()
  items.push({ geometry: sbGeom, position: [0, 0, 0] })

  // ─── 上层甲板室（白色叠层）───
  const deckH = 2.5
  for (let i = 0; i < 4; i++) {
    const dx = sbLength * 0.05 * i
    const dw = sbWidth * (1 - i * 0.03)
    const dh = deckH * 0.9
    items.push({
      geometry: new THREE.BoxGeometry(sbLength - dx * 2, dh, dw),
      position: [sbX, deckY + 0.3 + i * deckH + dh / 2, 0],
      color: '#FFFFFF',
    })
  }

  // ─── 驾驶室窗户（左侧+右侧，合并为连续带）───
  for (let i = 0; i < 4; i++) {
    const wy = deckY + 0.3 + i * deckH + deckH * 0.35
    const wLen = sbLength * 0.65
    const wGeom = new THREE.BoxGeometry(wLen, 1.2, 0.05)
    items.push({
      geometry: wGeom,
      position: [sbX, wy, sbWidth / 2 + 0.025],
      color: '#87CEEB',
      opacity: 0.5,
    })
    items.push({
      geometry: new THREE.BoxGeometry(wLen, 1.2, 0.05),
      position: [sbX, wy, -sbWidth / 2 - 0.025],
      color: '#87CEEB',
      opacity: 0.5,
    })
  }

  // ─── 烟囱 ───
  const funnelH = height * 0.25
  items.push({
    geometry: new THREE.BoxGeometry(sbWidth * 0.25, funnelH, sbWidth * 0.25),
    position: [sbX - sbLength * 0.15, deckY + 0.3 + superstructureHeight + funnelH / 2, 0],
    color: '#333333',
  })

  return mergeGeometriesByColor(items)
}


function createContainerShipGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 200.0
  const width = p.width || 30.0
  const height = p.height || 40.0
  const draft = p.draft || 8.0
  const deckLength = p.deckLength || 150.0
  const containerRows = p.containerRows || 8
  const containerStacks = p.containerStacks || 6
  const superstructureHeight = p.superstructureHeight || 15.0

  const hl = length / 2
  const hw = width / 2

  // ─── 连续 V 底船壳 ───
  const hullDepth = height * 0.40
  const hullGeom = createShipHullGeometry(length * 0.92, width, hullDepth, 0.22, 0.06, 50)
  hullGeom.translate(0, -draft, 0)
  items.push({ geometry: hullGeom, position: [0, 0, 0] })

  // ─── 甲板 ───
  const deckY = -draft + hullDepth
  items.push({
    geometry: new THREE.BoxGeometry(length * 0.80, 0.3, width * 0.88),
    position: [0, deckY + 0.15, 0],
    color: '#8B4513',
  })

  // ─── 集装箱 ───
  const cw = 2.5, cl = 6.0, ch = 2.6, gap = 0.2
  const deckStart = -deckLength / 2 + hl * 0.05
  const totalPerRow = Math.floor(deckLength / (cl + gap))

  for (let row = 0; row < containerRows; row++) {
    for (let stack = 0; stack < containerStacks; stack++) {
      for (let i = 0; i < totalPerRow; i++) {
        const x = deckStart + i * (cl + gap) + cl / 2
        const z = (row - containerRows / 2 + 0.5) * (cw + gap)
        const y = deckY + 0.3 + stack * (ch + gap) + ch / 2
        const color = (i + row + stack) % 3 === 0 ? '#C0392B'
                    : (i + row + stack) % 3 === 1 ? '#2980B9' : '#27AE60'

        items.push({
          geometry: new THREE.BoxGeometry(cl, ch, cw),
          position: [x, y, z],
          color,
        })
      }
    }
  }

  // ─── 上层建筑（连续轮廓）───
  const sbLength = length * 0.10
  const sbWidth = width * 0.50
  const sbX = hl - sbLength / 2
  const sbShape = new THREE.Shape()
  sbShape.moveTo(-sbLength / 2, 0)
  sbShape.lineTo(sbLength / 2, 0)
  sbShape.lineTo(sbLength / 2, superstructureHeight)
  sbShape.lineTo(-sbLength / 2, superstructureHeight)
  sbShape.closePath()
  const sbGeom = new THREE.ExtrudeGeometry(sbShape, {
    depth: sbWidth,
    bevelEnabled: false,
  })
  sbGeom.translate(sbX, deckY + 0.3, -sbWidth / 2)
  sbGeom.computeVertexNormals()
  items.push({ geometry: sbGeom, position: [0, 0, 0] })

  // ─── 上层白层 ───
  const dH = 2.8
  for (let i = 0; i < 5; i++) {
    items.push({
      geometry: new THREE.BoxGeometry(sbLength * 0.92, dH, sbWidth * 0.92),
      position: [sbX, deckY + 0.3 + i * dH + dH / 2, 0],
      color: '#FFFFFF',
    })
  }

  // ─── 窗户带 ───
  for (let i = 0; i < 5; i++) {
    const wy = deckY + 0.3 + i * dH + dH * 0.35
    items.push({
      geometry: new THREE.BoxGeometry(sbLength * 0.70, 1.4, 0.05),
      position: [sbX, wy, sbWidth / 2 + 0.025],
      color: '#87CEEB',
      opacity: 0.5,
    })
    items.push({
      geometry: new THREE.BoxGeometry(sbLength * 0.70, 1.4, 0.05),
      position: [sbX, wy, -sbWidth / 2 - 0.025],
      color: '#87CEEB',
      opacity: 0.5,
    })
  }

  // ─── 烟囱 ───
  const funnelH = height * 0.22
  for (let i = 0; i < 2; i++) {
    items.push({
      geometry: new THREE.BoxGeometry(sbWidth * 0.18, funnelH, sbWidth * 0.18),
      position: [sbX - sbLength * (0.2 + i * 0.35), deckY + 0.3 + superstructureHeight + funnelH / 2, 0],
      color: '#333333',
    })
  }

  return mergeGeometriesByColor(items)
}


function createCruiseShipGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 180.0
  const width = p.width || 28.0
  const height = p.height || 45.0
  const draft = p.draft || 7.0
  const deckCount = p.deckCount || 8
  const deckHeight = p.deckHeight || 2.5
  const funnelHeight = p.funnelHeight || 10.0

  const hl = length / 2
  const hw = width / 2

  // ─── 连续 V 底船壳 ───
  const hullDepth = height * 0.22
  const hullGeom = createShipHullGeometry(length * 0.90, width, hullDepth, 0.18, 0.08, 40)
  hullGeom.translate(0, -draft, 0)
  items.push({ geometry: hullGeom, position: [0, 0, 0] })

  // ─── 船壳上层 ───
  const lowerH = height * 0.13
  const lowerGeom = createShipHullGeometry(length * 0.86, width * 0.96, lowerH, 0.15, 0.05, 35)
  lowerGeom.translate(0, -draft + hullDepth, 0)
  items.push({ geometry: lowerGeom, position: [0, 0, 0] })

  // ─── 连续上层建筑（多层的 Extrude 轮廓）───
  const sbStartY = -draft + hullDepth + lowerH
  const sbWidth = width * 0.84
  const sbLength = length * 0.72
  const sbSegs = 30

  for (let i = 0; i < deckCount; i++) {
    const deckW = sbWidth * (1 - i * 0.02)
    const deckH = deckHeight * 0.95
    const xOff = (i < deckCount - 2) ? 0 : -length * 0.04
    const step = sbLength / sbSegs

    // 每层甲板 = 连续的 Extrude 侧面轮廓
    const deckShape = new THREE.Shape()
    deckShape.moveTo(-sbLength / 2, 0)
    deckShape.lineTo(sbLength / 2, 0)
    deckShape.lineTo(sbLength / 2, deckH)
    deckShape.lineTo(-sbLength / 2, deckH)
    deckShape.closePath()
    const deckGeom = new THREE.ExtrudeGeometry(deckShape, {
      depth: deckW,
      bevelEnabled: false,
    })
    deckGeom.translate(xOff, sbStartY + i * deckHeight, -deckW / 2)
    deckGeom.computeVertexNormals()
    items.push({ geometry: deckGeom, position: [0, 0, 0], color: '#FFFFFF' })
  }

  // ─── 侧面窗户带（每层连续的薄片）───
  for (let i = 0; i < deckCount; i++) {
    const deckW = sbWidth * (1 - i * 0.02)
    const xOff = (i < deckCount - 2) ? 0 : -length * 0.04
    const winY = sbStartY + i * deckHeight + deckHeight * 0.3
    const winH = 1.5
    const winLen = sbLength * 0.80

    const winShape = new THREE.Shape()
    winShape.moveTo(-winLen / 2, 0)
    winShape.lineTo(winLen / 2, 0)
    winShape.lineTo(winLen / 2, winH)
    winShape.lineTo(-winLen / 2, winH)
    winShape.closePath()
    const winGeom = new THREE.ExtrudeGeometry(winShape, {
      depth: 0.05,
      bevelEnabled: false,
    })
    winGeom.translate(xOff, winY, deckW / 2)
    winGeom.computeVertexNormals()
    items.push({
      geometry: winGeom.clone(),
      position: [0, 0, 0],
      color: '#87CEEB',
      opacity: 0.5,
    })
    const winGeom2 = winGeom.clone()
    winGeom2.translate(0, 0, -deckW - 0.05)
    items.push({
      geometry: winGeom2,
      position: [0, 0, 0],
      color: '#87CEEB',
      opacity: 0.5,
    })
  }

  // ─── 游泳池区域 ───
  const poolY = sbStartY + (deckCount - 1) * deckHeight
  const poolLength = p.poolLength || 15.0
  const poolW = poolLength * 0.5
  items.push({
    geometry: new THREE.BoxGeometry(poolLength, 1.2, poolW),
    position: [-length * 0.12, poolY + 0.6, 0],
    color: '#4A90E2',
  })
  items.push({
    geometry: new THREE.BoxGeometry(poolLength + 2.0, 0.15, poolW + 2.0),
    position: [-length * 0.12, poolY + 0.08, 0],
    color: '#F5F5F5',
  })

  // ─── 舰桥 ───
  const bridgeY = sbStartY + (deckCount - 2) * deckHeight + deckHeight / 2
  items.push({
    geometry: new THREE.BoxGeometry(width * 0.35, deckHeight * 0.8, width * 0.45),
    position: [hl * 0.75, bridgeY, 0],
    color: '#333333',
  })
  items.push({
    geometry: new THREE.BoxGeometry(width * 0.25, deckHeight * 0.55, 0.05),
    position: [hl * 0.75, bridgeY, width * 0.225 + 0.025],
    color: '#87CEEB',
    opacity: 0.5,
  })
  items.push({
    geometry: new THREE.BoxGeometry(width * 0.25, deckHeight * 0.55, 0.05),
    position: [hl * 0.75, bridgeY, -width * 0.225 - 0.025],
    color: '#87CEEB',
    opacity: 0.5,
  })

  // ─── 烟囱 ───
  for (let i = 0; i < 2; i++) {
    items.push({
      geometry: new THREE.BoxGeometry(4.0, funnelHeight, 5.0),
      position: [hl * 0.55 + i * 6.0, sbStartY + deckCount * deckHeight + funnelHeight / 2, 0],
      color: '#E74C3C',
    })
    items.push({
      geometry: new THREE.BoxGeometry(4.5, 1.5, 5.5),
      position: [hl * 0.55 + i * 6.0, sbStartY + deckCount * deckHeight + funnelHeight + 0.75, 0],
      color: '#2C3E50',
    })
  }

  return mergeGeometriesByColor(items)
}


function createPleasureBoatGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const length = p.length || 8.0
  const width = p.width || 2.5
  const height = p.height || 3.5
  const draft = p.draft || 0.5
  const cabinHeight = p.cabinHeight || 1.5

  const hl = length / 2
  const hw = width / 2

  // ─── V 底船壳 ───
  const hullDepth = height * 0.30
  const hullGeom = createShipHullGeometry(length * 0.92, width, hullDepth, 0.30, 0.10, 25)
  hullGeom.translate(0, -draft, 0)
  items.push({ geometry: hullGeom, position: [0, 0, 0] })

  const deckY = -draft + hullDepth

  // ─── 甲板 ───
  const deckGeom = new THREE.BoxGeometry(length * 0.82, 0.15, width * 0.88)
  items.push({
    geometry: deckGeom,
    position: [0, deckY + 0.075, 0],
    color: '#8B4513',
  })

  // ─── 船舱（连续轮廓）───
  const cabLen = length * 0.38
  const cabW = width * 0.78
  const cabShape = new THREE.Shape()
  cabShape.moveTo(-cabLen / 2, 0)
  cabShape.lineTo(cabLen / 2, 0)
  cabShape.lineTo(cabLen / 2, cabinHeight)
  cabShape.lineTo(-cabLen / 2, cabinHeight)
  cabShape.closePath()
  const cabGeom = new THREE.ExtrudeGeometry(cabShape, {
    depth: cabW,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.03,
    bevelSegments: 2,
  })
  cabGeom.translate(-hl * 0.28, deckY + 0.15, -cabW / 2)
  cabGeom.computeVertexNormals()
  items.push({ geometry: cabGeom, position: [0, 0, 0], color: '#FFFFFF' })

  // ─── 船舱前窗 ───
  items.push({
    geometry: new THREE.BoxGeometry(cabLen * 0.65, cabinHeight * 0.65, 0.05),
    position: [-hl * 0.28, deckY + 0.15 + cabinHeight * 0.35, cabW / 2 + 0.025],
    color: '#87CEEB',
    opacity: 0.5,
  })
  items.push({
    geometry: new THREE.BoxGeometry(cabLen * 0.65, cabinHeight * 0.65, 0.05),
    position: [-hl * 0.28, deckY + 0.15 + cabinHeight * 0.35, -cabW / 2 - 0.025],
    color: '#87CEEB',
    opacity: 0.5,
  })

  // ─── 遮阳篷 ───
  const canopyLen = cabLen * 1.15
  const canopyW = cabW * 1.15
  items.push({
    geometry: new THREE.BoxGeometry(canopyLen, 0.10, canopyW),
    position: [-hl * 0.28, deckY + 0.15 + cabinHeight + 0.05, 0],
    color: '#2E86AB',
  })

  // ─── 遮阳篷支柱 ───
  for (const sideSign of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const px = -hl * 0.50 + i * cabLen * 0.35
      items.push({
        geometry: new THREE.CylinderGeometry(0.025, 0.025, 0.6, 6),
        position: [px, deckY + 0.15 + cabinHeight + 0.3, sideSign * (canopyW / 2 - 0.08)],
        color: '#C0C0C0',
      })
    }
  }

  // ─── 长椅 ───
  for (const sideSign of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      items.push({
        geometry: new THREE.BoxGeometry(0.6, 0.5, 1.0),
        position: [hl * 0.30 - i * 1.1, deckY + 0.15 + 0.25, sideSign * 0.8],
        color: '#FFFFFF',
      })
    }
  }

  // ─── 舷外机 ───
  items.push({
    geometry: new THREE.BoxGeometry(0.4, height * 0.15, width * 0.25),
    position: [-hl + 0.2, deckY + 0.15 + height * 0.075, 0],
    color: '#333333',
  })

  // ─── 旗帜 ───
  items.push({
    geometry: new THREE.CylinderGeometry(0.02, 0.02, 2.0, 6),
    position: [hl * 0.82, deckY + 0.15 + 1.0, 0],
    color: '#FFFFFF',
  })
  items.push({
    geometry: new THREE.BoxGeometry(0.6, 0.4, 0.02),
    position: [hl * 0.82 + 0.3, deckY + 0.15 + 1.8, 0],
    color: '#E74C3C',
  })

  return mergeGeometriesByColor(items)
}


// ─── 红绿灯 ──────────────────────────────────────────────

function createTrafficLightGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const poleHeight = p.poleHeight || 3.5
  const poleRadius = p.poleRadius || 0.08
  const headWidth = p.headWidth || 0.45
  const headHeight = p.headHeight || 1.2
  const headDepth = p.headDepth || 0.2
  const lightRadius = p.lightRadius || 0.12
  const armLength = p.armLength || 2.5
  const headCount = Math.max(1, Math.min(3, p.directionCount || 1))
  const headSpacing = p.headSpacing || 0.8

  // ─── 1. 垂直立柱（方形截面更符合真实交通设施）───
  const poleSide = poleRadius * 2
  items.push({
    geometry: new THREE.BoxGeometry(poleSide, poleHeight, poleSide),
    position: [0, poleHeight / 2, 0],
    color: '#4A4A4A',
  })

  // ─── 2. 底座（略宽于立柱）───
  const baseSide = poleSide * 2.5
  const baseHeight = 0.3
  items.push({
    geometry: new THREE.BoxGeometry(baseSide, baseHeight, baseSide),
    position: [0, baseHeight / 2, 0],
    color: '#3A3A3A',
  })

  // ─── 先计算有效横杆长度（确保容纳所有灯箱）───
  // 真实结构：
  // - 所有灯箱必须完全在横杆范围内（X 从 0 到 armLength）
  // - 第一个灯箱（主灯箱）安装在横杆末端附近
  // - 其他灯箱依次向立柱方向排列

  // 计算所有灯箱和间距的总宽度
  const totalHeadWidth = headCount * headWidth + (headCount - 1) * headSpacing

  // 确保横杆长度足够容纳所有灯箱
  // 如果不够，自动延长横杆
  const minArmLength = totalHeadWidth + headWidth * 1.0  // 两端留出余量（末端0.6，立柱端0.4）
  const effectiveArmLength = Math.max(armLength, minArmLength)

  // ─── 3. 水平横杆（从立柱顶部伸出，指向道路一侧）───
  // 真实结构：横杆从立柱顶部附近伸出，末端安装灯箱
  // 横杆方向：沿X轴正方向（用户可以通过旋转整个模型来调整方向）
  const armRadius = poleRadius * 0.7
  const armY = poleHeight - 0.15  // 横杆位置略低于柱顶

  // 主横杆（使用有效长度）
  const mainArmGeom = new THREE.CylinderGeometry(armRadius, armRadius, effectiveArmLength, 8)
  mainArmGeom.rotateZ(Math.PI / 2)  // 沿X轴方向
  items.push({
    geometry: mainArmGeom,
    position: [effectiveArmLength / 2, armY, 0],
    color: '#5A5A5A',
  })

  // 横杆与立柱的连接加强件（T字形接头）
  const connectorWidth = poleSide * 1.5
  const connectorHeight = 0.2
  items.push({
    geometry: new THREE.BoxGeometry(connectorWidth, connectorHeight, connectorWidth),
    position: [0, armY, 0],
    color: '#6A6A6A',
  })

  // ─── 4. 灯箱（安装在横杆上）───
  // 位置计算：从横杆末端向立柱方向排列
  // 第一个灯箱（主灯箱）安装在横杆末端附近（X = effectiveArmLength - 余量）
  // 其他灯箱依次向立柱方向排列
  // 公式：末端位置 - 索引*(灯箱宽+间距)

  // 第一个灯箱中心X坐标（末端留出0.6倍灯箱宽的余量）
  const firstHeadCenterX = effectiveArmLength - headWidth * 0.6

  for (let headIdx = 0; headIdx < headCount; headIdx++) {
    // 从末端向立柱方向计算每个灯箱的X位置
    const headX = firstHeadCenterX - headIdx * (headWidth + headSpacing)
    const headY = armY - headHeight / 2 - 0.05

    // 灯箱主体（黑色外壳）
    items.push({
      geometry: new THREE.BoxGeometry(headWidth, headHeight, headDepth),
      position: [headX, headY, 0],
      color: '#2A2A2A',
    })

    // 灯箱边框（黑色突出边缘）
    const borderThickness = 0.02
    // 正面边框（灯珠所在面）
    items.push({
      geometry: new THREE.BoxGeometry(
        headWidth + borderThickness * 2,
        headHeight + borderThickness * 2,
        borderThickness
      ),
      position: [headX, headY, headDepth / 2 + borderThickness / 2],
      color: '#1A1A1A',
    })

    // ─── 灯珠（红黄绿三色，垂直排列）───
    // 真实结构：红灯在上，黄灯在中，绿灯在下
    const lightSpacing = headHeight / 4
    const lightYOffsets = [
      headHeight / 2 - lightSpacing,      // 红灯（顶部）
      0,                                    // 黄灯（中间）
      -headHeight / 2 + lightSpacing,      // 绿灯（底部）
    ]
    const lightColors = ['#FF0000', '#FFFF00', '#00FF00']

    for (let i = 0; i < 3; i++) {
      const lightY = headY + lightYOffsets[i]

      // 灯珠主体（圆形发光面）
      const lightGeom = new THREE.CylinderGeometry(lightRadius, lightRadius, 0.05, 16)
      lightGeom.rotateX(Math.PI / 2)  // 使圆形面向Z轴正方向
      items.push({
        geometry: lightGeom,
        position: [headX, lightY, headDepth / 2 + 0.03],
        color: lightColors[i],
        opacity: 0.95,
      })

      // 灯珠外圈（黑色灯罩）
      const hoodOuterRadius = lightRadius + 0.015
      const hoodGeom = new THREE.TorusGeometry(hoodOuterRadius, 0.015, 8, 16)
      hoodGeom.rotateX(Math.PI / 2)
      items.push({
        geometry: hoodGeom,
        position: [headX, lightY, headDepth / 2 + 0.04],
        color: '#0A0A0A',
      })

      // 灯珠内部反光（浅色圆形）
      const innerRadius = lightRadius * 0.7
      const innerGeom = new THREE.CircleGeometry(innerRadius, 16)
      innerGeom.rotateX(-Math.PI / 2)  // 面向Z轴正方向
      items.push({
        geometry: innerGeom,
        position: [headX, lightY, headDepth / 2 + 0.05],
        color: lightColors[i],
        opacity: 0.6,
      })
    }

    // ─── 灯箱与横杆的连接吊架───
    // 真实结构：从横杆向下伸出连接杆固定灯箱
    // 计算正确的连接高度：从横杆底部到灯箱顶部
    const lampTopY = headY + headHeight / 2  // 灯箱顶部Y坐标
    const hangerHeight = armY - lampTopY      // 吊架需要的高度
    const hangerWidth = headWidth * 0.5
    const hangerDepth = headDepth * 0.4
    
    // 确保吊架有最小高度
    const actualHangerHeight = Math.max(hangerHeight, 0.05)
    
    // 吊架Y位置：从横杆底部向下延伸到灯箱顶部
    const hangerCenterY = lampTopY + actualHangerHeight / 2
    
    items.push({
      geometry: new THREE.BoxGeometry(hangerWidth, actualHangerHeight, hangerDepth),
      position: [headX, hangerCenterY, 0],
      color: '#5A5A5A',
    })
    
    // 添加额外的加强连接（U型抱箍的视觉效果）
    const clampWidth = hangerWidth * 1.2
    const clampHeight = 0.06
    // 顶部抱箍（与横杆连接）
    items.push({
      geometry: new THREE.BoxGeometry(clampWidth, clampHeight, headDepth * 0.6),
      position: [headX, armY - clampHeight / 2, 0],
      color: '#4A4A4A',
    })
    // 底部抱箍（与灯箱顶部连接）
    items.push({
      geometry: new THREE.BoxGeometry(clampWidth, clampHeight, headDepth * 0.6),
      position: [headX, lampTopY + clampHeight / 2, 0],
      color: '#4A4A4A',
    })

    // ─── 倒计时显示器（可选，小矩形）───
    if (headHeight > 0.8) {
      const countDownWidth = headWidth * 0.35
      const countDownHeight = headHeight * 0.12
      items.push({
        geometry: new THREE.BoxGeometry(countDownWidth, countDownHeight, 0.04),
        position: [headX, headY - headHeight / 2 + countDownHeight / 2 + 0.03, headDepth / 2 + 0.03],
        color: '#000000',
      })
    }
  }

  // ─── 5. 立柱顶部装饰盖───
  items.push({
    geometry: new THREE.CylinderGeometry(poleRadius * 1.1, poleRadius * 0.9, 0.1, 12),
    position: [0, poleHeight + 0.05, 0],
    color: '#5A5A5A',
  })

  // ─── 6. 横杆末端装饰───
  if (armLength > 0) {
    const endCapRadius = armRadius * 1.2
    items.push({
      geometry: new THREE.SphereGeometry(endCapRadius, 8, 8),
      position: [effectiveArmLength, armY, 0],
      color: '#6A6A6A',
    })
  }

  return mergeGeometriesByColor(items)
}


// ─── 路牌 ──────────────────────────────────────────────

function createStreetSignGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const poleHeight = p.poleHeight || 2.5
  const poleRadius = p.poleRadius || 0.06
  const signWidth = p.signWidth || 1.2
  const signHeight = p.signHeight || 0.8
  const signThickness = p.signThickness || 0.05
  const signCount = Math.max(1, Math.min(4, p.signCount || 2))
  const signSpacing = p.signSpacing || 0.15
  const armLength = p.armLength || 1.5

  // ─── 1. 垂直立柱（方形截面）───
  const poleSide = poleRadius * 2
  items.push({
    geometry: new THREE.BoxGeometry(poleSide, poleHeight, poleSide),
    position: [0, poleHeight / 2, 0],
    color: '#2E7D32',
  })

  // ─── 2. 底座（略宽于立柱）───
  const baseSide = poleSide * 2.5
  const baseHeight = 0.25
  items.push({
    geometry: new THREE.BoxGeometry(baseSide, baseHeight, baseSide),
    position: [0, baseHeight / 2, 0],
    color: '#1B5E20',
  })

  // ─── 3. 水平横杆（从立柱伸出，指向道路一侧）───
  // 真实结构：横杆从立柱上部伸出，末端安装路牌
  // 横杆方向：沿X轴正方向（用户可旋转模型调整方向）
  // 路牌方向：面向Z轴正方向（来车方向）

  if (armLength > 0) {
    const armRadius = poleRadius * 0.7
    const armY = poleHeight - 0.2  // 横杆位置略低于柱顶

    // 主横杆
    const armGeom = new THREE.CylinderGeometry(armRadius, armRadius, armLength, 8)
    armGeom.rotateZ(Math.PI / 2)  // 沿X轴方向
    items.push({
      geometry: armGeom,
      position: [armLength / 2, armY, 0],
      color: '#5A5A5A',
    })

    // 横杆与立柱的连接加强件
    const connectorWidth = poleSide * 1.5
    const connectorHeight = 0.15
    items.push({
      geometry: new THREE.BoxGeometry(connectorWidth, connectorHeight, connectorWidth),
      position: [0, armY, 0],
      color: '#4A4A4A',
    })

    // ─── 4. 路牌（安装在横杆末端）───
    // 真实结构：
    // - 路牌垂直安装在横杆下方或前方
    // - 路牌面向来车方向（Z轴正方向）
    // - 多个路牌垂直堆叠（如主路牌 + 辅助路牌）
    // - 路牌平面垂直于横杆方向（即路牌宽边沿X轴，高边沿Y轴）

    const totalSignsHeight = signCount * signHeight + (signCount - 1) * signSpacing
    const startY = armY - signHeight / 2 - 0.05  // 从横杆下方开始

    // 调整Y位置使整个路牌组居中
    const adjustedStartY = startY - (totalSignsHeight - signHeight) / 2

    for (let i = 0; i < signCount; i++) {
      const signY = adjustedStartY + i * (signHeight + signSpacing)
      const signX = armLength - poleRadius * 0.5  // 路牌位置在横杆末端

      // 路牌主体
      // 路牌平面：宽(W)沿X轴，高(H)沿Y轴，厚度(D)沿Z轴
      // 面向Z轴正方向（来车方向）
      items.push({
        geometry: new THREE.BoxGeometry(signWidth, signHeight, signThickness),
        position: [signX, signY, 0],
        color: i % 2 === 0 ? '#2E7D32' : '#1565C0',  // 绿蓝交替
      })

      // 路牌边框（正面，Z轴正方向）
      const borderThickness = 0.02
      items.push({
        geometry: new THREE.BoxGeometry(
          signWidth + borderThickness * 2,
          signHeight + borderThickness * 2,
          borderThickness
        ),
        position: [signX, signY, signThickness / 2 + borderThickness / 2],
        color: i % 2 === 0 ? '#1B5E20' : '#0D47A1',
      })

      // 背面边框
      items.push({
        geometry: new THREE.BoxGeometry(
          signWidth + borderThickness * 2,
          signHeight + borderThickness * 2,
          borderThickness
        ),
        position: [signX, signY, -signThickness / 2 - borderThickness / 2],
        color: i % 2 === 0 ? '#1B5E20' : '#0D47A1',
      })

      // 文字区域（正面，白色背景）
      const textAreaWidth = signWidth * 0.9
      const textAreaHeight = signHeight * 0.8
      items.push({
        geometry: new THREE.BoxGeometry(textAreaWidth, textAreaHeight, 0.01),
        position: [signX, signY, signThickness / 2 + 0.015],
        color: '#FFFFFF',
        opacity: 0.95,
      })

      // ─── 路牌固定件（U型抱箍）───
      // 真实结构：用金属抱箍将路牌固定在横杆上
      const clampWidth = signWidth * 0.15
      const clampHeight = signHeight * 0.25
      const clampDepth = poleRadius * 2 + 0.1

      // 上抱箍
      items.push({
        geometry: new THREE.BoxGeometry(clampWidth, clampHeight, clampDepth),
        position: [signX - signWidth / 2 + clampWidth / 2, signY + signHeight / 4, 0],
        color: '#4A4A4A',
      })

      // 下抱箍
      items.push({
        geometry: new THREE.BoxGeometry(clampWidth, clampHeight, clampDepth),
        position: [signX - signWidth / 2 + clampWidth / 2, signY - signHeight / 4, 0],
        color: '#4A4A4A',
      })

      // ─── 反光条（可选，路牌边缘）───
      if (signWidth > 0.8) {
        const reflectorWidth = 0.04
        // 上边缘反光条
        items.push({
          geometry: new THREE.BoxGeometry(signWidth * 0.9, reflectorWidth, 0.015),
          position: [signX, signY + signHeight / 2 - reflectorWidth / 2 - 0.02, signThickness / 2 + 0.02],
          color: '#FFD700',
          opacity: 0.8,
        })
        // 下边缘反光条
        items.push({
          geometry: new THREE.BoxGeometry(signWidth * 0.9, reflectorWidth, 0.015),
          position: [signX, signY - signHeight / 2 + reflectorWidth / 2 + 0.02, signThickness / 2 + 0.02],
          color: '#FFD700',
          opacity: 0.8,
        })
      }
    }

    // ─── 横杆末端装饰───
    const endCapRadius = armRadius * 1.2
    items.push({
      geometry: new THREE.SphereGeometry(endCapRadius, 8, 8),
      position: [armLength, armY, 0],
      color: '#5A5A5A',
    })
  }

  // ─── 5. 立柱顶部装饰───
  items.push({
    geometry: new THREE.CylinderGeometry(poleRadius * 1.1, poleRadius * 0.9, 0.1, 10),
    position: [0, poleHeight + 0.05, 0],
    color: '#388E3C',
  })

  return mergeGeometriesByColor(items)
}


// ─── 路灯 ──────────────────────────────────────────────

function createStreetLampGeometries(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  const poleHeight = p.poleHeight || 6.0
  const poleRadius = p.poleRadius || 0.08
  const armLength = p.armLength || 1.5
  const armHeightOffset = p.armHeightOffset || 0.5
  const lampWidth = p.lampWidth || 0.8
  const lampHeight = p.lampHeight || 0.3
  const lampDepth = p.lampDepth || 0.5

  const poleSegments = 16

  // ─── 1. 垂直立柱（锥形，上窄下宽）───
  // 真实结构：路灯立柱通常是锥形，底部宽顶部窄
  const bottomRadius = poleRadius
  const topRadius = poleRadius * 0.7
  const poleGeom = new THREE.CylinderGeometry(
    topRadius,
    bottomRadius,
    poleHeight,
    poleSegments
  )
  items.push({
    geometry: poleGeom,
    position: [0, poleHeight / 2, 0],
    color: '#607D8B',
  })

  // ─── 2. 底座（多层结构）───
  // 真实结构：底座通常有多层，从地面到立柱逐渐收窄
  const baseLayer1Height = 0.15
  const baseLayer1Radius = bottomRadius * 3.5
  items.push({
    geometry: new THREE.CylinderGeometry(baseLayer1Radius, baseLayer1Radius * 1.1, baseLayer1Height, poleSegments),
    position: [0, baseLayer1Height / 2, 0],
    color: '#37474F',
  })

  const baseLayer2Height = 0.25
  const baseLayer2Radius = bottomRadius * 2.5
  items.push({
    geometry: new THREE.CylinderGeometry(baseLayer2Radius, baseLayer2Radius * 1.05, baseLayer2Height, poleSegments),
    position: [0, baseLayer1Height + baseLayer2Height / 2, 0],
    color: '#455A64',
  })

  // 底座顶部装饰环
  items.push({
    geometry: new THREE.TorusGeometry(baseLayer2Radius * 0.95, 0.04, 8, poleSegments),
    position: [0, baseLayer1Height + baseLayer2Height, 0],
    color: '#263238',
  })

  // ─── 3. 水平悬臂（从立柱顶部伸出，指向道路一侧）───
  // 真实结构：
  // - 悬臂从立柱上部伸出，沿X轴正方向
  // - 悬臂可以是轻微向上倾斜的（符合美学设计）
  // - 悬臂末端安装灯头
  // - 灯头向下照射路面

  const armRadius = topRadius * 0.8
  const armY = poleHeight - armHeightOffset  // 悬臂位置略低于柱顶

  if (armLength > 0) {
    // 主悬臂（轻微向上倾斜）
    // 真实结构：悬臂可能稍微向上翘起，末端略高
    const armTiltAngle = 0.05  // 轻微向上倾斜角度（弧度）
    const armGeom = new THREE.CylinderGeometry(armRadius * 0.9, armRadius, armLength, 12)

    // 旋转悬臂使其沿X轴方向，并稍微向上倾斜
    const armMatrix = new THREE.Matrix4()
      .makeRotationZ(Math.PI / 2 - armTiltAngle)  // 沿X轴方向，轻微向上
    armGeom.applyMatrix4(armMatrix)

    items.push({
      geometry: armGeom,
      position: [armLength / 2, armY + Math.sin(armTiltAngle) * armLength / 2, 0],
      color: '#546E7A',
    })

    // 悬臂与立柱的连接加强件（T字形接头）
    const connectorWidth = bottomRadius * 2.5
    const connectorHeight = 0.18
    items.push({
      geometry: new THREE.BoxGeometry(connectorWidth, connectorHeight, connectorWidth),
      position: [0, armY, 0],
      color: '#455A64',
    })

    // 斜撑（如果悬臂较长，增加斜撑增强结构）
    if (armLength > 1.0) {
      const braceLength = Math.sqrt(armLength * armLength * 0.5 + armHeightOffset * armHeightOffset)
      const braceAngle = Math.atan2(armHeightOffset, armLength * 0.5)
      const braceRadius = armRadius * 0.5

      const braceGeom = new THREE.CylinderGeometry(braceRadius, braceRadius, braceLength, 8)
      const braceMatrix = new THREE.Matrix4()
        .makeRotationZ(Math.PI / 2 + braceAngle)
      braceGeom.applyMatrix4(braceMatrix)

      items.push({
        geometry: braceGeom,
        position: [armLength * 0.35, armY - armHeightOffset / 2, 0],
        color: '#455A64',
      })
    }

    // ─── 4. 灯头（安装在悬臂末端，向下照射）───
    // 真实结构：
    // - 灯头悬挂在悬臂下方
    // - 灯头主体是流线型或矩形
    // - 底部有透明灯罩和发光面板
    // - 灯头通过连接杆与悬臂连接

    const lampX = armLength
    const lampY = armY - lampHeight / 2 - 0.15  // 灯头悬挂在悬臂下方

    // ─── 灯头连接杆（从悬臂向下连接灯头）───
    const connectorPoleLength = 0.25
    const connectorPoleRadius = armRadius * 0.6
    items.push({
      geometry: new THREE.CylinderGeometry(connectorPoleRadius, connectorPoleRadius, connectorPoleLength, 8),
      position: [lampX, armY - connectorPoleLength / 2, 0],
      color: '#455A64',
    })

    // ─── 灯头主体（流线型设计）───
    // 真实结构：灯头通常是上窄下宽的流线型，或者是矩形
    // 这里采用现代路灯设计：矩形主体 + 底部发光面板

    // 灯头上部（略窄）
    const lampTopWidth = lampWidth * 0.85
    const lampTopDepth = lampDepth * 0.85
    const lampTopHeight = lampHeight * 0.6
    items.push({
      geometry: new THREE.BoxGeometry(lampTopWidth, lampTopHeight, lampTopDepth),
      position: [lampX, lampY + lampHeight * 0.2, 0],
      color: '#37474F',
    })

    // 灯头下部（略宽，发光部分）
    const lampBottomWidth = lampWidth
    const lampBottomDepth = lampDepth
    const lampBottomHeight = lampHeight * 0.45
    items.push({
      geometry: new THREE.BoxGeometry(lampBottomWidth, lampBottomHeight, lampBottomDepth),
      position: [lampX, lampY - lampHeight * 0.275, 0],
      color: '#263238',
    })

    // ─── 发光面板（底部，向下照射）───
    const lightPanelWidth = lampBottomWidth * 0.92
    const lightPanelDepth = lampBottomDepth * 0.92
    const lightPanelThickness = 0.04

    // 主发光面板（磨砂质感）
    items.push({
      geometry: new THREE.BoxGeometry(lightPanelWidth, lightPanelThickness, lightPanelDepth),
      position: [lampX, lampY - lampHeight * 0.275 - lampBottomHeight / 2 - lightPanelThickness / 2, 0],
      color: '#FFFFCC',
      opacity: 0.9,
    })

    // 发光面板边框
    const frameThickness = 0.03
    items.push({
      geometry: new THREE.BoxGeometry(
        lampBottomWidth + frameThickness * 2,
        frameThickness,
        lampBottomDepth + frameThickness * 2
      ),
      position: [
        lampX,
        lampY - lampHeight * 0.275 - lampBottomHeight / 2 - frameThickness / 2,
        0
      ],
      color: '#1A1A1A',
    })

    // ─── 灯头内部反光板（顶部，增强向下反射）───
    const reflectorWidth = lightPanelWidth * 0.8
    const reflectorDepth = lightPanelDepth * 0.8
    items.push({
      geometry: new THREE.BoxGeometry(reflectorWidth, 0.02, reflectorDepth),
      position: [lampX, lampY - lampHeight * 0.275 + lampBottomHeight / 2 - 0.03, 0],
      color: '#E0E0E0',
    })

    // ─── 灯头散热格栅（顶部，模拟真实设计）───
    if (lampWidth > 0.5) {
      const finCount = 5
      const finWidth = lampTopWidth * 0.12
      const finHeight = 0.08
      const finDepth = lampTopDepth * 0.9
      const finSpacing = lampTopWidth / (finCount + 1)

      for (let fi = 1; fi <= finCount; fi++) {
        const finX = lampX - lampTopWidth / 2 + fi * finSpacing
        items.push({
          geometry: new THREE.BoxGeometry(finWidth, finHeight, finDepth),
          position: [finX, lampY + lampHeight * 0.2 + lampTopHeight / 2 + finHeight / 2, 0],
          color: '#455A64',
        })
      }
    }
  }

  // ─── 5. 立柱装饰环───
  const ringCount = 3
  const ringSpacing = poleHeight / (ringCount + 1)
  for (let ri = 1; ri <= ringCount; ri++) {
    const ringY = ri * ringSpacing
    // 根据高度计算半径（因为立柱是锥形）
    const ringRadius = bottomRadius - (bottomRadius - topRadius) * (ringY / poleHeight)
    items.push({
      geometry: new THREE.TorusGeometry(ringRadius * 1.05, 0.025, 8, poleSegments),
      position: [0, ringY, 0],
      color: '#455A64',
    })
  }

  // ─── 6. 立柱顶部装饰盖───
  items.push({
    geometry: new THREE.CylinderGeometry(topRadius * 1.2, topRadius * 0.8, 0.12, poleSegments),
    position: [0, poleHeight + 0.06, 0],
    color: '#546E7A',
  })

  // ─── 7. 无悬臂模式（灯头直接装在柱顶）───
  if (armLength <= 0) {
    const topLampRadius = 0.35
    const topLampHeight = 0.45

    // 柱顶灯主体
    items.push({
      geometry: new THREE.CylinderGeometry(topLampRadius * 0.9, topLampRadius, topLampHeight, 16),
      position: [0, poleHeight + topLampHeight / 2, 0],
      color: '#37474F',
    })

    // 柱顶灯装饰顶
    items.push({
      geometry: new THREE.ConeGeometry(topLampRadius * 0.95, 0.15, 16),
      position: [0, poleHeight + topLampHeight + 0.075, 0],
      color: '#455A64',
    })

    // 发光面板（底部环形）
    const lightRingOuter = topLampRadius * 0.9
    const lightRingInner = topLampRadius * 0.5

    // 用多个小矩形模拟环形发光
    const lightSegCount = 24
    for (let si = 0; si < lightSegCount; si++) {
      const angle = (si / lightSegCount) * Math.PI * 2
      const avgRadius = (lightRingOuter + lightRingInner) / 2
      const segWidth = (lightRingOuter - lightRingInner) * 0.9
      const segLength = (Math.PI * 2 * avgRadius) / lightSegCount * 0.85

      const segGeom = new THREE.BoxGeometry(segWidth, 0.04, segLength)
      const segMatrix = new THREE.Matrix4()
        .makeRotationY(angle)
        .multiply(new THREE.Matrix4().makeTranslation(avgRadius, 0, 0))
      segGeom.applyMatrix4(segMatrix)

      items.push({
        geometry: segGeom,
        position: [0, poleHeight - 0.02, 0],
        color: '#FFFFCC',
        opacity: 0.9,
      })
    }
  }

  return mergeGeometriesByColor(items)
}
