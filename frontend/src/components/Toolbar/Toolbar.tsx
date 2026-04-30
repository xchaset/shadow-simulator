import { BuildingTools } from './BuildingTools'
import { BuildingImporter } from './BuildingImporter'
import { GlbImporter } from './GlbImporter'
import { CitySelector } from './CitySelector'
import { SunInfoPanel } from '../SunInfo/SunInfoPanel'
import { Button } from 'antd'
import { AimOutlined, AppstoreOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { useStore } from '../../store/useStore'

interface ToolbarProps {
  onOpenMap?: () => void
}

export function Toolbar({ onOpenMap }: ToolbarProps) {
  const terrainEditor = useStore(s => s.terrainEditor)
  const setTerrainEditor = useStore(s => s.setTerrainEditor)

  const toggleTerrain = () => {
    setTerrainEditor({ enabled: !terrainEditor.enabled })
  }

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
      overflowX: 'auto',
      overflowY: 'hidden',
      scrollbarWidth: 'thin',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0 }}>
        <AppstoreOutlined /> 阴影模拟器
      </div>
      <div style={{ width: 1, height: 24, background: '#e8e8e8', flexShrink: 0 }} />
      <div style={{ flexShrink: 0 }}>
        <CitySelector />
      </div>
      {onOpenMap && (
        <Button
          size="small"
          icon={<AimOutlined />}
          onClick={onOpenMap}
          style={{ flexShrink: 0 }}
        >
          选点
        </Button>
      )}
      <div style={{ width: 1, height: 24, background: '#e8e8e8', flexShrink: 0 }} />
      <div style={{ flexShrink: 0 }}>
        <BuildingTools />
      </div>
      <div style={{ flexShrink: 0 }}>
        <BuildingImporter />
      </div>
      <div style={{ flexShrink: 0 }}>
        <GlbImporter />
      </div>
      <div style={{ width: 1, height: 24, background: '#e8e8e8', flexShrink: 0 }} />
      <Button
        size="small"
        type={terrainEditor.enabled ? 'primary' : 'default'}
        icon={<EnvironmentOutlined />}
        onClick={toggleTerrain}
        style={{ flexShrink: 0 }}
      >
        地貌
      </Button>
      <div style={{ flex: 1, minWidth: 16 }} />
      <div style={{ flexShrink: 0 }}>
        <SunInfoPanel />
      </div>
    </div>
  )
}
