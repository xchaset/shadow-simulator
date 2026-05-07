import { useState, useEffect } from 'react'
import { Card, Button, Select, Slider, Switch, Descriptions, Spin, Empty, Tag, Row, Col, Statistic } from 'antd'
import {
  HeatMapOutlined,
  CalendarOutlined,
  EyeOutlined,
  ReloadOutlined,
  CloseOutlined,
  SettingOutlined,
  SunOutlined,
  MoonOutlined
} from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import type { ShadowHeatmapMode } from '../../types'
import { formatMinutesToHours } from '../../utils/shadowAnalysis'

interface Props {
  onClose: () => void
}

export function ShadowHeatmapPanel({ onClose }: Props) {
  const buildings = useStore(s => s.buildings)
  const shadowHeatmap = useStore(s => s.shadowHeatmap)
  const setShadowHeatmap = useStore(s => s.setShadowHeatmap)
  const generateShadowHeatmap = useStore(s => s.generateShadowHeatmap)
  const clearShadowHeatmap = useStore(s => s.clearShadowHeatmap)
  const dateTime = useStore(s => s.dateTime)
  
  const { enabled, mode, isGenerating, result, opacity, gridResolution } = shadowHeatmap
  
  const hasBuildings = buildings.length > 0
  
  const handleGenerate = (selectedMode: ShadowHeatmapMode) => {
    generateShadowHeatmap(selectedMode)
  }
  
  const handleToggleEnabled = (checked: boolean) => {
    if (checked && !result) {
      handleGenerate(mode)
    } else {
      setShadowHeatmap({ enabled: checked })
    }
  }
  
  const handleModeChange = (newMode: string) => {
    setShadowHeatmap({ mode: newMode as ShadowHeatmapMode })
  }
  
  const handleOpacityChange = (value: number) => {
    setShadowHeatmap({ opacity: value / 100 })
  }
  
  const handleResolutionChange = (value: number) => {
    setShadowHeatmap({ gridResolution: value })
  }
  
  const handleRefresh = () => {
    handleGenerate(mode)
  }
  
  const handleClear = () => {
    clearShadowHeatmap()
  }
  
  const getModeLabel = (modeValue: string) => {
    return modeValue === 'day' ? '单日分析' : '全年分析'
  }
  
  const getColorLegend = () => {
    const colors = [
      { label: '日照充足', color: '#00cc00' },
      { label: '部分日照', color: '#ffcc00' },
      { label: '阴影较多', color: '#ff6600' },
      { label: '阴影密集', color: '#990033' }
    ]
    
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
        {colors.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 16,
              height: 16,
              backgroundColor: item.color,
              borderRadius: 2
            }} />
            <span style={{ fontSize: 12, color: '#666' }}>{item.label}</span>
          </div>
        ))}
      </div>
    )
  }
  
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: 380,
      maxWidth: '100%',
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(8px)',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(240, 240, 240, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(250, 250, 250, 0.85)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HeatMapOutlined style={{ fontSize: 18, color: '#1890ff' }} />
          <span style={{ fontSize: 16, fontWeight: 600 }}>阴影累积热力图</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            icon={<CloseOutlined />}
            size="small"
            onClick={onClose}
          />
        </div>
      </div>
      
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 12
      }}>
        {isGenerating ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 16
          }}>
            <Spin size="large" />
            <span style={{ color: '#666' }}>正在生成阴影累积热力图...</span>
            <span style={{ color: '#999', fontSize: 12 }}>
              {mode === 'day' ? '分析单日阴影变化' : '分析全年节气阴影变化'}
            </span>
          </div>
        ) : !hasBuildings ? (
          <Empty
            description="请先添加建筑物后再进行分析"
            style={{ marginTop: 60 }}
          />
        ) : (
          <>
            <Card 
              size="small" 
              style={{ 
                marginBottom: 10,
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(240, 240, 240, 0.6)'
              }}
            >
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="当前日期">
                  {dateTime.toLocaleDateString()}
                </Descriptions.Item>
                <Descriptions.Item label="建筑数量">
                  {buildings.length} 栋
                </Descriptions.Item>
              </Descriptions>
            </Card>
            
            <Card 
              size="small" 
              title={<><SettingOutlined /> 分析设置</>} 
              style={{ 
                marginBottom: 10,
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(240, 240, 240, 0.6)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>启用热力图</span>
                    <Switch
                      checked={enabled}
                      onChange={handleToggleEnabled}
                      disabled={isGenerating}
                    />
                  </div>
                </div>
                
                <div>
                  <label style={{ fontSize: 13, marginBottom: 4, display: 'block' }}>
                    <CalendarOutlined /> 分析模式
                  </label>
                  <Select
                    value={mode}
                    onChange={handleModeChange}
                    style={{ width: '100%' }}
                    disabled={isGenerating}
                    options={[
                      { value: 'day', label: '单日分析（当前日期）' },
                      { value: 'year', label: '全年分析（8个节气）' }
                    ]}
                  />
                </div>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>网格分辨率</span>
                    <Tag color="blue">{gridResolution}x{gridResolution}</Tag>
                  </div>
                  <Slider
                    min={20}
                    max={100}
                    step={10}
                    value={gridResolution}
                    onChange={handleResolutionChange}
                    disabled={isGenerating}
                    marks={{ 20: '低', 50: '中', 100: '高' }}
                  />
                  <div style={{ fontSize: 11, color: '#999', marginTop: 12 }}>
                    分辨率越高，计算时间越长
                  </div>
                </div>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>透明度</span>
                    <Tag color="green">{Math.round(opacity * 100)}%</Tag>
                  </div>
                  <Slider
                    min={10}
                    max={90}
                    step={5}
                    value={Math.round(opacity * 100)}
                    onChange={handleOpacityChange}
                    disabled={!enabled || isGenerating}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    type="primary"
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    loading={isGenerating}
                    block
                  >
                    重新计算
                  </Button>
                  <Button
                    icon={<EyeOutlined />}
                    onClick={handleClear}
                    disabled={!result || isGenerating}
                  >
                    清除
                  </Button>
                </div>
              </div>
            </Card>
            
            {result && (
              <>
                <Card 
                  size="small" 
                  title={<><HeatMapOutlined /> 分析结果</>} 
                  style={{ 
                    marginBottom: 10,
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(240, 240, 240, 0.6)'
                  }}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic
                        title="分析模式"
                        value={getModeLabel(result.mode)}
                        valueStyle={{ fontSize: 14 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="网格点数"
                        value={result.gridPoints.length}
                        valueStyle={{ fontSize: 14 }}
                      />
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginTop: 12 }}>
                    <Col span={12}>
                      <Statistic
                        title="最大阴影时长"
                        value={formatMinutesToHours(result.maxShadowMinutes)}
                        prefix={<MoonOutlined style={{ color: '#faad14' }} />}
                        valueStyle={{ fontSize: 14 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="最小阴影时长"
                        value={formatMinutesToHours(result.minShadowMinutes)}
                        prefix={<SunOutlined style={{ color: '#52c41a' }} />}
                        valueStyle={{ fontSize: 14 }}
                      />
                    </Col>
                  </Row>
                  <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid rgba(240, 240, 240, 0.8)' }}>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>生成时间</div>
                    <div style={{ fontSize: 12 }}>{result.generatedAt.toLocaleString()}</div>
                  </div>
                </Card>
                
                <Card 
                  size="small" 
                  title="颜色图例"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(240, 240, 240, 0.6)'
                  }}
                >
                  {getColorLegend()}
                  <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
                    绿色表示日照充足区域，红色/紫色表示阴影密集区域
                  </div>
                </Card>
              </>
            )}
            
            {!result && !isGenerating && (
              <Card 
                size="small"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(240, 240, 240, 0.6)'
                }}
              >
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <HeatMapOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 12 }} />
                  <div style={{ color: '#666', marginBottom: 8 }}>点击"重新计算"生成阴影热力图</div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {mode === 'day' 
                      ? '将分析当前日期从日出到日落的阴影变化' 
                      : '将分析全年8个节气的阴影变化'}
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}