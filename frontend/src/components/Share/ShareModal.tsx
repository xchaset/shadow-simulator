import { useState, useEffect, useCallback } from 'react'
import {
  Modal, Input, Button, Select, message, Descriptions, Tooltip,
  Empty, Space, Popconfirm, List,
} from 'antd'
import {
  ShareAltOutlined, CopyOutlined, LinkOutlined, DeleteOutlined,
  ClockCircleOutlined, EyeOutlined, GlobalOutlined,
} from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import { shareApi, type ShareDTO } from '../../utils/api'

const { TextArea } = Input
const { Option } = Select

interface ShareModalProps {
  open: boolean
  onClose: () => void
}

const EXPIRE_OPTIONS = [
  { value: 1, label: '1小时' },
  { value: 24, label: '1天' },
  { value: 168, label: '7天' },
  { value: 720, label: '30天' },
  { value: 8760, label: '1年' },
  { value: null, label: '永久有效' },
]

export function ShareModal({ open, onClose }: ShareModalProps) {
  const {
    currentModelId, buildings, location, dateTime,
    canvasSize, showGrid, gridDivisions, terrainData,
  } = useStore()

  const [loading, setLoading] = useState(false)
  const [shareName, setShareName] = useState('')
  const [shareDescription, setShareDescription] = useState('')
  const [expireHours, setExpireHours] = useState<number | null>(null)
  const [existingShares, setExistingShares] = useState<ShareDTO[]>([])
  const [sharesLoading, setSharesLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const loadExistingShares = useCallback(async () => {
    if (!currentModelId) return
    setSharesLoading(true)
    try {
      const shares = await shareApi.listByModel(currentModelId)
      setExistingShares(shares)
    } catch (err: any) {
      console.error('加载分享列表失败:', err)
    } finally {
      setSharesLoading(false)
    }
  }, [currentModelId])

  useEffect(() => {
    if (open) {
      setShareName(currentModelId ? '分享的模型' : '快速分享')
      setShareDescription('')
      setExpireHours(null)
      setActiveTab('create')
      setCopiedToken(null)
      if (currentModelId) {
        loadExistingShares()
      }
    }
  }, [open, currentModelId, loadExistingShares])

  const handleCreateShare = async () => {
    if (!shareName.trim()) {
      message.warning('请输入分享名称')
      return
    }

    setLoading(true)
    try {
      const terrainDataToSend = terrainData ? {
        resolution: terrainData.resolution,
        heights: Array.from(terrainData.heights),
        maxHeight: terrainData.maxHeight,
      } : null

      const share = await shareApi.create({
        model_id: currentModelId || undefined,
        name: shareName.trim(),
        description: shareDescription || undefined,
        location_lat: location.lat,
        location_lng: location.lng,
        city_name: location.cityName,
        date_time: dateTime.toISOString(),
        scene_data: buildings,
        canvas_size: canvasSize,
        show_grid: showGrid,
        grid_divisions: gridDivisions,
        terrain_data: terrainDataToSend,
        expires_in_hours: expireHours || undefined,
      })

      message.success('分享链接创建成功！')
      copyToClipboard(share.token)

      if (currentModelId) {
        loadExistingShares()
      }
    } catch (err: any) {
      message.error('创建分享失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteShare = async (token: string) => {
    try {
      await shareApi.delete(token)
      setExistingShares(prev => prev.filter(s => s.token !== token))
      message.success('分享已删除')
    } catch (err: any) {
      message.error('删除失败: ' + err.message)
    }
  }

  const copyToClipboard = (token: string) => {
    const shareUrl = `${window.location.origin}?share=${token}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedToken(token)
      message.success('链接已复制到剪贴板')
      setTimeout(() => setCopiedToken(null), 2000)
    }).catch(() => {
      message.warning('复制失败，请手动复制')
    })
  }

  const getShareUrl = (token: string) => {
    return `${window.location.origin}?share=${token}`
  }

  const formatExpireTime = (expiresAt: string | null, createdAt: string) => {
    if (!expiresAt) return '永久有效'
    const expire = new Date(expiresAt)
    const now = new Date()
    const diff = expire.getTime() - now.getTime()
    
    if (diff <= 0) return '已过期'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return '小于1小时'
    if (hours < 24) return `${hours}小时后过期`
    
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}天后过期`
    if (days < 30) return `${Math.floor(days / 7)}周后过期`
    return `${Math.floor(days / 30)}个月后过期`
  }

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShareAltOutlined /> 分享模型
        </span>
      }
      open={open}
      onCancel={onClose}
      width={600}
      footer={null}
      destroyOnClose
    >
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>
        {(['create', 'history'] as const).map(tab => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              color: activeTab === tab ? '#1677ff' : '#666',
              borderBottom: activeTab === tab ? '2px solid #1677ff' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab === 'create' ? '创建分享' : '分享历史'}
          </div>
        ))}
      </div>

      {activeTab === 'create' ? (
        <div>
          {/* Preview section */}
          <div style={{
            padding: 16,
            background: '#fafafa',
            borderRadius: 8,
            marginBottom: 16,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <EyeOutlined /> 预览分享内容
            </div>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="建筑数量">
                {buildings.length} 栋
              </Descriptions.Item>
              <Descriptions.Item label="城市">
                <GlobalOutlined /> {location.cityName}
              </Descriptions.Item>
              <Descriptions.Item label="坐标">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </Descriptions.Item>
              <Descriptions.Item label="画布尺寸">
                {canvasSize} 米
              </Descriptions.Item>
              <Descriptions.Item label="地形">
                {terrainData ? `有 (${terrainData.resolution}×${terrainData.resolution})` : '无'}
              </Descriptions.Item>
              <Descriptions.Item label="网格">
                {showGrid ? '显示' : '隐藏'}
              </Descriptions.Item>
            </Descriptions>
          </div>

          {/* Settings */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>
                分享名称 <span style={{ color: '#ff4d4f' }}>*</span>
              </label>
              <Input
                placeholder="请输入分享名称"
                value={shareName}
                onChange={e => setShareName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>
                描述（可选）
              </label>
              <TextArea
                placeholder="添加分享描述..."
                value={shareDescription}
                onChange={e => setShareDescription(e.target.value)}
                rows={3}
                maxLength={500}
                showCount
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} /> 过期时间
              </label>
              <Select
                style={{ width: '100%' }}
                value={expireHours}
                onChange={setExpireHours}
                options={EXPIRE_OPTIONS}
              />
            </div>
          </div>

          <div style={{
            padding: 12,
            background: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: 6,
            fontSize: 12,
            color: '#1890ff',
            marginBottom: 16,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>💡 提示</div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>分享链接是只读模式，接收者无法修改内容</li>
              <li>分享内容包括当前场景的所有建筑、地形和设置</li>
              <li>GLB 模型文件不会随分享一起传递</li>
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={onClose}>取消</Button>
            <Button
              type="primary"
              icon={<ShareAltOutlined />}
              onClick={handleCreateShare}
              loading={loading}
            >
              创建分享链接
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {!currentModelId ? (
            <Empty description="当前没有选中模型，无法查看分享历史" />
          ) : sharesLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
          ) : existingShares.length === 0 ? (
            <Empty
              description="暂无分享历史"
              style={{ padding: '40px 0' }}
            />
          ) : (
            <List
              dataSource={existingShares}
              renderItem={share => {
                const isExpired = share.expires_at && new Date(share.expires_at) < new Date()
                return (
                  <List.Item
                    style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}
                    actions={[
                      <Tooltip key="copy" title="复制链接">
                        <Button
                          type="text"
                          size="small"
                          icon={copiedToken === share.token ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                          onClick={() => copyToClipboard(share.token)}
                        >
                          复制
                        </Button>
                      </Tooltip>,
                      <Popconfirm
                        key="delete"
                        title="确定删除此分享链接？"
                        description="删除后，该链接将无法访问"
                        okText="删除"
                        okType="danger"
                        cancelText="取消"
                        onConfirm={() => handleDeleteShare(share.token)}
                      >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />}>
                          删除
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <LinkOutlined />
                          <span>{share.name}</span>
                          {isExpired && <Tag color="error">已过期</Tag>}
                        </div>
                      }
                      description={
                        <div style={{ marginTop: 4 }}>
                          <Space size={16}>
                            <span style={{ fontSize: 12, color: '#999' }}>
                              <EyeOutlined style={{ marginRight: 4 }} />
                              {share.view_count} 次查看
                            </span>
                            <span style={{ fontSize: 12, color: '#999' }}>
                              {formatExpireTime(share.expires_at, share.created_at)}
                            </span>
                            <span style={{ fontSize: 12, color: '#999' }}>
                              🏢 {share.building_count} 栋
                            </span>
                            <span style={{ fontSize: 12, color: '#999' }}>
                              📅 {new Date(share.created_at).toLocaleString()}
                            </span>
                          </Space>
                          {share.description && (
                            <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                              {share.description}
                            </div>
                          )}
                          <div style={{ marginTop: 4, fontSize: 11, color: '#999', wordBreak: 'break-all' }}>
                            链接: {getShareUrl(share.token)}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )
              }}
            />
          )}
        </div>
      )}
    </Modal>
  )
}

function CheckCircleOutlined(props: any) {
  return <span style={{ color: '#52c41a' }}>✓</span>
}
