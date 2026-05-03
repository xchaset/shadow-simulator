import { useState } from 'react'
import { BuildingTools } from './BuildingTools'
import { BuildingImporter } from './BuildingImporter'
import { GlbImporter } from './GlbImporter'
import { CitySelector } from './CitySelector'
import { SunInfoPanel } from '../SunInfo/SunInfoPanel'
import { TemplateSelector } from './TemplateSelector'
import { CustomTemplateBar } from './CustomTemplateBar'
import { ShareModal } from '../Share/ShareModal'
import { Button } from 'antd'
import { 
  AimOutlined, AppstoreOutlined, EnvironmentOutlined, FileTextOutlined, 
  BorderOutlined, ShareAltOutlined 
} from '@ant-design/icons'
import { useStore } from '../../store/useStore'

interface ToolbarProps {
  onOpenMap?: () => void
  onOpenShadowAnalysis?: () => void
}

export function Toolbar({ onOpenMap, onOpenShadowAnalysis }: ToolbarProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const terrainEditor = useStore(s => s.terrainEditor)
  const setTerrainEditor = useStore(s => s.setTerrainEditor)
  const measurementTool = useStore(s => s.measurementTool)
  const setMeasurementTool = useStore(s => s.setMeasurementTool)
  const clearMeasurementPoints = useStore(s => s.clearMeasurementPoints)
  const selectedBuildingIds = useStore(s => s.selectedBuildingIds)
  const selectedBuildingId = useStore(s => s.selectedBuildingId)
  const shareMode = useStore(s => s.shareMode)

  const hasSelectedBuildings = selectedBuildingIds.length > 0 || selectedBuildingId !== null
  const isReadOnly = shareMode.isReadOnly

  const toggleTerrain = () => {
    setTerrainEditor({ enabled: !terrainEditor.enabled })
  }

  const toggleMeasurement = () => {
    if (measurementTool.enabled) {
      clearMeasurementPoints()
      setMeasurementTool({ enabled: false })
    } else {
      setMeasurementTool({ enabled: true })
    }
  }

  return (
    <>
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
          {isReadOnly && (
            <span style={{ 
              fontSize: 11, 
              background: '#e6f7ff', 
              color: '#1890ff', 
              padding: '2px 8px', 
              borderRadius: 4,
              marginLeft: 8
            }}>
              只读模式
            </span>
          )}
        </div>
        {!isReadOnly && (
          <>
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
              <TemplateSelector />
            </div>
            <div style={{ flexShrink: 0 }}>
              <CustomTemplateBar />
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
            <Button
              size="small"
              type={measurementTool.enabled ? 'primary' : 'default'}
              icon={<BorderOutlined />}
              onClick={toggleMeasurement}
              style={{ flexShrink: 0 }}
            >
              测量
            </Button>
            {onOpenShadowAnalysis && (
              <Button
                size="small"
                icon={<FileTextOutlined />}
                onClick={onOpenShadowAnalysis}
                disabled={!hasSelectedBuildings}
                style={{ flexShrink: 0 }}
              >
                阴影分析
              </Button>
            )}
          </>
        )}
        <div style={{ flex: 1, minWidth: 16 }} />
        {!isReadOnly && (
          <Button
            size="small"
            icon={<ShareAltOutlined />}
            onClick={() => setShareModalOpen(true)}
            style={{ flexShrink: 0 }}
          >
            分享
          </Button>
        )}
        <div style={{ flexShrink: 0 }}>
          <SunInfoPanel />
        </div>
      </div>
      
      <ShareModal 
        open={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
      />
    </>
  )
}
