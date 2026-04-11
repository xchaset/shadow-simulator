import { BuildingList } from './BuildingList'
import { BuildingEditor } from './BuildingEditor'

export function Sidebar() {
  return (
    <div style={{
      width: 280,
      background: '#fff',
      borderLeft: '1px solid #e8e8e8',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 12px',
        fontWeight: 600,
        fontSize: 14,
        borderBottom: '1px solid #e8e8e8',
      }}>
        🏗️ 建筑列表
      </div>
      <BuildingList />
      <div style={{ borderTop: '1px solid #e8e8e8' }}>
        <div style={{
          padding: '8px 12px',
          fontWeight: 600,
          fontSize: 14,
          borderBottom: '1px solid #e8e8e8',
        }}>
          ⚙️ 属性编辑
        </div>
        <BuildingEditor />
      </div>
    </div>
  )
}
