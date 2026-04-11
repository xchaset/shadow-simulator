import { useSunPosition } from '../../hooks/useSunPosition'

export function SunLight() {
  const { lightPosition, ambientIntensity, directionalIntensity } = useSunPosition()

  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        position={lightPosition}
        intensity={directionalIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-camera-near={0.5}
        shadow-camera-far={500}
        shadow-bias={-0.001}
      />
    </>
  )
}
