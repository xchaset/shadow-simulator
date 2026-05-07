import { useState } from 'react'
import { Button, Tooltip, Slider, Modal, Switch } from 'antd'
import { SettingOutlined, BorderOutlined, BorderlessTableOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { useStore } from '../../store/useStore'

export function CanvasSettings() {
  const canvasSize = useStore(s => s.canvasSize)
  const showGrid = useStore(s => s.showGrid)
  const gridDivisions = useStore(s => s.gridDivisions)
  const setCanvasSize = useStore(s => s.setCanvasSize)
  const setShowGrid = useStore(s => s.setShowGrid)
  const setGridDivisions = useStore(s => s.setGridDivisions)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      {/* 网格显示/隐藏按钮 */}
      <Tooltip title={showGrid ? '隐藏网格' : '显示网格'} placement="left">
        <Button
          type="text"
          size="small"
          icon={showGrid ? <BorderlessTableOutlined /> : <BorderOutlined />}
          onClick={() => setShowGrid(!showGrid)}
          style={{
            position: 'absolute',
            right: 12,
            top: 12,
            zIndex: 10,
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(4px)',
            borderRadius: 6,
            color: showGrid ? '#1677ff' : '#999',
          }}
        />
      </Tooltip>

      {/* 画布设置按钮 */}
      <Tooltip title="画布设置" placement="left">
        <Button
          type="text"
          size="small"
          icon={<SettingOutlined />}
          onClick={() => setModalOpen(true)}
          style={{
            position: 'absolute',
            right: 12,
            top: 48,
            zIndex: 10,
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(4px)',
            borderRadius: 6,
          }}
        />
      </Tooltip>

      {/* 画布设置弹窗 */}
      <Modal
        title="画布设置"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={400}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
            画布尺寸: {canvasSize}
            <Tooltip title="调整画布大小以容纳更多建筑物" placement="top">
              <QuestionCircleOutlined style={{ fontSize: 14, color: '#999', cursor: 'help' }} />
            </Tooltip>
          </div>
          <Slider
            min={500}
            max={5000}
            step={100}
            value={canvasSize}
            onChange={setCanvasSize}
            marks={{
              500: '500',
              2000: '2000',
              3000: '3000',
              5000: '5000',
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>
            显示网格 <Switch checked={showGrid} onChange={setShowGrid} size="small" />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
            网格密度: {gridDivisions}
            <Tooltip title={`网格线数量（每格大小: ${Math.round(canvasSize / gridDivisions)} 单位）`} placement="top">
              <QuestionCircleOutlined style={{ fontSize: 14, color: '#999', cursor: 'help' }} />
            </Tooltip>
          </div>
          <Slider
            min={20}
            max={500}
            step={10}
            value={gridDivisions}
            onChange={setGridDivisions}
            disabled={!showGrid}
            marks={{
              20: '20',
              200: '200',
              500: '500',
            }}
          />
        </div>
      </Modal>
    </>
  )
}
