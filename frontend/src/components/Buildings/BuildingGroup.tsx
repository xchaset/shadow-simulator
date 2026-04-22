import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { BuildingMesh } from './BuildingMesh'
import { GlbBuildingMesh } from './GlbBuildingMesh'

export function BuildingGroup() {
  const buildings = useStore(s => s.buildings)
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<string[]>([])

  // DEBUG: 检查 useStore 状态
  useEffect(() => {
    console.log('[BuildingGroup] useStore.getState().selectedBuildingIds:', useStore.getState().selectedBuildingIds)
    const unsub = useStore.subscribe((state) => {
      console.log('[BuildingGroup] subscribe callback, new selectedBuildingIds:', state.selectedBuildingIds)
      setSelectedBuildingIds(state.selectedBuildingIds)
    })
    // 初始化
    setSelectedBuildingIds(useStore.getState().selectedBuildingIds)
    return unsub
  }, [])

  console.log('[BuildingGroup] selectedBuildingIds:', selectedBuildingIds)
  return (
    <>
      {buildings.map(b =>
        b.type === 'glb'
          ? <GlbBuildingMesh key={b.id} building={b} />
          : <BuildingMesh key={b.id} building={b} />,
      )}
    </>
  )
}
