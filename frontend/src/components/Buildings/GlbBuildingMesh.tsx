import { useRef, useCallback, useMemo, useState, useEffect } from 'react'
import * as THREE from 'three'
import { ThreeEvent } from '@react-three/fiber'
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

  // 只订阅"自己是否被选中"的布尔值
  const isSelected = useStore(s => s.selectedBuildingId === building.id)
  const isMultiSelected = useStore(s => s.selectedBuildingIds.includes(building.id))
  const isSelectedVisual = isSelected || isMultiSelected

  const selectBuilding = useStore(s => s.selectBuilding)
  const toggleBuildingSelection = useStore(s => s.toggleBuildingSelection)
  const setEditorOpen = useStore(s => s.setEditorOpen)

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

  // 缓存选中时的高亮边框几何体
  const outlineData = useMemo(() => {
    if (!scene) return []
    const data: { edges: THREE.EdgesGeometry; position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }[] = []
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        data.push({
          edges: new THREE.EdgesGeometry(mesh.geometry),
          position: mesh.position.clone(),
          rotation: mesh.rotation.clone(),
          scale: mesh.scale.clone(),
        })
      }
    })
    return data
  }, [scene])

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
        position={[building.position[0], building.baseHeight ?? 0, building.position[1]]}
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
      position={[building.position[0], building.baseHeight ?? 0, building.position[1]]}
      rotation={[0, (building.rotation * Math.PI) / 180, 0]}
      scale={[scale, scale, scale]}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <primitive object={scene} />
      {isSelectedVisual && outlineData.map((item, i) => (
        <lineSegments key={i} position={item.position} rotation={item.rotation} scale={item.scale}>
          <primitive object={item.edges} attach="geometry" />
          <lineBasicMaterial color={isMultiSelected ? "#52c41a" : "#ffffff"} linewidth={2} />
        </lineSegments>
      ))}
    </group>
  )
}
