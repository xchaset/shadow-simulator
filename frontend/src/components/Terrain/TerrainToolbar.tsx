import { useEffect } from 'react'
import { Button, Slider, Radio, Space, Tooltip, Divider } from 'antd'
import {
  RiseOutlined,
  FallOutlined,
  ScanOutlined,
  BorderOutlined,
  UndoOutlined,
  RedoOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import type { TerrainBrushMode } from '../../types'


interface TerrainToolbarProps {
  onReset: () => void
}

const BRUSH_MODES: { mode: TerrainBrushMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'raise', icon: <RiseOutlined />, label: '提升 (Q)' },
  { mode: 'lower', icon: <FallOutlined />, label: '降低 (W)' },
  { mode: 'smooth', icon: <ScanOutlined />, label: '平滑 (E)' },
  { mode: 'flatten', icon: <BorderOutlined />, label: '平整 (R)' },
]

export function TerrainToolbar({ onReset }: TerrainToolbarProps) {
  const terrainEditor = useStore(s => s.terrainEditor)
  const setTerrainEditor = useStore(s => s.setTerrainEditor)
  const terrainUndo = useStore(s => s.terrainUndo)
  const terrainRedo = useStore(s => s.terrainRedo)

  const handleModeChange = (mode: TerrainBrushMode) => {
    setTerrainEditor({ brushMode: mode })
  }

  const handleRadiusChange = (value: number) => {
    setTerrainEditor({ brushRadius: value })
  }

  const handleStrengthChange = (value: number) => {
    setTerrainEditor({ brushStrength: value })
  }

  const handleClear = () => {
    const { terrainData } = useStore.getState()
    if (!terrainData) return
    const heights = new Float32Array(terrainData.heights.length)
    useStore.getState().setTerrainData({
      resolution: terrainData.resolution,
      heights,
      maxHeight: terrainData.maxHeight,
    })
    onReset()
  }

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key.toLowerCase()) {
        case 'q':
          setTerrainEditor({ brushMode: 'raise' })
          break
        case 'w':
          setTerrainEditor({ brushMode: 'lower' })
          break
        case 'e':
          setTerrainEditor({ brushMode: 'smooth' })
          break
        case 'r':
          setTerrainEditor({ brushMode: 'flatten' })
          break
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (e.shiftKey) terrainRedo()
            else terrainUndo()
          }
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setTerrainEditor, terrainUndo, terrainRedo])

  return (
    <div
      style={{
        background: '#fff',
        borderTop: '1px solid #e8e8e8',
        padding: '12px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <EnvironmentOutlined style={{ fontSize: 18, color: '#1677ff' }} />
        <span style={{ fontWeight: 600, fontSize: 14 }}>地貌编辑</span>
      </div>

      {/* 笔刷模式 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>笔刷模式</div>
        <Radio.Group
          value={terrainEditor.brushMode}
          onChange={e => handleModeChange(e.target.value)}
          buttonStyle="solid"
          size="small"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}
        >
          {BRUSH_MODES.map(({ mode, icon, label }) => (
            <Tooltip key={mode} title={label}>
              <Radio.Button value={mode} style={{ padding: '4px 10px' }}>
                {icon}
              </Radio.Button>
            </Tooltip>
          ))}
        </Radio.Group>
      </div>

      {/* 笔刷大小 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 6 }}>
          <span>笔刷大小</span>
          <span>{terrainEditor.brushRadius}m</span>
        </div>
        <Slider
          min={10}
          max={200}
          value={terrainEditor.brushRadius}
          onChange={handleRadiusChange}
          tooltip={{ formatter: v => `${v}m` }}
        />
      </div>

      {/* 笔刷强度 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 6 }}>
          <span>笔刷强度</span>
          <span>{terrainEditor.brushStrength.toFixed(1)}</span>
        </div>
        <Slider
          min={0.5}
          max={20}
          step={0.5}
          value={terrainEditor.brushStrength}
          onChange={handleStrengthChange}
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* 操作按钮 */}
      <Space wrap size="small">
        <Tooltip title="撤销 (Ctrl+Z)">
          <Button
            size="small"
            icon={<UndoOutlined />}
            disabled={terrainEditor.undoStack.length === 0}
            onClick={terrainUndo}
          >
            撤销
          </Button>
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Shift+Z)">
          <Button
            size="small"
            icon={<RedoOutlined />}
            disabled={terrainEditor.redoStack.length === 0}
            onClick={terrainRedo}
          >
            重做
          </Button>
        </Tooltip>
        <Tooltip title="清除地貌">
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={handleClear}
          >
            清除
          </Button>
        </Tooltip>
      </Space>
    </div>
  )
}
