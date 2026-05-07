import { useEffect, useCallback } from 'react'
import { Button, Slider, Radio, Space, Tooltip, Divider, Switch, InputNumber, Select } from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  UndoOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LineChartOutlined,
  FunctionOutlined,
  EnvironmentOutlined,
  RiseOutlined,
  CarOutlined,
} from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import type { RoadMode, RoadHeightMode, LaneLineType, RoadLaneConfig } from '../../types'

const ROAD_MODES: { mode: RoadMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'straight', icon: <LineChartOutlined />, label: '直线' },
  { mode: 'curve', icon: <FunctionOutlined />, label: '曲线' },
  { mode: 'freehand', icon: <FunctionOutlined />, label: '手绘' },
]

const HEIGHT_MODES: { mode: RoadHeightMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'follow-terrain', icon: <EnvironmentOutlined />, label: '贴合地貌' },
  { mode: 'elevated', icon: <RiseOutlined />, label: '高架' },
]

export function RoadToolbar() {
  const roadEditor = useStore(s => s.roadEditor)
  const setRoadEditor = useStore(s => s.setRoadEditor)
  const addRoadPreviewPoint = useStore(s => s.addRoadPreviewPoint)
  const completeRoad = useStore(s => s.completeRoad)
  const cancelRoadDrawing = useStore(s => s.cancelRoadDrawing)

  const handleToggle = () => {
    if (roadEditor.enabled) {
      cancelRoadDrawing()
    } else {
      setRoadEditor({ enabled: true, previewPoints: [], isDrawing: false })
    }
  }

  const handleModeChange = (mode: RoadMode) => {
    setRoadEditor({ roadMode: mode })
  }

  const handleHeightModeChange = (mode: RoadHeightMode) => {
    setRoadEditor({ roadHeightMode: mode })
  }

  const handleWidthChange = (value: number | null) => {
    if (value !== null && value > 0) {
      setRoadEditor({ roadWidth: value })
    }
  }

  const handleElevationChange = (value: number | null) => {
    if (value !== null) {
      setRoadEditor({ roadElevation: value })
    }
  }

  const handleCurveTensionChange = (value: number | null) => {
    if (value !== null) {
      setRoadEditor({ curveTension: value })
    }
  }

  const updateLaneConfig = useCallback((updates: Partial<RoadLaneConfig>) => {
    const currentLaneConfig = roadEditor.laneConfig
    setRoadEditor({
      laneConfig: {
        ...currentLaneConfig,
        ...updates,
      },
    })
  }, [roadEditor.laneConfig, setRoadEditor])

  const handleLaneCountChange = (value: number | null) => {
    if (value !== null && value >= 1 && value <= 8) {
      updateLaneConfig({ laneCount: value })
    }
  }

  const handleLaneWidthChange = (value: number | null) => {
    if (value !== null && value > 0) {
      updateLaneConfig({ laneWidth: value })
    }
  }

  const handleShowLaneLinesChange = (checked: boolean) => {
    updateLaneConfig({ showLaneLines: checked })
  }

  const handleCenterLineTypeChange = (value: LaneLineType) => {
    updateLaneConfig({ centerLineType: value })
  }

  const handleLaneDividerTypeChange = (value: LaneLineType) => {
    updateLaneConfig({ laneDividerType: value })
  }

  const handleEdgeLineTypeChange = (value: LaneLineType) => {
    updateLaneConfig({ edgeLineType: value })
  }

  const handleDashedLineLengthChange = (value: number | null) => {
    if (value !== null && value > 0) {
      updateLaneConfig({ dashedLineLength: value })
    }
  }

  const handleDashedLineGapChange = (value: number | null) => {
    if (value !== null && value > 0) {
      updateLaneConfig({ dashedLineGap: value })
    }
  }

  const handleComplete = () => {
    if (roadEditor.previewPoints.length >= 2) {
      completeRoad()
    }
  }

  const handleCancel = () => {
    cancelRoadDrawing()
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!roadEditor.enabled) return

      if (e.key === 'Enter') {
        if (roadEditor.previewPoints.length >= 2) {
          completeRoad()
        }
      }
      if (e.key === 'Escape') {
        cancelRoadDrawing()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [roadEditor.enabled, roadEditor.previewPoints.length, completeRoad, cancelRoadDrawing])

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
        <LineChartOutlined style={{ fontSize: 18, color: '#1677ff' }} />
        <span style={{ fontWeight: 600, fontSize: 14 }}>道路绘制</span>
        <Switch
          size="small"
          checked={roadEditor.enabled}
          onChange={handleToggle}
        />
        {roadEditor.enabled && (
          <span style={{ fontSize: 12, color: '#1677ff', marginLeft: 8 }}>
            按住 Alt + 点击添加路径点 | Enter 完成 | Esc 取消
          </span>
        )}
      </div>

      {roadEditor.enabled && (
        <>
          {/* 道路模式 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>道路模式</div>
            <Radio.Group
              value={roadEditor.roadMode}
              onChange={e => handleModeChange(e.target.value)}
              buttonStyle="solid"
              size="small"
            >
              {ROAD_MODES.map(({ mode, icon, label }) => (
                <Tooltip key={mode} title={label}>
                  <Radio.Button value={mode}>
                    {icon} {label}
                  </Radio.Button>
                </Tooltip>
              ))}
            </Radio.Group>
          </div>

          {/* 高度模式 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>高度模式</div>
            <Radio.Group
              value={roadEditor.roadHeightMode}
              onChange={e => handleHeightModeChange(e.target.value)}
              buttonStyle="solid"
              size="small"
            >
              {HEIGHT_MODES.map(({ mode, icon, label }) => (
                <Tooltip key={mode} title={label}>
                  <Radio.Button value={mode}>
                    {icon} {label}
                  </Radio.Button>
                </Tooltip>
              ))}
            </Radio.Group>
          </div>

          {/* 道路宽度 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#666', marginBottom: 6 }}>
              <span>道路宽度</span>
              <InputNumber
                min={2}
                max={100}
                step={0.5}
                value={roadEditor.roadWidth}
                onChange={handleWidthChange}
                style={{ width: 80 }}
                size="small"
                addonAfter="m"
              />
            </div>
            <Slider
              min={2}
              max={100}
              step={0.5}
              value={roadEditor.roadWidth}
              onChange={handleWidthChange}
              tooltip={{ formatter: v => `${v}m` }}
            />
          </div>

          {/* 高架高度 */}
          {roadEditor.roadHeightMode === 'elevated' && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#666', marginBottom: 6 }}>
                <span>高架高度</span>
                <InputNumber
                  min={0.5}
                  max={100}
                  step={0.5}
                  value={roadEditor.roadElevation}
                  onChange={handleElevationChange}
                  style={{ width: 80 }}
                  size="small"
                  addonAfter="m"
                />
              </div>
              <Slider
                min={0.5}
                max={100}
                step={0.5}
                value={roadEditor.roadElevation}
                onChange={handleElevationChange}
                tooltip={{ formatter: v => `${v}m` }}
              />
            </div>
          )}

          {/* 曲线张力 */}
          {roadEditor.roadMode === 'curve' && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#666', marginBottom: 6 }}>
                <span>曲线张力</span>
                <InputNumber
                  min={0}
                  max={1}
                  step={0.1}
                  value={roadEditor.curveTension}
                  onChange={handleCurveTensionChange}
                  style={{ width: 80 }}
                  size="small"
                />
              </div>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={roadEditor.curveTension}
                onChange={handleCurveTensionChange}
                tooltip={{ formatter: v => `${v}` }}
              />
            </div>
          )}

          {/* 车道配置 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CarOutlined style={{ fontSize: 14, color: '#1677ff' }} />
                <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>车道配置</span>
              </div>
              <Switch
                size="small"
                checked={roadEditor.laneConfig.showLaneLines}
                onChange={handleShowLaneLinesChange}
              />
            </div>

            {roadEditor.laneConfig.showLaneLines && (
              <div style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 4 }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#666', marginBottom: 4 }}>
                    <span>车道数量</span>
                    <InputNumber
                      min={1}
                      max={8}
                      step={1}
                      value={roadEditor.laneConfig.laneCount}
                      onChange={handleLaneCountChange}
                      style={{ width: 60 }}
                      size="small"
                    />
                  </div>
                  <Slider
                    min={1}
                    max={8}
                    step={1}
                    value={roadEditor.laneConfig.laneCount}
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
                      value={roadEditor.laneConfig.laneWidth}
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
                    value={roadEditor.laneConfig.laneWidth}
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
                      value={roadEditor.laneConfig.centerLineType}
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
                      value={roadEditor.laneConfig.laneDividerType}
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
                      value={roadEditor.laneConfig.edgeLineType}
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

                {(roadEditor.laneConfig.centerLineType === 'dashed' ||
                  roadEditor.laneConfig.laneDividerType === 'dashed' ||
                  roadEditor.laneConfig.edgeLineType === 'dashed') && (
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
                          value={roadEditor.laneConfig.dashedLineLength}
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
                          value={roadEditor.laneConfig.dashedLineGap}
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

          {/* 路径点信息 */}
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              已添加路径点: <strong>{roadEditor.previewPoints.length}</strong> 个
              {roadEditor.previewPoints.length >= 2 && (
                <span style={{ color: '#52c41a', marginLeft: 8 }}>
                  (按 Enter 完成绘制</span>
              )}
              {roadEditor.previewPoints.length < 2 && roadEditor.previewPoints.length > 0 && (
                <span style={{ color: '#faad14', marginLeft: 8 }}>
                  (需要至少 2 个点)</span>
              )}
            </span>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* 操作按钮 */}
          <Space wrap size="small">
            <Tooltip title="完成绘制 (Enter)">
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                disabled={roadEditor.previewPoints.length < 2}
                onClick={handleComplete}
              >
                完成
              </Button>
            </Tooltip>
            <Tooltip title="取消 (Esc)">
              <Button
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={handleCancel}
              >
                取消
              </Button>
            </Tooltip>
          </Space>
        </>
      )}

      {!roadEditor.enabled && (
        <div style={{ fontSize: 12, color: '#999' }}>
          点击开关启用道路绘制模式，自由绘制曲线道路。支持贴合地貌或高架模式，可与桥梁等模型对接。
        </div>
      )}
    </div>
  )
}
