import * as THREE from 'three'
import type { BuildingType } from '../../types'
import { getDefaultParams } from '../../utils/buildings'

export interface GeometryItem {
  geometry: THREE.BufferGeometry
  position: [number, number, number]
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
    default:
      return [{ geometry: new THREE.BoxGeometry(10, 30, 10), position: [0, 15, 0] }]
  }
}
