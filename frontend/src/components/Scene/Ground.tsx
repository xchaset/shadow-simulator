import { useRef, useEffect, useMemo, useCallback } from 'react'
import { useStore } from '../../store/useStore'
import type { TerrainData } from '../../types'
import * as THREE from 'three'

interface GroundProps {
  onClick?: () => void
  terrainRef?: React.RefObject<any>
}

const TERRAIN_RESOLUTION = 128

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
      color: '#8B7355',
    })

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWaterColor = waterColorUniform

      shader.vertexShader = `
        attribute float aWaterMask;
        varying float vWaterMask;
      ` + shader.vertexShader

      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        vWaterMask = aWaterMask;`
      )

      shader.fragmentShader = `
        uniform vec3 uWaterColor;
        varying float vWaterMask;
      ` + shader.fragmentShader

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, uWaterColor, vWaterMask);`
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

  useEffect(() => {
    if (!terrainData || !hasTerrain) return
    if (terrainEditor.isDrawing) return
    const mesh = meshRef.current
    if (!mesh) return

    const geometry = mesh.geometry
    const pos = geometry.attributes.position
    const { heights, resolution, waterMask } = terrainData

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        pos.setZ(i * resolution + j, heights[i * resolution + j])
      }
    }
    pos.needsUpdate = true
    geometry.computeVertexNormals()

    updateWaterMaskAttribute(geometry, waterMask)
  }, [terrainData, hasTerrain, terrainEditor.isDrawing, updateWaterMaskAttribute])

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

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
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
