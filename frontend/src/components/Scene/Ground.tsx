import { useStore } from '../../store/useStore'

interface GroundProps {
  onClick?: () => void
}

export function Ground({ onClick }: GroundProps) {
  const canvasSize = useStore(s => s.canvasSize)
  const showGrid = useStore(s => s.showGrid)
  const gridDivisions = useStore(s => s.gridDivisions)

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        position={[0, 0, 0]}
        onClick={onClick}
      >
        <planeGeometry args={[canvasSize, canvasSize]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {showGrid && (
        <gridHelper args={[canvasSize, gridDivisions, '#cccccc', '#dddddd']} position={[0, 0.01, 0]} />
      )}
    </group>
  )
}
