import { useSunPosition } from '../../hooks/useSunPosition'

export function SunIndicator() {
  const { lightPosition, isNight } = useSunPosition()

  // Scale down the sun position for the indicator
  const scale = 0.5
  const indicatorPosition: [number, number, number] = [
    lightPosition[0] * scale,
    lightPosition[1] * scale,
    lightPosition[2] * scale,
  ]

  return (
    <mesh position={indicatorPosition}>
      <sphereGeometry args={[2, 16, 16]} />
      <meshBasicMaterial color={isNight ? '#4a5568' : '#fbbf24'} />
    </mesh>
  )
}
