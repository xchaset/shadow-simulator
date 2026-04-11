import { Canvas } from '@react-three/fiber'
import { Ground } from './Ground'
import { SunLight } from './SunLight'
import { SunIndicator } from './SunIndicator'
import { CameraControls } from './CameraControls'
import { useSunPosition } from '../../hooks/useSunPosition'

function SkyBackground() {
  const { isNight } = useSunPosition()

  return (
    <color attach="background" args={[isNight ? '#1a1a2e' : '#87CEEB']} />
  )
}

export function SceneCanvas() {
  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [80, 60, 80], fov: 50 }}
      >
        <SkyBackground />
        <SunLight />
        <Ground />
        <SunIndicator />
        <CameraControls />
      </Canvas>
    </div>
  )
}
