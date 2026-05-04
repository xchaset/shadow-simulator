import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useSunPosition } from '../../hooks/useSunPosition'

export function SunLight() {
  const { gl } = useThree()
  const { lightPosition, ambientIntensity, directionalIntensity, shadowBounds } = useSunPosition()
  const lightRef = useRef<THREE.DirectionalLight>(null)

  // 设置阴影类型为 PCFSoftShadowMap，获得更柔和的阴影边缘
  useEffect(() => {
    if (gl) {
      gl.shadowMap.type = THREE.PCFSoftShadowMap
    }
  }, [gl])

  // 动态更新阴影相机边界，确保低角度太阳时阴影不被裁剪
  useEffect(() => {
    if (!lightRef.current) return

    const shadowCam = lightRef.current.shadow.camera
    shadowCam.left = -shadowBounds.size
    shadowCam.right = shadowBounds.size
    shadowCam.top = shadowBounds.size
    shadowCam.bottom = -shadowBounds.size
    shadowCam.far = shadowBounds.far
    shadowCam.updateProjectionMatrix()

    // 确保阴影相机指向场景中心
    lightRef.current.target.position.set(0, 0, 0)
    lightRef.current.target.updateMatrixWorld()
  }, [shadowBounds])

  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        ref={lightRef}
        position={lightPosition}
        intensity={directionalIntensity}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-shadowBounds.size}
        shadow-camera-right={shadowBounds.size}
        shadow-camera-top={shadowBounds.size}
        shadow-camera-bottom={-shadowBounds.size}
        shadow-camera-near={0.5}
        shadow-camera-far={shadowBounds.far}
        shadow-bias={-0.0005}
        shadow-radius={2}
      />
    </>
  )
}
