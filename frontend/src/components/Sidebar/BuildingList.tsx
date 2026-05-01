import { useState, useRef, useEffect } from 'react'
import { Button, Input } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import { BUILDING_PRESETS } from '../../utils/buildings'
import { BuildingIcon } from '../BuildingIcon'

interface Props {
  editingId: string | null
  onEdit: (id: string) => void
}

export function BuildingList({ editingId, onEdit }: Props) {
  const buildings = useStore(s => s.buildings)
  const selectedId = useStore(s => s.selectedBuildingId)
  const selectBuilding = useStore(s => s.selectBuilding)
  const renameBuilding = useStore(s => s.renameBuilding)
  
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const inputRef = useRef<any>(null)

  // 自动聚焦输入框
  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [renamingId])

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
  }

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      renameBuilding(renamingId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRename()
    } else if (e.key === 'Escape') {
      cancelRename()
    }
  }

  if (buildings.length === 0) {
    return <div style={{ padding: 16, color: '#999', fontSize: 13 }}>点击工具栏添加建筑物</div>
  }

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      {buildings.map(b => (
        <div
          key={b.id}
          onClick={() => selectBuilding(b.id)}
          onDoubleClick={() => startRename(b.id, b.name)}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: selectedId === b.id ? '#e6f4ff' : 'transparent',
            borderLeft: selectedId === b.id ? '3px solid #1677ff' : '3px solid transparent',
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 2, background: b.color, flexShrink: 0 }} />
          <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
            <BuildingIcon name={BUILDING_PRESETS[b.type]?.icon} /> 
            {renamingId === b.id ? (
              <Input
                ref={inputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleKeyDown}
                size="small"
                style={{ width: '100%' }}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              />
            ) : (
              b.name
            )}
          </span>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            style={{
              flexShrink: 0,
              color: editingId === b.id ? '#1677ff' : '#bbb',
            }}
            onClick={(e) => {
              e.stopPropagation()
              onEdit(b.id)
            }}
          />
        </div>
      ))}
    </div>
  )
}
