import { BuildingTools } from './BuildingTools'
import { CitySelector } from './CitySelector'

export function Toolbar() {
  return (
    <div style={{
      height: 48,
      padding: '0 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      background: '#fff',
      borderBottom: '1px solid #e8e8e8',
      zIndex: 10,
    }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>🏗️ 阴影模拟器</div>
      <div style={{ width: 1, height: 24, background: '#e8e8e8' }} />
      <CitySelector />
      <div style={{ width: 1, height: 24, background: '#e8e8e8' }} />
      <BuildingTools />
    </div>
  )
}
