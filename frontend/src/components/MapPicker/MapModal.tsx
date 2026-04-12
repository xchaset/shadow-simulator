import { useState } from 'react'
import { Modal, InputNumber, Input, Space, App } from 'antd'
import { EnvironmentOutlined } from '@ant-design/icons'
import { useStore } from '../../store/useStore'

interface Props {
  open: boolean
  onClose: () => void
}

export function MapModal({ open, onClose }: Props) {
  const location = useStore(s => s.location)
  const setLocation = useStore(s => s.setLocation)
  const { message } = App.useApp()

  const [lat, setLat] = useState(location.lat)
  const [lng, setLng] = useState(location.lng)
  const [cityName, setCityName] = useState(location.cityName)

  // Sync when modal opens
  const handleOpen = () => {
    setLat(location.lat)
    setLng(location.lng)
    setCityName(location.cityName)
  }

  const handleConfirm = () => {
    setLocation({ lat, lng, cityName: cityName || `${lat.toFixed(2)}, ${lng.toFixed(2)}` })
    message.success(`已切换到 ${cityName || '自定义位置'}`)
    onClose()
  }

  return (
    <Modal
      title={<span><EnvironmentOutlined /> 选择地点</span>}
      open={open}
      onCancel={onClose}
      onOk={handleConfirm}
      okText="确定"
      cancelText="取消"
      afterOpenChange={(open) => { if (open) handleOpen() }}
      width={500}
    >
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索地址（需配置 VITE_AMAP_KEY）"
          prefix={<EnvironmentOutlined />}
          disabled
          style={{ marginBottom: 12 }}
        />
      </div>

      <div style={{
        height: 250,
        background: '#f5f5f5',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontSize: 13,
        marginBottom: 16,
        border: '1px dashed #d9d9d9',
      }}>
        地图区域（配置 VITE_AMAP_KEY 后启用）
      </div>

      <Space size="middle">
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>名称</div>
          <Input
            size="small"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            style={{ width: 120 }}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>纬度</div>
          <InputNumber
            size="small"
            value={lat}
            min={-90}
            max={90}
            step={0.01}
            onChange={(v) => v !== null && setLat(v)}
            style={{ width: 120 }}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>经度</div>
          <InputNumber
            size="small"
            value={lng}
            min={-180}
            max={180}
            step={0.01}
            onChange={(v) => v !== null && setLng(v)}
            style={{ width: 120 }}
          />
        </div>
      </Space>
    </Modal>
  )
}
