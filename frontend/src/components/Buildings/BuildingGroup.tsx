import { useStore } from '../../store/useStore'
import { BuildingMesh } from './BuildingMesh'

export function BuildingGroup() {
  const buildings = useStore(s => s.buildings)
  return (
    <>
      {buildings.map(b => (
        <BuildingMesh key={b.id} building={b} />
      ))}
    </>
  )
}
