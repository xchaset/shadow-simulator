import { useState, useEffect } from 'react'
import { Table, Tag, Descriptions, Card, Row, Col, Statistic, Empty, Spin, Button, Modal } from 'antd'
import {
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  ResponsiveContainer
} from 'recharts'
import {
  SunOutlined,
  MoonOutlined,
  CalendarOutlined,
  BarChartOutlined,
  FileTextOutlined,
  CloseOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import { formatMinutesToHours, formatTime, generateShadowAnalysisReport } from '../../utils/shadowAnalysis'
import type { BuildingDaylightResult, SolarTermDaylightAnalysis } from '../../types'

interface Props {
  onClose: () => void
}

export function ShadowAnalysisPanel({ onClose }: Props) {
  const location = useStore(s => s.location)
  const buildings = useStore(s => s.buildings)
  const selectedBuildingIds = useStore(s => s.selectedBuildingIds)
  const selectedBuildingId = useStore(s => s.selectedBuildingId)
  const shadowAnalysisReport = useStore(s => s.shadowAnalysisReport)
  const setShadowAnalysisReport = useStore(s => s.setShadowAnalysisReport)
  const isGeneratingReport = useStore(s => s.isGeneratingReport)
  const setIsGeneratingReport = useStore(s => s.setIsGeneratingReport)

  const [selectedBuildingForDetail, setSelectedBuildingForDetail] = useState<string | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedAnalysisForDetail, setSelectedAnalysisForDetail] = useState<SolarTermDaylightAnalysis | null>(null)

  const activeBuildingIds = selectedBuildingIds.length > 0
    ? selectedBuildingIds
    : selectedBuildingId
      ? [selectedBuildingId]
      : []

  const selectedBuildings = buildings.filter(b => activeBuildingIds.includes(b.id))

  const isReportMatching = (): boolean => {
    if (!shadowAnalysisReport) return false
    if (activeBuildingIds.length !== shadowAnalysisReport.buildingIds.length) return false
    return activeBuildingIds.every(id => shadowAnalysisReport.buildingIds.includes(id))
  }

  useEffect(() => {
    if (activeBuildingIds.length > 0 && !isGeneratingReport) {
      if (!isReportMatching()) {
        setShadowAnalysisReport(null)
        generateReport()
      }
    }
  }, [activeBuildingIds, shadowAnalysisReport, isGeneratingReport])

  const generateReport = () => {
    if (activeBuildingIds.length === 0) return

    setIsGeneratingReport(true)

    setTimeout(() => {
      const report = generateShadowAnalysisReport(
        activeBuildingIds,
        buildings,
        location
      )
      setShadowAnalysisReport(report)
      setIsGeneratingReport(false)
    }, 500)
  }

  const handleRefresh = () => {
    setShadowAnalysisReport(null)
    generateReport()
  }

  const handleShowBuildingDetail = (buildingId: string, analysis: SolarTermDaylightAnalysis) => {
    setSelectedBuildingForDetail(buildingId)
    setSelectedAnalysisForDetail(analysis)
    setDetailModalVisible(true)
  }

  const getBuildingResult = (analysis: SolarTermDaylightAnalysis, buildingId: string): BuildingDaylightResult | undefined => {
    return analysis.buildingResults.find(r => r.buildingId === buildingId)
  }

  const getDaylightColor = (minutes: number, maxMinutes: number): string => {
    if (maxMinutes === 0) return '#d9d9d9'
    const ratio = minutes / maxMinutes
    if (ratio >= 0.7) return '#52c41a'
    if (ratio >= 0.4) return '#faad14'
    return '#ff4d4f'
  }

  const buildChartData = () => {
    if (!shadowAnalysisReport) return []

    return shadowAnalysisReport.solarTermAnalyses.map(analysis => {
      const item: Record<string, string | number> = {
        name: analysis.solarTerm.name,
      }

      analysis.buildingResults.forEach(result => {
        item[result.buildingName] = result.totalDaylightMinutes / 60
      })

      return item
    })
  }

  const buildHourlyChartData = (result: BuildingDaylightResult) => {
    return result.hourlyData.map(h => ({
      hour: `${h.hour}:00`,
      minutes: h.daylightMinutes
    }))
  }

  const selectedBuildingForDetailResult = selectedAnalysisForDetail && selectedBuildingForDetail
    ? getBuildingResult(selectedAnalysisForDetail, selectedBuildingForDetail)
    : null

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: 800,
      maxWidth: '100%',
      background: '#fff',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fafafa'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileTextOutlined style={{ fontSize: 18, color: '#1890ff' }} />
          <span style={{ fontSize: 16, fontWeight: 600 }}>阴影分析报告</span>
          <Tag color="blue">{location.cityName}</Tag>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            icon={<DownloadOutlined />}
            size="small"
            disabled={!shadowAnalysisReport}
          >
            导出报告
          </Button>
          <Button
            icon={<BarChartOutlined />}
            size="small"
            onClick={handleRefresh}
            loading={isGeneratingReport}
          >
            刷新
          </Button>
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
        padding: 16
      }}>
        {isGeneratingReport ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 16
          }}>
            <Spin size="large" />
            <span style={{ color: '#666' }}>正在生成阴影分析报告...</span>
          </div>
        ) : shadowAnalysisReport ? (
          <>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions size="small" column={4}>
                <Descriptions.Item label="生成时间">
                  {shadowAnalysisReport.generatedAt.toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="分析建筑">
                  {selectedBuildings.length} 栋
                </Descriptions.Item>
                <Descriptions.Item label="平均日照">
                  {formatMinutesToHours(shadowAnalysisReport.summary.avgDaylightMinutes)}
                </Descriptions.Item>
                <Descriptions.Item label="最佳节气">
                  {shadowAnalysisReport.summary.bestSolarTerm?.name || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="平均日照时长"
                    value={formatMinutesToHours(shadowAnalysisReport.summary.avgDaylightMinutes)}
                    prefix={<SunOutlined style={{ color: '#1890ff' }} />}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="最长日照"
                    value={formatMinutesToHours(shadowAnalysisReport.summary.maxDaylightMinutes)}
                    prefix={<SunOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="最短日照"
                    value={formatMinutesToHours(shadowAnalysisReport.summary.minDaylightMinutes)}
                    prefix={<MoonOutlined style={{ color: '#faad14' }} />}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="分析节气数"
                    value={shadowAnalysisReport.solarTermAnalyses.length}
                    prefix={<CalendarOutlined style={{ color: '#722ed1' }} />}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Card>
              </Col>
            </Row>

            <Card
              size="small"
              title={<><BarChartOutlined /> 各节气日照时长对比</>}
              style={{ marginBottom: 16 }}
            >
              <div style={{ height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={buildChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: '小时', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)} 小时`, '']}
                    />
                    <Legend />
                    {selectedBuildings.map((building, index) => {
                      const colors = ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#eb2f96']
                      return (
                        <Bar
                          key={building.id}
                          dataKey={building.name}
                          fill={colors[index % colors.length]}
                        />
                      )
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              size="small"
              title={<><CalendarOutlined /> 各节气详细数据</>}
            >
              <Table
                size="small"
                pagination={false}
                dataSource={shadowAnalysisReport.solarTermAnalyses}
                rowKey={a => a.solarTerm.id}
                scroll={{ x: 'max-content' }}
              >
                <Table.Column
                  title="节气"
                  dataIndex={['solarTerm', 'name']}
                  key="solarTerm"
                  width={100}
                  render={(name, record) => (
                    <div>
                      <div style={{ fontWeight: 500 }}>{name}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>
                        {record.solarTerm.month}月{record.solarTerm.day}日
                      </div>
                    </div>
                  )}
                />
                <Table.Column
                  title="日出-日落"
                  key="sunTime"
                  width={120}
                  render={(_, record) => (
                    <div style={{ fontSize: 12 }}>
                      <div style={{ color: '#52c41a' }}>{formatTime(record.sunrise)}</div>
                      <div style={{ color: '#faad14' }}>{formatTime(record.sunset)}</div>
                    </div>
                  )}
                />
                {selectedBuildings.map(building => {
                  const maxMinutes = Math.max(
                    ...shadowAnalysisReport.solarTermAnalyses.map(a => {
                      const result = a.buildingResults.find(r => r.buildingId === building.id)
                      return result?.totalDaylightMinutes || 0
                    })
                  )
                  return (
                    <Table.Column
                      key={building.id}
                      title={
                        <div style={{ whiteSpace: 'nowrap' }}>
                          {building.name}
                        </div>
                      }
                      width={160}
                      render={(_, record) => {
                        const result = getBuildingResult(record, building.id)
                        if (!result) return '-'
                        return (
                          <div style={{ cursor: 'pointer' }} onClick={() => handleShowBuildingDetail(building.id, record)}>
                            <Tag
                              color={getDaylightColor(result.totalDaylightMinutes, maxMinutes)}
                              style={{ margin: 0 }}
                            >
                              {formatMinutesToHours(result.totalDaylightMinutes)}
                            </Tag>
                            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                              {result.daylightIntervals.length} 个时段
                            </div>
                          </div>
                        )
                      }}
                    />
                  )
                })}
              </Table>
            </Card>
          </>
        ) : (
          <Empty
            description="请先选择要分析的建筑物"
            style={{ marginTop: 60 }}
          />
        )}
      </div>

      <Modal
        title={`${selectedBuildingForDetailResult?.buildingName} - ${selectedAnalysisForDetail?.solarTerm.name} 日照详情`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedBuildingForDetailResult && selectedAnalysisForDetail && (
          <div>
            <Descriptions size="small" column={3} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="总日照时长">
                <Tag color="blue">{formatMinutesToHours(selectedBuildingForDetailResult.totalDaylightMinutes)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="日出时间">
                {formatTime(selectedAnalysisForDetail.sunrise)}
              </Descriptions.Item>
              <Descriptions.Item label="日落时间">
                {formatTime(selectedAnalysisForDetail.sunset)}
              </Descriptions.Item>
            </Descriptions>

            <Card size="small" title="每小时日照分布" style={{ marginBottom: 16 }}>
              <div style={{ height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={buildHourlyChartData(selectedBuildingForDetailResult)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis label={{ value: '分钟', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      formatter={(value: number) => [`${value} 分钟`, '日照时长']}
                    />
                    <Bar dataKey="minutes" fill="#1890ff" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card size="small" title="日照时段详情">
              <Table
                size="small"
                dataSource={selectedBuildingForDetailResult.daylightIntervals}
                pagination={false}
                rowKey={(_, index) => index}
              >
                <Table.Column
                  title="序号"
                  key="index"
                  width={60}
                  render={(_, __, index) => index + 1}
                />
                <Table.Column
                  title="开始时间"
                  key="start"
                  render={(_, record) => formatTime(record.start)}
                />
                <Table.Column
                  title="结束时间"
                  key="end"
                  render={(_, record) => formatTime(record.end)}
                />
                <Table.Column
                  title="持续时长"
                  key="duration"
                  render={(_, record) => (
                    <Tag color="green">{formatMinutesToHours(record.durationMinutes)}</Tag>
                  )}
                />
              </Table>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  )
}
