import { useState, useRef } from 'react'
import { Button, Modal, Upload, Spin, message, InputNumber, Slider, Space } from 'antd'
import { FileAddOutlined, InboxOutlined, CheckOutlined } from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import { glbApi } from '../../utils/api'
import type { Building } from '../../types'

export function GlbImporter() {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState<{ url: string; filename: string } | null>(null)
  const [scale, setScale] = useState(1)
  const [modelName, setModelName] = useState('')
  const addBuilding = useStore(s => s.addBuilding)

  const reset = () => {
    setUploaded(null)
    setUploading(false)
    setScale(1)
    setModelName('')
  }

  const handleClose = () => {
    setOpen(false)
    reset()
  }

  const handleFileSelect = async (file: File) => {
    const valid = file.name.endsWith('.glb') || file.name.endsWith('.gltf')
    if (!valid) {
      message.error('请上传 .glb 或 .gltf 文件')
      return false
    }
    if (file.size > 50 * 1024 * 1024) {
      message.error('文件大小不能超过 50MB')
      return false
    }

    setUploading(true)
    setModelName(file.name.replace(/\.(glb|gltf)$/i, ''))

    try {
      const result = await glbApi.upload(file)
      setUploaded({ url: result.url, filename: result.filename })
      message.success('文件上传成功')
    } catch (err) {
      message.error(`上传失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setUploading(false)
    }

    return false
  }

  const handleConfirm = () => {
    if (!uploaded) return

    const offset = (Math.random() - 0.5) * 40
    const building: Building = {
      id: `glb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: modelName || 'GLB 模型',
      type: 'glb',
      params: { scale },
      position: [offset, offset],
      rotation: 0,
      color: '#888888',
      glbUrl: `/api${uploaded.url}`,
      glbScale: scale,
    }

    addBuilding(building)
    message.success('模型已添加到场景')
    handleClose()
  }

  const fileSizeText = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <>
      <Button
        size="small"
        icon={<FileAddOutlined />}
        onClick={() => setOpen(true)}
        title="导入 GLB 模型"
      >
        GLB
      </Button>

      <Modal
        title="📦 导入 GLB/GLTF 模型"
        open={open}
        onCancel={handleClose}
        width={500}
        footer={
          uploaded ? (
            <Button type="primary" icon={<CheckOutlined />} onClick={handleConfirm}>
              添加到场景
            </Button>
          ) : null
        }
      >
        {!uploaded ? (
          <div>
            <Upload.Dragger
              accept=".glb,.gltf"
              showUploadList={false}
              beforeUpload={handleFileSelect}
              disabled={uploading}
              style={{ padding: '20px 0' }}
            >
              {uploading ? (
                <div style={{ padding: '20px 0' }}>
                  <Spin size="large" />
                  <p style={{ marginTop: 12, color: '#999' }}>正在上传...</p>
                </div>
              ) : (
                <>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽上传 GLB/GLTF 模型文件</p>
                  <p className="ant-upload-hint">
                    支持 .glb、.gltf 格式，最大 50MB。推荐使用 Blender 导出的 GLB 文件。
                  </p>
                </>
              )}
            </Upload.Dragger>

            <div style={{ marginTop: 16, padding: '12px 16px', background: '#f6f8fa', borderRadius: 8, fontSize: 12, color: '#666' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>💡 提示</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>在 Blender 中导出时勾选 "+Y Up" 确保方向正确</li>
                <li>开启 Draco 压缩可大幅减小文件体积</li>
                <li>导出前执行 Ctrl+A → All Transforms 应用变换</li>
              </ul>
            </div>
          </div>
        ) : (
          <div>
            <div style={{
              padding: 16,
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 8,
              marginBottom: 16,
            }}>
              <div style={{ fontWeight: 600, color: '#52c41a', marginBottom: 4 }}>
                ✅ 文件已上传
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                {uploaded.filename}
              </div>
            </div>

            {/* 模型缩放 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>模型缩放比例</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Slider
                  min={0.01}
                  max={10}
                  step={0.01}
                  value={scale}
                  onChange={setScale}
                  style={{ flex: 1 }}
                />
                <InputNumber
                  size="small"
                  min={0.01}
                  max={100}
                  step={0.1}
                  value={scale}
                  onChange={(v) => v && setScale(v)}
                  style={{ width: 80 }}
                />
              </div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                如果模型太大或太小，可以调整缩放比例。1 = 原始大小。
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
