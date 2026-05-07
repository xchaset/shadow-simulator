import { useRef, useEffect, useMemo, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import * as THREE from 'three'

interface GroundProps {
  onClick?: () => void
  terrainRef?: React.RefObject<any>
}

const TERRAIN_RESOLUTION = 128

const DEFAULT_TERRAIN_COLOR: [number, number, number] = [139 / 255, 115 / 255, 85 / 255]

export function Ground({ onClick, terrainRef }: GroundProps) {
  const canvasSize = useStore(s => s.canvasSize)
  const showGrid = useStore(s => s.showGrid)
  const gridDivisions = useStore(s => s.gridDivisions)
  const terrainData = useStore(s => s.terrainData)
  const terrainEditor = useStore(s => s.terrainEditor)
  const lake = useStore(s => s.lake)
  const meshRef = useRef<any>(null)
  const hasTerrain = terrainData !== null
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)

  const waterColorUniform = useMemo(() => ({
    value: new THREE.Color(lake.waterColor),
  }), [])

  useEffect(() => {
    waterColorUniform.value.set(lake.waterColor)
  }, [lake.waterColor, waterColorUniform])

  const terrainMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(DEFAULT_TERRAIN_COLOR[0], DEFAULT_TERRAIN_COLOR[1], DEFAULT_TERRAIN_COLOR[2]),
    })

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWaterColor = waterColorUniform

      shader.vertexShader = `
        attribute float aWaterMask;
        attribute vec3 aTerrainColor;
        varying float vWaterMask;
        varying vec3 vTerrainColor;
      ` + shader.vertexShader

      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        vWaterMask = aWaterMask;
        vTerrainColor = aTerrainColor;`
      )

      shader.fragmentShader = `
        uniform vec3 uWaterColor;
        varying float vWaterMask;
        varying vec3 vTerrainColor;
      ` + shader.fragmentShader

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        diffuseColor.rgb = mix(vTerrainColor, uWaterColor, vWaterMask);`
      )
    }

    return material
  }, [waterColorUniform])

  const updateWaterMaskAttribute = useCallback((geometry: THREE.BufferGeometry, waterMask: Uint8Array | number[] | undefined) => {
    if (!geometry) return

    let maskAttr = geometry.getAttribute('aWaterMask') as THREE.BufferAttribute | undefined
    const vertexCount = TERRAIN_RESOLUTION * TERRAIN_RESOLUTION

    if (!maskAttr) {
      const maskData = new Float32Array(vertexCount)
      if (waterMask) {
        for (let i = 0; i < vertexCount && i < waterMask.length; i++) {
          maskData[i] = waterMask[i]
        }
      }
      geometry.setAttribute('aWaterMask', new THREE.BufferAttribute(maskData, 1))
    } else if (waterMask) {
      const maskData = maskAttr.array as Float32Array
      for (let i = 0; i < vertexCount && i < waterMask.length; i++) {
        maskData[i] = waterMask[i]
      }
      maskAttr.needsUpdate = true
    }
  }, [])

  const updateColorDataAttribute = useCallback((geometry: THREE.BufferGeometry, colorData: Float32Array | number[] | undefined) => {
    if (!geometry) return

    let colorAttr = geometry.getAttribute('aTerrainColor') as THREE.BufferAttribute | undefined
    const vertexCount = TERRAIN_RESOLUTION * TERRAIN_RESOLUTION

    if (!colorAttr) {
      const colorBuffer = new Float32Array(vertexCount * 3)
      if (colorData) {
        for (let i = 0; i < vertexCount && i * 3 < colorData.length; i++) {
          colorBuffer[i * 3] = colorData[i * 3]
          colorBuffer[i * 3 + 1] = colorData[i * 3 + 1]
          colorBuffer[i * 3 + 2] = colorData[i * 3 + 2]
        }
      } else {
        for (let i = 0; i < vertexCount; i++) {
          colorBuffer[i * 3] = DEFAULT_TERRAIN_COLOR[0]
          colorBuffer[i * 3 + 1] = DEFAULT_TERRAIN_COLOR[1]
          colorBuffer[i * 3 + 2] = DEFAULT_TERRAIN_COLOR[2]
        }
      }
      geometry.setAttribute('aTerrainColor', new THREE.BufferAttribute(colorBuffer, 3))
    } else if (colorData) {
      const colorBuffer = colorAttr.array as Float32Array
      for (let i = 0; i < vertexCount && i * 3 < colorData.length; i++) {
        colorBuffer[i * 3] = colorData[i * 3]
        colorBuffer[i * 3 + 1] = colorData[i * 3 + 1]
        colorBuffer[i * 3 + 2] = colorData[i * 3 + 2]
      }
      colorAttr.needsUpdate = true
    }
  }, [])

  useEffect(() => {
    if (!terrainData || !hasTerrain) return
    if (terrainEditor.isDrawing) return
    const mesh = meshRef.current
    if (!mesh) return

    const geometry = mesh.geometry
    const pos = geometry.attributes.position
    const { heights, resolution, waterMask, colorData } = terrainData

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        pos.setZ(i * resolution + j, heights[i * resolution + j])
      }
    }
    pos.needsUpdate = true
    geometry.computeVertexNormals()

    updateWaterMaskAttribute(geometry, waterMask)
    updateColorDataAttribute(geometry, colorData)
  }, [terrainData, hasTerrain, terrainEditor.isDrawing, updateWaterMaskAttribute, updateColorDataAttribute, canvasSize])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const geometry = mesh.geometry
    if (terrainData && terrainData.waterMask) {
      updateWaterMaskAttribute(geometry, terrainData.waterMask)
    } else {
      updateWaterMaskAttribute(geometry, undefined)
    }
  }, [updateWaterMaskAttribute])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const geometry = mesh.geometry
    if (terrainData && terrainData.colorData) {
      updateColorDataAttribute(geometry, terrainData.colorData)
    } else {
      updateColorDataAttribute(geometry, undefined)
    }
  }, [updateColorDataAttribute])

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        castShadow
        position={[0, 0, 0]}
        onClick={onClick}
      >
        <planeGeometry
          ref={terrainRef}
          args={[canvasSize, canvasSize, TERRAIN_RESOLUTION - 1, TERRAIN_RESOLUTION - 1]}
        />
        {hasTerrain ? (
          <primitive object={terrainMaterial} ref={materialRef} />
        ) : (
          <meshStandardMaterial color="#e8e8e8" />
        )}
      </mesh>
      {showGrid && !hasTerrain && (
        <gridHelper args={[canvasSize, gridDivisions, '#cccccc', '#dddddd']} position={[0, 0.01, 0]} />
      )}
    </group>
  )
}
