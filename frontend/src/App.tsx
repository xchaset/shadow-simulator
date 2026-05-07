import { useState, useEffect, useCallback, useRef } from 'react'
import { SceneCanvas } from './components/Scene/SceneCanvas'
import { Toolbar } from './components/Toolbar/Toolbar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { TimelinePanel } from './components/Controls/TimelinePanel'
import { MapModal } from './components/MapPicker/MapModal'
import { ProjectSidebar } from './components/ProjectSidebar/ProjectSidebar'
import { HelpButton } from './components/HelpGuide/HelpButton'
import { ShadowAnalysisPanel } from './components/ShadowAnalysis/ShadowAnalysisPanel'
import { ShadowHeatmapPanel } from './components/ShadowAnalysis/ShadowHeatmapPanel'
import { usePlayback } from './hooks/usePlayback'
import { useStore } from './store/useStore'
import { shareApi } from './utils/api'
import { message, Spin, Modal, Button } from 'antd'
import { WarningOutlined, ShareAltOutlined } from '@ant-design/icons'
import './App.css'

function App() {
  const [mapOpen, setMapOpen] = useState(false)
  const [shadowAnalysisOpen, setShadowAnalysisOpen] = useState(false)
  const [shadowHeatmapOpen, setShadowHeatmapOpen] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  
  const appRef = useRef<HTMLDivElement>(null)
  const shareMode = useStore(s => s.shareMode)
  const setShareMode = useStore(s => s.setShareMode)
  const setBuildings = useStore(s => s.setBuildings)
  const setLocation = useStore(s => s.setLocation)
  const setDateTime = useStore(s => s.setDateTime)
  const setCanvasSize = useStore(s => s.setCanvasSize)
  const setShowGrid = useStore(s => s.setShowGrid)
  const setGridDivisions = useStore(s => s.setGridDivisions)
  const setTerrainData = useStore(s => s.setTerrainData)
  const setCurrentModelId = useStore(s => s.setCurrentModelId)
  const setCurrentDirectoryId = useStore(s => s.setCurrentDirectoryId)
  const setDirty = useStore(s => s.setDirty)

  usePlayback()

  const loadShareData = useCallback(async (token: string) => {
    setShareLoading(true)
    setShareError(null)
    
    try {
      const share = await shareApi.get(token)
      
      setBuildings(share.scene_data || [])
      setLocation({
        lat: share.location_lat,
        lng: share.location_lng,
        cityName: share.city_name,
      })
      if (share.date_time) {
        setDateTime(new Date(share.date_time))
      }
      if (share.canvas_size !== undefined) setCanvasSize(share.canvas_size)
      if (share.show_grid !== undefined) setShowGrid(share.show_grid)
      if (share.grid_divisions !== undefined) setGridDivisions(share.grid_divisions)
      if (share.terrain_data) {
        setTerrainData({
          ...share.terrain_data,
          heights: new Float32Array(share.terrain_data.heights),
        })
      } else {
        setTerrainData(null)
      }
      
      setCurrentModelId(null)
      setCurrentDirectoryId(null)
      setDirty(false)
      
      setShareMode({
        isShareMode: true,
        shareToken: token,
        isReadOnly: share.is_read_only,
        shareData: share,
      })
      
      message.success('分享内容加载成功')
    } catch (err: any) {
      console.error('加载分享数据失败:', err)
      setShareError(err.message || '加载分享内容失败')
    } finally {
      setShareLoading(false)
    }
  }, [
    setBuildings, setLocation, setDateTime, setCanvasSize, 
    setShowGrid, setGridDivisions, setTerrainData, 
    setCurrentModelId, setCurrentDirectoryId, setDirty,
    setShareMode
  ])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const shareToken = urlParams.get('share')
    
    if (shareToken) {
      loadShareData(shareToken)
    }
  }, [loadShareData])

  const handleRetry = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const shareToken = urlParams.get('share')
    if (shareToken) {
      loadShareData(shareToken)
    }
  }

  const handleGoToHome = () => {
    window.location.href = window.location.pathname
  }

  if (shareLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
          正在加载分享内容...
        </div>
      </div>
    )
  }

  if (shareError) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <div style={{ 
          padding: 32, 
          background: '#fff', 
          borderRadius: 8,
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <WarningOutlined style={{ fontSize: 48, color: '#faad14' }} />
          <h2 style={{ marginTop: 16, marginBottom: 8 }}>无法加载分享内容</h2>
          <p style={{ color: '#666', marginBottom: 24 }}>
            {shareError}<br />
            链接可能已过期或不存在
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button onClick={handleRetry}>
              重试
            </Button>
            <Button type="primary" onClick={handleGoToHome}>
              返回首页
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const isReadOnly = shareMode.isReadOnly

  return (
    <div className="app" ref={appRef}>
      <Toolbar 
        onOpenMap={() => setMapOpen(true)}
        onOpenShadowAnalysis={() => setShadowAnalysisOpen(true)}
        onOpenShadowHeatmap={() => setShadowHeatmapOpen(true)}
      />
      <div className="main-content">
        {!isReadOnly && <ProjectSidebar />}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>
          <SceneCanvas />
          <TimelinePanel />
          {shadowAnalysisOpen && (
            <ShadowAnalysisPanel onClose={() => setShadowAnalysisOpen(false)} />
          )}
          {shadowHeatmapOpen && (
            <ShadowHeatmapPanel onClose={() => setShadowHeatmapOpen(false)} />
          )}
          
          {shareMode.isShareMode && shareMode.shareData && (
            <div style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '8px 12px',
              borderRadius: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              fontSize: 12,
              zIndex: 10,
              maxWidth: 300,
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                fontWeight: 600,
                marginBottom: 4,
              }}>
                <ShareAltOutlined style={{ color: '#1890ff' }} />
                <span>{shareMode.shareData.name}</span>
              </div>
              {shareMode.shareData.description && (
                <div style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>
                  {shareMode.shareData.description}
                </div>
              )}
              <div style={{ color: '#999', fontSize: 11 }}>
                {shareMode.shareData.view_count} 次查看 · {shareMode.shareData.building_count} 栋建筑
              </div>
            </div>
          )}
        </div>
        {!isReadOnly && <Sidebar />}
      </div>
      <MapModal open={mapOpen} onClose={() => setMapOpen(false)} />
      <HelpButton />
    </div>
  )
}

export default App
