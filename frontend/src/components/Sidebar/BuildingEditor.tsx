import { useCallback, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { BUILDING_PRESETS } from '../../utils/buildings'
import { InputNumber, Slider, Button, ColorPicker, Tag, Select, Switch, Divider } from 'antd'
import { DeleteOutlined, CarOutlined } from '@ant-design/icons'
import { BuildingIcon } from '../BuildingIcon'
import type { RoadLaneConfig, LaneLineType } from '../../types'

const DEFAULT_ROAD_LANE_CONFIG: RoadLaneConfig = {
  laneCount: 2,
  laneWidth: 3.5,
  centerLineType: 'double-yellow',
  laneDividerType: 'dashed',
  edgeLineType: 'white-edge',
  dashedLineLength: 4,
  dashedLineGap: 6,
  showLaneLines: true,
}

interface Props {
  editingId: string
}

export function BuildingEditor({ editingId }: Props) {
  const buildings = useStore(s => s.buildings)
  const updateBuilding = useStore(s => s.updateBuilding)
  const removeBuilding = useStore(s => s.removeBuilding)

  const building = buildings.find(b => b.id === editingId)

  const handleRotationChange = useCallback((v: number) => {
    if (building) updateBuilding(building.id, { rotation: v })
  }, [building?.id, updateBuilding])

  const handleBaseHeightChange = useCallback((v: number | null) => {
    if (building && v !== null) updateBuilding(building.id, { baseHeight: v })
  }, [building?.id, updateBuilding])

  const handleColorChange = useCallback((_: unknown, hex: string) => {
    if (building) updateBuilding(building.id, { color: hex })
  }, [building?.id, updateBuilding])

  const handleDelete = useCallback(() => {
    if (building) removeBuilding(building.id)
  }, [building?.id, removeBuilding])

  // 获取当前道路的车道配置（如果没有则使用默认值）
  const currentLaneConfig = useMemo(() => {
    if (!building || building.type !== 'road') return null
    return building.roadLaneConfig || DEFAULT_ROAD_LANE_CONFIG
  }, [building])

  // 更新车道配置的处理函数
  const handleLaneConfigUpdate = useCallback((updates: Partial<RoadLaneConfig>) => {
    if (!building || building.type !== 'road') return

    const currentConfig = building.roadLaneConfig || DEFAULT_ROAD_LANE_CONFIG
    const newConfig = { ...currentConfig, ...updates }

    updateBuilding(building.id, {
      roadLaneConfig: newConfig,
    })
  }, [building, updateBuilding])

  const handleLaneCountChange = useCallback((value: number | null) => {
    if (value !== null && value >= 1 && value <= 8) {
      handleLaneConfigUpdate({ laneCount: value })
    }
  }, [handleLaneConfigUpdate])

  const handleLaneWidthChange = useCallback((value: number | null) => {
    if (value !== null && value > 0) {
      handleLaneConfigUpdate({ laneWidth: value })
    }
  }, [handleLaneConfigUpdate])

  const handleShowLaneLinesChange = useCallback((checked: boolean) => {
    handleLaneConfigUpdate({ showLaneLines: checked })
  }, [handleLaneConfigUpdate])

  const handleCenterLineTypeChange = useCallback((value: LaneLineType) => {
    handleLaneConfigUpdate({ centerLineType: value })
  }, [handleLaneConfigUpdate])

  const handleLaneDividerTypeChange = useCallback((value: LaneLineType) => {
    handleLaneConfigUpdate({ laneDividerType: value })
  }, [handleLaneConfigUpdate])

  const handleEdgeLineTypeChange = useCallback((value: LaneLineType) => {
    handleLaneConfigUpdate({ edgeLineType: value })
  }, [handleLaneConfigUpdate])

  const handleDashedLineLengthChange = useCallback((value: number | null) => {
    if (value !== null && value > 0) {
      handleLaneConfigUpdate({ dashedLineLength: value })
    }
  }, [handleLaneConfigUpdate])

  const handleDashedLineGapChange = useCallback((value: number | null) => {
    if (value !== null && value > 0) {
      handleLaneConfigUpdate({ dashedLineGap: value })
    }
  }, [handleLaneConfigUpdate])

  if (!building) {
    return <div style={{ padding: 16, color: '#999', fontSize: 13 }}>选择一个建筑物进行编辑</div>
  }

  const preset = BUILDING_PRESETS[building.type]
  const isGlb = building.type === 'glb'

  const handleParamChange = (key: string, value: number | null) => {
    if (value === null) return
    const updates: Partial<typeof building> = {
      params: { ...building.params, [key]: value },
    }
    // GLB 模型的 scale 参数同步到 glbScale
    if (isGlb && key === 'scale') {
      updates.glbScale = value
    }
    updateBuilding(building.id, updates)
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <BuildingIcon name={preset?.icon || 'FileOutlined'} /> {building.name}
        {isGlb && <Tag color="blue" style={{ marginLeft: 4 }}>GLB</Tag>}
      </div>

      {/* GLB 模型信息 */}
      {isGlb && building.glbUrl && (
        <div style={{
          marginBottom: 12,
          padding: 8,
          background: '#f6f8fa',
          borderRadius: 6,
          fontSize: 12,
          color: '#666',
          wordBreak: 'break-all',
        }}>
          📦 {building.glbUrl.split('/').pop()}
        </div>
      )}

      {/* Parameters */}
      {preset && Object.entries(preset.paramLabels).map(([key, label]) => (
        <div key={key} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>{label}</div>
          {isGlb && key === 'scale' ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Slider
                min={0.01}
                max={10}
                step={0.01}
                value={building.params[key] ?? 1}
                onChange={(v) => handleParamChange(key, v)}
                style={{ flex: 1 }}
              />
              <InputNumber
                size="small"
                value={building.params[key] ?? 1}
                min={0.01}
                max={100}
                step={0.1}
                onChange={(v) => handleParamChange(key, v)}
                style={{ width: 70 }}
              />
            </div>
          ) : (
            <InputNumber
              size="small"
              value={building.params[key]}
              min={1}
              onChange={(v) => handleParamChange(key, v)}
              style={{ width: '100%' }}
            />
          )}
        </div>
      ))}

      {/* Rotation */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>旋转角度: {building.rotation}°</div>
        <Slider
          min={0}
          max={360}
          value={building.rotation}
          onChange={handleRotationChange}
        />
      </div>

      {/* Base Height */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>基础高度: {building.baseHeight ?? 0}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Slider
            min={-100}
            max={200}
            step={0.5}
            value={building.baseHeight ?? 0}
            onChange={handleBaseHeightChange}
            style={{ flex: 1 }}
          />
          <InputNumber
            size="small"
            value={building.baseHeight ?? 0}
            min={-1000}
            max={1000}
            step={0.5}
            onChange={handleBaseHeightChange}
            style={{ width: 70 }}
          />
        </div>
      </div>

      {/* Color (hide for GLB since it uses its own materials) */}
      {!isGlb && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>颜色</div>
          <ColorPicker
            value={building.color}
            onChange={handleColorChange}
            size="small"
          />
        </div>
      )}

      {/* 车道配置（仅对道路类型显示） */}
      {currentLaneConfig && (
        <div style={{ marginBottom: 12 }}>
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CarOutlined style={{ fontSize: 14, color: '#1677ff' }} />
              <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>车道配置</span>
            </div>
            <Switch
              size="small"
              checked={currentLaneConfig.showLaneLines}
              onChange={handleShowLaneLinesChange}
            />
          </div>

          {currentLaneConfig.showLaneLines && (
            <div style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 4 }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#666', marginBottom: 4 }}>
                  <span>车道数量</span>
                  <InputNumber
                    min={1}
                    max={8}
                    step={1}
                    value={currentLaneConfig.laneCount}
                    onChange={handleLaneCountChange}
                    style={{ width: 60 }}
                    size="small"
                  />
                </div>
                <Slider
                  min={1}
                  max={8}
                  step={1}
                  value={currentLaneConfig.laneCount}
                  onChange={handleLaneCountChange}
                  tooltip={{ formatter: v => `${v} 车道` }}
                  style={{ marginBottom: 0 }}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#666', marginBottom: 4 }}>
                  <span>单车道宽度</span>
                  <InputNumber
                    min={2}
                    max={10}
                    step={0.5}
                    value={currentLaneConfig.laneWidth}
                    onChange={handleLaneWidthChange}
                    style={{ width: 60 }}
                    size="small"
                    addonAfter="m"
                  />
                </div>
                <Slider
                  min={2}
                  max={10}
                  step={0.5}
                  value={currentLaneConfig.laneWidth}
                  onChange={handleLaneWidthChange}
                  tooltip={{ formatter: v => `${v}m` }}
                  style={{ marginBottom: 0 }}
                />
              </div>

              <Divider style={{ margin: '8px 0' }} />

              <div style={{ marginBottom: 6, fontSize: 11, color: '#666' }}>线类型配置</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                  <span style={{ color: '#888' }}>中心线</span>
                  <Select
                    size="small"
                    value={currentLaneConfig.centerLineType}
                    onChange={handleCenterLineTypeChange}
                    style={{ width: 100 }}
                    options={[
                      { value: 'double-yellow', label: '双黄线' },
                      { value: 'solid', label: '单实线' },
                      { value: 'dashed', label: '虚线' },
                    ]}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                  <span style={{ color: '#888' }}>分隔线</span>
                  <Select
                    size="small"
                    value={currentLaneConfig.laneDividerType}
                    onChange={handleLaneDividerTypeChange}
                    style={{ width: 100 }}
                    options={[
                      { value: 'dashed', label: '虚线' },
                      { value: 'solid', label: '实线' },
                    ]}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                  <span style={{ color: '#888' }}>边线</span>
                  <Select
                    size="small"
                    value={currentLaneConfig.edgeLineType}
                    onChange={handleEdgeLineTypeChange}
                    style={{ width: 100 }}
                    options={[
                      { value: 'white-edge', label: '白实线' },
                      { value: 'solid', label: '实线' },
                      { value: 'dashed', label: '虚线' },
                    ]}
                  />
                </div>
              </div>

              {(currentLaneConfig.centerLineType === 'dashed' ||
                currentLaneConfig.laneDividerType === 'dashed' ||
                currentLaneConfig.edgeLineType === 'dashed') && (
                <>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ marginBottom: 6, fontSize: 11, color: '#666' }}>虚线参数</div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>线长</div>
                      <InputNumber
                        min={1}
                        max={10}
                        step={0.5}
                        value={currentLaneConfig.dashedLineLength}
                        onChange={handleDashedLineLengthChange}
                        style={{ width: '100%' }}
                        size="small"
                        addonAfter="m"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>间隔</div>
                      <InputNumber
                        min={1}
                        max={15}
                        step={0.5}
                        value={currentLaneConfig.dashedLineGap}
                        onChange={handleDashedLineGapChange}
                        style={{ width: '100%' }}
                        size="small"
                        addonAfter="m"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete */}
      <Button
        danger
        size="small"
        icon={<DeleteOutlined />}
        onClick={handleDelete}
        block
      >
        删除建筑
      </Button>
    </div>
  )
}
