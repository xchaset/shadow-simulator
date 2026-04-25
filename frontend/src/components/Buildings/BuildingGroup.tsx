import { useStore } from '../../store/useStore'
import { BuildingMesh } from './BuildingMesh'
import { GlbBuildingMesh } from './GlbBuildingMesh'
import { RiverMesh } from './RiverMesh'

export function BuildingGroup() {
  const buildings = useStore(s => s.buildings)

  return (
    <>
      {buildings.map(b =>
        b.type === 'glb'
          ? <GlbBuildingMesh key={b.id} building={b} />
          : b.type === 'river'
            ? <RiverMesh key={b.id} building={b} />
            : <BuildingMesh key={b.id} building={b} />,
      )}
    </>
  )
}
