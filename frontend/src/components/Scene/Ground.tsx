import { useStore } from '../../store/useStore'

interface GroundProps {
  onClick?: () => void
}

export function Ground({ onClick }: GroundProps) {
  const showGrid = useStore(s => s.showGrid)

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        position={[0, 0, 0]}
        onClick={onClick}
      >
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {showGrid && (
        <gridHelper args={[500, 50, '#cccccc', '#dddddd']} position={[0, 0.01, 0]} />
      )}
    </group>
  )
}
