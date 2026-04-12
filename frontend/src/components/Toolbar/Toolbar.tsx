import { BuildingTools } from './BuildingTools'
import { BuildingImporter } from './BuildingImporter'
import { CitySelector } from './CitySelector'
import { SunInfoPanel } from '../SunInfo/SunInfoPanel'
import { Button } from 'antd'
import { AimOutlined, AppstoreOutlined } from '@ant-design/icons'

interface ToolbarProps {
  onOpenMap?: () => void
}

export function Toolbar({ onOpenMap }: ToolbarProps) {
  return (
    <div style={{
      height: 48,
      padding: '0 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      background: '#fff',
      borderBottom: '1px solid #e8e8e8',
      zIndex: 10,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>
        <AppstoreOutlined /> 阴影模拟器
      </div>
      <div style={{ width: 1, height: 24, background: '#e8e8e8' }} />
      <CitySelector />
      {onOpenMap && (
        <Button
          size="small"
          icon={<AimOutlined />}
          onClick={onOpenMap}
        >
          选点
        </Button>
      )}
      <div style={{ width: 1, height: 24, background: '#e8e8e8' }} />
      <BuildingTools />
      <BuildingImporter />
      <div style={{ flex: 1 }} />
      <SunInfoPanel />
    </div>
  )
}
