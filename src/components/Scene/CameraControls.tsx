import { OrbitControls } from '@react-three/drei'

export function CameraControls() {
  return (
    <OrbitControls
      maxPolarAngle={Math.PI / 2 - 0.05}
      enableDamping
      dampingFactor={0.1}
      minDistance={10}
      maxDistance={300}
    />
  )
}
