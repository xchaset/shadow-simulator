import { useRef, useCallback, useMemo, useState, useEffect } from 'react'
import * as THREE from 'three'
import { useLoader, ThreeEvent } from '@react-three/fiber'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { useStore } from '../../store/useStore'
import type { Building } from '../../types'

// 全局共享 Draco 解码器
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')

interface Props {
  building: Building
}

export function GlbBuildingMesh({ building }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const selectedId = useStore(s => s.selectedBuildingId)
  const selectedIds = useStore(s => s.selectedBuildingIds)
  const selectBuilding = useStore(s => s.selectBuilding)
  const toggleBuildingSelection = useStore(s => s.toggleBuildingSelection)
  const setEditorOpen = useStore(s => s.setEditorOpen)
  const isSelected = selectedId === building.id
  const isMultiSelected = selectedIds.includes(building.id)
  const isSelectedVisual = isSelected || isMultiSelected

  const [loadError, setLoadError] = useState(false)
  const [scene, setScene] = useState<THREE.Group | null>(null)

  const glbUrl = building.glbUrl || ''
  const scale = building.glbScale ?? building.params?.scale ?? 1

  // 加载 GLB 模型
  useEffect(() => {
    if (!glbUrl) {
      setLoadError(true)
      return
    }

    const loader = new GLTFLoader()
    loader.setDRACOLoader(dracoLoader)

    loader.load(
      glbUrl,
      (gltf) => {
        const model = gltf.scene.clone()

        // 启用阴影
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })

        setScene(model)
        setLoadError(false)
      },
      undefined,
      (err) => {
        console.error('GLB 加载失败:', err)
        setLoadError(true)
      },
    )
  }, [glbUrl])

  // 选中时的高亮边框
  const outlineMeshes = useMemo(() => {
    if (!isSelectedVisual || !scene) return []
    const meshes: THREE.Mesh[] = []
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshes.push(child as THREE.Mesh)
      }
    })
    return meshes
  }, [isSelectedVisual, scene])

  // 单击 → 单选；Ctrl+单击 → 切换选中
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.ctrlKey || e.metaKey) {
      toggleBuildingSelection(building.id)
    } else {
      selectBuilding(building.id)
    }
  }, [building.id, selectBuilding, toggleBuildingSelection])

  const handleDoubleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    selectBuilding(building.id)
    setEditorOpen(true)
  }, [building.id, selectBuilding, setEditorOpen])

  // 加载失败时显示占位方块
  if (loadError || !scene) {
    return (
      <group
        position={[building.position[0], 0, building.position[1]]}
        rotation={[0, (building.rotation * Math.PI) / 180, 0]}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <mesh position={[0, 5, 0]} castShadow receiveShadow>
          <boxGeometry args={[10, 10, 10]} />
          <meshStandardMaterial
            color={loadError ? '#ff6b6b' : '#aaaaaa'}
            transparent
            opacity={0.5}
            wireframe={loadError}
          />
        </mesh>
      </group>
    )
  }

  return (
    <group
      ref={groupRef}
      position={[building.position[0], 0, building.position[1]]}
      rotation={[0, (building.rotation * Math.PI) / 180, 0]}
      scale={[scale, scale, scale]}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <primitive object={scene} />
      {/* 选中高亮 */}
      {isSelectedVisual && outlineMeshes.map((mesh, i) => (
        <lineSegments key={i} position={mesh.position} rotation={mesh.rotation} scale={mesh.scale}>
          <edgesGeometry args={[mesh.geometry]} />
          <lineBasicMaterial color={isMultiSelected ? "#52c41a" : "#ffffff"} linewidth={2} />
        </lineSegments>
      ))}
    </group>
  )
}
