import { useState, useRef } from 'react'
import { Button, Modal, Upload, Spin, message, Descriptions, Tag, Space } from 'antd'
import { CameraOutlined, InboxOutlined, CheckOutlined, ReloadOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import { useStore } from '../../store/useStore'
import {
  analyzeBuilding,
  analysisToBuildings,
  fileToBase64,
  type BuildingAnalysisParams,
} from '../../utils/aiBuilding'

export function BuildingImporter() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [params, setParams] = useState<BuildingAnalysisParams | null>(null)
  const fileRef = useRef<File | null>(null)
  const addBuilding = useStore(s => s.addBuilding)

  const reset = () => {
    setPreview(null)
    setParams(null)
    setLoading(false)
    fileRef.current = null
  }

  const handleClose = () => {
    setOpen(false)
    reset()
  }

  const handleFileSelect = async (file: File) => {
    // 校验文件类型和大小
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('请上传图片文件')
      return false
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('图片大小不能超过 10MB')
      return false
    }

    fileRef.current = file
    const base64 = await fileToBase64(file)
    setPreview(base64)
    setParams(null)

    // 自动开始分析
    await doAnalyze(base64)
    return false // 阻止 antd 默认上传
  }

  const doAnalyze = async (base64?: string) => {
    const imageData = base64 || preview
    if (!imageData) return

    setLoading(true)
    try {
      const result = await analyzeBuilding(imageData)
      setParams(result.params)
      message.success('分析完成')
    } catch (err) {
      message.error(`分析失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (!params) return

    const offset = (Math.random() - 0.5) * 40
    const buildings = analysisToBuildings(params, [offset, offset])
    buildings.forEach(b => addBuilding(b))

    message.success(`已添加 ${buildings.length} 个建筑到场景`)
    handleClose()
  }

  const roofLabel: Record<string, string> = {
    flat: '平顶',
    gable: '人字顶',
    hip: '四坡顶',
    'chinese-eave': '中式飞檐',
    dome: '穹顶',
  }

  /** 根据 shape 类型渲染不同的分析结果 */
  const renderAnalysisResult = (p: BuildingAnalysisParams) => {
    if ((p.shape === 'circular' || p.shape === 'complex') && p.levels?.length) {
      // 多层建筑
      const totalHeight = p.levels.reduce((sum, lv) => sum + lv.height, 0)
      return (
        <Descriptions bordered size="small" column={2} title="分析结果" style={{ marginTop: 8 }}>
          <Descriptions.Item label="建筑类型">
            <Tag color="purple">{p.shape === 'circular' ? '圆形多层' : '复杂多层'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="层数">
            {p.levels.length} 层
          </Descriptions.Item>
          {p.shape === 'circular' && p.radius && (
            <Descriptions.Item label="底层半径">
              {p.radius} 米
            </Descriptions.Item>
          )}
          <Descriptions.Item label="总高度（估算）">
            {totalHeight.toFixed(1)} 米
          </Descriptions.Item>
          <Descriptions.Item label="各层结构" span={2}>
            {p.levels.map((lv, i) => (
              <div key={i} style={{ fontSize: 12, lineHeight: '20px' }}>
                第{i + 1}层：高 {lv.height}m
                {lv.radius != null && `，半径 ${lv.radius}m`}
                {lv.width != null && `，宽 ${lv.width}m`}
                {lv.depth != null && `，深 ${lv.depth}m`}
                ，{roofLabel[lv.roofType] || lv.roofType}
                {lv.roofOverhang ? `（出挑 ${lv.roofOverhang}m）` : ''}
              </div>
            ))}
          </Descriptions.Item>
          <Descriptions.Item label="墙体颜色">
            <span style={{ display: 'inline-block', width: 16, height: 16, background: p.material.wallColor, border: '1px solid #d9d9d9', borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }} />
            {p.material.wallColor}
          </Descriptions.Item>
          <Descriptions.Item label="屋顶颜色">
            <span style={{ display: 'inline-block', width: 16, height: 16, background: p.material.roofColor, border: '1px solid #d9d9d9', borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }} />
            {p.material.roofColor}
          </Descriptions.Item>
        </Descriptions>
      )
    }

    // 简单矩形建筑
    const floors = p.floors || 1
    const floorHeight = p.floorHeight || 3
    return (
      <Descriptions bordered size="small" column={2} title="分析结果" style={{ marginTop: 8 }}>
        <Descriptions.Item label="楼层数">
          {floors} 层
        </Descriptions.Item>
        <Descriptions.Item label="层高">
          {floorHeight} 米
        </Descriptions.Item>
        <Descriptions.Item label="宽度">
          {p.width} 米
        </Descriptions.Item>
        <Descriptions.Item label="进深">
          {p.depth} 米
        </Descriptions.Item>
        <Descriptions.Item label="总高度">
          {floors * floorHeight} 米
        </Descriptions.Item>
        <Descriptions.Item label="屋顶类型">
          <Tag color="blue">{roofLabel[p.roofType || 'flat'] || p.roofType}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="墙体颜色">
          <span style={{ display: 'inline-block', width: 16, height: 16, background: p.material.wallColor, border: '1px solid #d9d9d9', borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }} />
          {p.material.wallColor}
        </Descriptions.Item>
        <Descriptions.Item label="屋顶颜色">
          <span style={{ display: 'inline-block', width: 16, height: 16, background: p.material.roofColor, border: '1px solid #d9d9d9', borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }} />
          {p.material.roofColor}
        </Descriptions.Item>
        {p.windowLayout && (
          <Descriptions.Item label="窗户布局" span={2}>
            {p.windowLayout.cols} 列 × {p.windowLayout.rows} 行，
            单窗 {p.windowLayout.width}×{p.windowLayout.height} 米
          </Descriptions.Item>
        )}
      </Descriptions>
    )
  }

  return (
    <>
      <Button
        size="small"
        icon={<CameraOutlined />}
        onClick={() => setOpen(true)}
        title="图片生成建筑"
      >
        AI
      </Button>

      <Modal
        title="📷 图片生成建筑"
        open={open}
        onCancel={handleClose}
        width={600}
        footer={
          params ? (
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => doAnalyze()}>
                重新分析
              </Button>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleConfirm}>
                添加到场景
              </Button>
            </Space>
          ) : null
        }
      >
        {!preview ? (
          <Upload.Dragger
            accept="image/*"
            showUploadList={false}
            beforeUpload={handleFileSelect}
            style={{ padding: '20px 0' }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽上传建筑物图片</p>
            <p className="ant-upload-hint">
              支持 JPG、PNG 格式，建议正面或侧面拍摄
            </p>
          </Upload.Dragger>
        ) : (
          <div>
            {/* 图片预览 */}
            <div style={{
              textAlign: 'center',
              marginBottom: 16,
              background: '#fafafa',
              borderRadius: 8,
              padding: 8,
            }}>
              <img
                src={preview}
                alt="建筑图片"
                style={{
                  maxWidth: '100%',
                  maxHeight: 250,
                  borderRadius: 4,
                  objectFit: 'contain',
                }}
              />
            </div>

            {/* 分析中 */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Spin size="large" />
                <p style={{ marginTop: 12, color: '#999' }}>
                  AI 正在分析建筑结构...
                </p>
              </div>
            )}

            {/* 分析结果 */}
            {params && !loading && renderAnalysisResult(params)}

            {/* 重新选择图片 */}
            {!loading && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={handleFileSelect}
                >
                  <Button size="small" type="link">
                    重新选择图片
                  </Button>
                </Upload>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
