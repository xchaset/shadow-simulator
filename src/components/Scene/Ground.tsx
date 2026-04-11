export function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      <gridHelper args={[200, 40, '#cccccc', '#dddddd']} position={[0, 0.01, 0]} />
    </group>
  )
}
