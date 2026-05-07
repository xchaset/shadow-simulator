import { useEffect, useState } from 'react'
import { Button, Slider, Radio, Space, Tooltip, Divider, Switch, Collapse, ColorPicker, InputNumber } from 'antd'
import type { CollapseProps } from 'antd'
import {
  RiseOutlined,
  FallOutlined,
  ScanOutlined,
  BorderOutlined,
  UndoOutlined,
  RedoOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  FontColorsOutlined,
} from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import type { TerrainBrushMode, TerrainColorType } from '../../types'


interface TerrainToolbarProps {
  onReset: () => void
}

const BRUSH_MODES: { mode: TerrainBrushMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'raise', icon: <RiseOutlined />, label: '提升 (Q)' },
  { mode: 'lower', icon: <FallOutlined />, label: '降低 (W)' },
  { mode: 'smooth', icon: <ScanOutlined />, label: '平滑 (E)' },
  { mode: 'flatten', icon: <BorderOutlined />, label: '平整 (R)' },
  { mode: 'water', icon: <ExperimentOutlined />, label: '水笔刷 (H)' },
  { mode: 'color', icon: <FontColorsOutlined />, label: '着色 (C)' },
]

const TERRAIN_COLOR_TYPES: { type: TerrainColorType; label: string; color: string }[] = [
  { type: 0, label: '默认', color: '#8B7355' },
  { type: 1, label: '森林', color: '#228B22' },
  { type: 2, label: '雪山', color: '#F5F5F5' },
  { type: 3, label: '岩石', color: '#696969' },
  { type: 4, label: '草地', color: '#90EE90' },
]

export function TerrainToolbar({ onReset }: TerrainToolbarProps) {
  const terrainEditor = useStore(s => s.terrainEditor)
  const setTerrainEditor = useStore(s => s.setTerrainEditor)
  const terrainUndo = useStore(s => s.terrainUndo)
  const terrainRedo = useStore(s => s.terrainRedo)
  const lake = useStore(s => s.lake)
  const setLake = useStore(s => s.setLake)
  const clearLakeRegions = useStore(s => s.clearLakeRegions)

  const handleModeChange = (mode: TerrainBrushMode) => {
    setTerrainEditor({ brushMode: mode })
  }

  const handleRadiusChange = (value: number) => {
    setTerrainEditor({ brushRadius: value })
  }

  const handleStrengthChange = (value: number) => {
    setTerrainEditor({ brushStrength: value })
  }

  const handleMaxHeightChange = (value: number | null) => {
    if (value !== null && value > 0) {
      setTerrainEditor({ brushMaxHeight: value })
    }
  }

  const handleColorTypeChange = (type: TerrainColorType) => {
    setTerrainEditor({ brushColorType: type })
  }

  const DEFAULT_TERRAIN_COLOR: [number, number, number] = [139 / 255, 115 / 255, 85 / 255]

  const handleClear = () => {
    const { terrainData } = useStore.getState()
    if (!terrainData) return
    const heights = new Float32Array(terrainData.heights.length)
    const colorData = new Float32Array(terrainData.heights.length * 3)
    for (let i = 0; i < terrainData.heights.length; i++) {
      colorData[i * 3] = DEFAULT_TERRAIN_COLOR[0]
      colorData[i * 3 + 1] = DEFAULT_TERRAIN_COLOR[1]
      colorData[i * 3 + 2] = DEFAULT_TERRAIN_COLOR[2]
    }
    useStore.getState().setTerrainData({
      resolution: terrainData.resolution,
      heights,
      maxHeight: terrainData.maxHeight,
      colorData,
    })
    onReset()
  }

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
        case 'h':
          setTerrainEditor({ brushMode: 'water' })
          break
        case 'c':
          setTerrainEditor({ brushMode: 'color' })
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
        maxHeight: 350,
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <EnvironmentOutlined style={{ fontSize: 18, color: '#1677ff' }} />
        <span style={{ fontWeight: 600, fontSize: 14 }}>地貌编辑</span>
      </div>

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

      {terrainEditor.brushMode === 'color' && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>地貌类型</div>
          <Radio.Group
            value={terrainEditor.brushColorType}
            onChange={e => handleColorTypeChange(e.target.value)}
            buttonStyle="solid"
            size="small"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}
          >
            {TERRAIN_COLOR_TYPES.map(({ type, label, color }) => (
              <Tooltip key={type} title={label}>
                <Radio.Button value={type} style={{ padding: '4px 10px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      backgroundColor: color,
                      border: '1px solid #ccc',
                      marginRight: 4,
                      verticalAlign: 'middle',
                    }}
                  />
                  <span style={{ verticalAlign: 'middle' }}>{label}</span>
                </Radio.Button>
              </Tooltip>
            ))}
          </Radio.Group>
        </div>
      )}

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

      {terrainEditor.brushMode !== 'water' && terrainEditor.brushMode !== 'color' && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#666', marginBottom: 6 }}>
            <span>笔刷强度</span>
            <InputNumber
              min={0.5}
              step={0.5}
              value={terrainEditor.brushStrength}
              onChange={(value) => value !== null && handleStrengthChange(value)}
              style={{ width: 80 }}
              size="small"
            />
          </div>
          <Slider
            min={0.5}
            max={500}
            step={0.5}
            value={terrainEditor.brushStrength}
            onChange={handleStrengthChange}
          />
        </div>
      )}

      {terrainEditor.brushMode !== 'water' && terrainEditor.brushMode !== 'color' && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#666', marginBottom: 6 }}>
            <span>最大高度限制</span>
            <InputNumber
              min={10}
              step={10}
              value={terrainEditor.brushMaxHeight}
              onChange={handleMaxHeightChange}
              style={{ width: 80 }}
              size="small"
              addonAfter="m"
            />
          </div>
          <Slider
            min={10}
            max={2000}
            step={10}
            value={terrainEditor.brushMaxHeight}
            onChange={handleMaxHeightChange}
            tooltip={{ formatter: v => `${v}m` }}
          />
        </div>
      )}

      <Divider style={{ margin: '12px 0' }} />

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <ExperimentOutlined style={{ fontSize: 16, color: '#1677ff' }} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>湖泊设置</span>
          <Switch
            size="small"
            checked={lake.enabled}
            onChange={checked => setLake({ enabled: checked })}
          />
        </div>

        {lake.enabled && (
          <>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 4 }}>
                <span>水位高度</span>
                <span>{lake.waterLevel}m</span>
              </div>
              <Slider
                min={-50}
                max={10}
                value={lake.waterLevel}
                onChange={value => setLake({ waterLevel: value })}
                tooltip={{ formatter: v => `${v}m` }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>水颜色</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ColorPicker
                  value={lake.waterColor}
                  onChange={(color, hex) => setLake({ waterColor: hex })}
                  showText
                />
                <span style={{ fontSize: 12, color: '#999' }}>调整水的颜色</span>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 4 }}>
                <span>波浪高度</span>
                <span>{lake.waveHeight.toFixed(2)}</span>
              </div>
              <Slider
                min={0}
                max={2}
                step={0.05}
                value={lake.waveHeight}
                onChange={value => setLake({ waveHeight: value })}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 4 }}>
                <span>透明度</span>
                <span>{(lake.opacity * 100).toFixed(0)}%</span>
              </div>
              <Slider
                min={0.1}
                max={1}
                step={0.05}
                value={lake.opacity}
                onChange={value => setLake({ opacity: value })}
                tooltip={{ formatter: v => `${(v * 100).toFixed(0)}%` }}
              />
            </div>
          </>
        )}
      </div>

      <Divider style={{ margin: '12px 0' }} />

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
