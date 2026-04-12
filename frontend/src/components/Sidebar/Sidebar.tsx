import { useState } from 'react'
import { BuildingList } from './BuildingList'
import { BuildingEditor } from './BuildingEditor'
import { Button } from 'antd'
import { LeftOutlined, RightOutlined, UnorderedListOutlined, SettingOutlined, CloseOutlined } from '@ant-design/icons'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

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
        flexShrink: 0,
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
      flexShrink: 0,
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
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <UnorderedListOutlined /> 建筑列表
        </span>
        <Button
          type="text"
          size="small"
          icon={<RightOutlined />}
          onClick={() => setCollapsed(true)}
        />
      </div>
      <BuildingList
        editingId={editingId}
        onEdit={(id) => setEditingId(editingId === id ? null : id)}
      />
      {editingId && (
        <div style={{ borderTop: '1px solid #e8e8e8' }}>
          <div style={{
            padding: '8px 12px',
            fontWeight: 600,
            fontSize: 14,
            borderBottom: '1px solid #e8e8e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <SettingOutlined /> 属性编辑
            </span>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setEditingId(null)}
            />
          </div>
          <div style={{ overflow: 'auto', maxHeight: 400 }}>
            <BuildingEditor editingId={editingId} />
          </div>
        </div>
      )}
    </div>
  )
}
