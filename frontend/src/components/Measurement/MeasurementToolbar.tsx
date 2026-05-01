import { useEffect } from 'react'
import { Button, Radio, Space, Tooltip, Divider, List, Tag, Popconfirm } from 'antd'
import {
  BorderOutlined,
  BlockOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import type { MeasurementMode, MeasurementResult } from '../../types'

const MEASUREMENT_MODES: { mode: MeasurementMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'distance', icon: <BorderOutlined />, label: '距离测量' },
  { mode: 'area', icon: <BlockOutlined />, label: '面积测量' },
]

export function MeasurementToolbar() {
  const measurementTool = useStore(s => s.measurementTool)
  const setMeasurementTool = useStore(s => s.setMeasurementTool)
  const clearMeasurementPoints = useStore(s => s.clearMeasurementPoints)
  const completeMeasurement = useStore(s => s.completeMeasurement)
  const clearMeasurementResults = useStore(s => s.clearMeasurementResults)

  const handleModeChange = (mode: MeasurementMode) => {
    clearMeasurementPoints()
    setMeasurementTool({ mode })
  }

  const handleComplete = () => {
    completeMeasurement()
  }

  const handleCancel = () => {
    clearMeasurementPoints()
  }

  const handleCloseTool = () => {
    clearMeasurementPoints()
    setMeasurementTool({ enabled: false })
  }

  const formatResult = (result: MeasurementResult) => {
    if (result.mode === 'distance' && result.distance !== undefined) {
      return `距离: ${result.distance.toFixed(2)} 米`
    }
    if (result.mode === 'area' && result.area !== undefined) {
      return `面积: ${result.area.toFixed(2)} 平方米`
    }
    return '无效测量'
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!measurementTool.enabled) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key.toLowerCase()) {
        case 'd':
          handleModeChange('distance')
          break
        case 'a':
          handleModeChange('area')
          break
        case 'enter':
          e.preventDefault()
          handleComplete()
          break
        case 'escape':
          e.preventDefault()
          handleCancel()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [measurementTool.enabled, clearMeasurementPoints, setMeasurementTool, completeMeasurement])

  const points = measurementTool.points
  const canComplete = points.length >= 2
  const minPointsRequired = measurementTool.mode === 'area' ? 3 : 2

  return (
    <div
      style={{
        background: '#fff',
        borderTop: '1px solid #e8e8e8',
        padding: '12px 16px',
        maxHeight: 400,
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BorderOutlined style={{ fontSize: 18, color: '#1677ff' }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>测量工具</span>
        </div>
        <Button size="small" icon={<CloseOutlined />} onClick={handleCloseTool}>
          关闭
        </Button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>测量模式</div>
        <Radio.Group
          value={measurementTool.mode}
          onChange={e => handleModeChange(e.target.value)}
          buttonStyle="solid"
          size="small"
          style={{ display: 'flex', gap: 4 }}
        >
          {MEASUREMENT_MODES.map(({ mode, icon, label }) => (
            <Tooltip key={mode} title={label}>
              <Radio.Button value={mode} style={{ padding: '4px 10px' }}>
                {icon}
              </Radio.Button>
            </Tooltip>
          ))}
        </Radio.Group>
      </div>

      {points.length > 0 && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 6 }}>
              <span>已选点 ({points.length}/{minPointsRequired}+)</span>
            </div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
              {measurementTool.mode === 'distance'
                ? 'Alt+左键点击场景添加测量点，至少需要 2 个点'
                : 'Alt+左键点击场景添加测量点，至少需要 3 个点形成闭合区域'}
            </div>
            <Space wrap size="small">
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                disabled={!canComplete}
                onClick={handleComplete}
              >
                完成测量
              </Button>
              <Button size="small" icon={<CloseOutlined />} onClick={handleCancel}>
                取消
              </Button>
            </Space>
          </div>
        </>
      )}

      {measurementTool.results.length > 0 && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#666' }}>历史测量</span>
              <Popconfirm title="确定要清除所有测量记录吗？" onConfirm={clearMeasurementResults}>
                <Button size="small" danger icon={<DeleteOutlined />}>
                  清除
                </Button>
              </Popconfirm>
            </div>
            <List
              size="small"
              dataSource={measurementTool.results}
              renderItem={item => (
                <List.Item>
                  <Space>
                    <Tag color={item.mode === 'distance' ? 'blue' : 'green'}>
                      {item.mode === 'distance' ? '距离' : '面积'}
                    </Tag>
                    <span style={{ fontSize: 13 }}>{formatResult(item)}</span>
                    <span style={{ fontSize: 11, color: '#999' }}>
                      {item.createdAt.toLocaleTimeString()}
                    </span>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        </>
      )}

      <Divider style={{ margin: '8px 0' }} />
      <div style={{ fontSize: 12, color: '#999' }}>
        <div>操作说明:</div>
        <div>• Alt+左键: 在场景中添加测量点</div>
        <div>• D: 距离测量模式</div>
        <div>• A: 面积测量模式</div>
        <div>• Enter: 完成测量</div>
        <div>• Esc: 取消当前测量</div>
      </div>
    </div>
  )
}
