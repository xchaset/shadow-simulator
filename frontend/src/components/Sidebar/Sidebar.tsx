import { useState } from 'react'
import { BuildingList } from './BuildingList'
import { BuildingEditor } from './BuildingEditor'
import { Button } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <div style={{
        width: 32,
        background: '#fff',
        borderLeft: '1px solid #e8e8e8',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 8,
      }}>
        <Button
          type="text"
          size="small"
          icon={<LeftOutlined />}
          onClick={() => setCollapsed(false)}
        />
      </div>
    )
  }

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
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>🏗️ 建筑列表</span>
        <Button
          type="text"
          size="small"
          icon={<RightOutlined />}
          onClick={() => setCollapsed(true)}
        />
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
        <div style={{ overflow: 'auto', maxHeight: 400 }}>
          <BuildingEditor />
        </div>
      </div>
    </div>
  )
}
