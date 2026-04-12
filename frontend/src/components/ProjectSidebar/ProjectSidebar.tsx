import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Button, Input, Tree, Dropdown, Modal, message, Tooltip, Empty, Spin,
} from 'antd'
import type { InputRef } from 'antd'
import {
  FolderOutlined, FolderOpenOutlined, FileOutlined,
  PlusOutlined, SaveOutlined, DeleteOutlined, EditOutlined,
  ExclamationCircleOutlined, FolderAddOutlined,
} from '@ant-design/icons'
import type { TreeDataNode } from 'antd'
import { useStore } from '../../store/useStore'
import { directoryApi, modelApi } from '../../utils/api'
import type { Directory, Model } from '../../types'

export function ProjectSidebar() {
  const {
    currentModelId, currentDirectoryId, dirty,
    buildings, location, dateTime,
    setBuildings, setLocation, setDateTime,
    setCurrentModelId, setCurrentDirectoryId,
    setDirty, setDirectories, directories,
  } = useStore()

  const [models, setModels] = useState<Record<string, Model[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState(false)

  // Rename state
  const [renaming, setRenaming] = useState<{ type: 'dir' | 'model'; id: string } | null>(null)
  const renameInputRef = useRef<InputRef>(null)
  const composingRef = useRef(false)

  // ─── Data fetching ──────────────────────────────────────

  const fetchDirectories = useCallback(async () => {
    try {
      const dirs = await directoryApi.list()
      setDirectories(dirs)
      const modelMap: Record<string, Model[]> = {}
      await Promise.all(
        dirs.map(async (d) => {
          modelMap[d.id] = await modelApi.listByDirectory(d.id)
        })
      )
      setModels(modelMap)
    } catch (err: any) {
      message.error('加载项目数据失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [setDirectories])

  useEffect(() => {
    fetchDirectories()
  }, [fetchDirectories])

  // ─── Load scene from model ─────────────────────────────

  const loadSceneFromModel = useCallback((model: Model) => {
    setBuildings(model.scene_data || [])
    setLocation({
      lat: model.location_lat,
      lng: model.location_lng,
      cityName: model.city_name,
    })
    if (model.date_time) {
      setDateTime(new Date(model.date_time))
    }
    setCurrentModelId(model.id)
    setCurrentDirectoryId(model.directory_id)
    setDirty(false)
  }, [setBuildings, setLocation, setDateTime, setCurrentModelId, setCurrentDirectoryId, setDirty])

  // ─── Directory operations ───────────────────────────────

  const handleCreateDirectory = async () => {
    try {
      const dir = await directoryApi.create('新建目录')
      setDirectories([...directories, dir])
      setModels(prev => ({ ...prev, [dir.id]: [] }))
      setExpandedKeys(prev => [...prev, `dir-${dir.id}`])
      setRenaming({ type: 'dir', id: dir.id })
    } catch (err: any) {
      message.error('创建目录失败: ' + err.message)
    }
  }

  const handleDeleteDirectory = (dir: Directory) => {
    const modelCount = models[dir.id]?.length || 0
    Modal.confirm({
      title: '删除目录',
      icon: <ExclamationCircleOutlined />,
      content: `确定删除「${dir.name}」${modelCount > 0 ? `及其中的 ${modelCount} 个模型` : ''}？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await directoryApi.delete(dir.id)
          if (currentDirectoryId === dir.id) {
            setCurrentDirectoryId(null)
            setCurrentModelId(null)
            setBuildings([])
            setDirty(false)
          }
          await fetchDirectories()
          message.success('已删除')
        } catch (err: any) {
          message.error('删除失败: ' + err.message)
        }
      },
    })
  }

  const handleRenameConfirm = async () => {
    if (!renaming) return
    const value = renameInputRef.current?.input?.value?.trim()
    if (!value) {
      setRenaming(null)
      return
    }
    try {
      if (renaming.type === 'dir') {
        await directoryApi.update(renaming.id, { name: value })
      } else {
        await modelApi.update(renaming.id, { name: value })
      }
      await fetchDirectories()
    } catch (err: any) {
      message.error('重命名失败: ' + err.message)
    }
    setRenaming(null)
  }

  // ─── Model operations ──────────────────────────────────

  const handleCreateModel = async (dirId: string) => {
    try {
      const model = await modelApi.create(dirId, { name: '新建模型' })
      setModels(prev => ({
        ...prev,
        [dirId]: [...(prev[dirId] || []), model],
      }))
      setExpandedKeys(prev =>
        prev.includes(`dir-${dirId}`) ? prev : [...prev, `dir-${dirId}`]
      )
      setRenaming({ type: 'model', id: model.id })
    } catch (err: any) {
      message.error('创建模型失败: ' + err.message)
    }
  }

  const handleDeleteModel = (model: Model) => {
    Modal.confirm({
      title: '删除模型',
      icon: <ExclamationCircleOutlined />,
      content: `确定删除「${model.name}」？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await modelApi.delete(model.id)
          if (currentModelId === model.id) {
            setCurrentModelId(null)
            setCurrentDirectoryId(null)
            setBuildings([])
            setDirty(false)
          }
          await fetchDirectories()
          message.success('已删除')
        } catch (err: any) {
          message.error('删除失败: ' + err.message)
        }
      },
    })
  }

  const handleSelectModel = async (modelId: string) => {
    if (modelId === currentModelId) return

    if (dirty && currentModelId) {
      Modal.confirm({
        title: '保存更改',
        content: '当前模型有未保存的更改，是否保存？',
        okText: '保存',
        cancelText: '不保存',
        onOk: async () => {
          await handleSave()
          const model = await modelApi.get(modelId)
          loadSceneFromModel(model)
        },
        onCancel: async () => {
          const model = await modelApi.get(modelId)
          loadSceneFromModel(model)
        },
      })
      return
    }

    try {
      const model = await modelApi.get(modelId)
      loadSceneFromModel(model)
    } catch (err: any) {
      message.error('加载模型失败: ' + err.message)
    }
  }

  // ─── Save ───────────────────────────────────────────────

  const handleSave = async () => {
    if (!currentModelId) {
      message.warning('请先选择或创建一个模型')
      return
    }
    try {
      await modelApi.update(currentModelId, {
        scene_data: buildings,
        location_lat: location.lat,
        location_lng: location.lng,
        city_name: location.cityName,
        date_time: dateTime.toISOString(),
      })
      setDirty(false)
      await fetchDirectories()
      message.success('已保存')
    } catch (err: any) {
      message.error('保存失败: ' + err.message)
    }
  }

  // ─── Ctrl+S shortcut ───────────────────────────────────

  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveRef.current()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ─── Build tree data ───────────────────────────────────

  const treeData: TreeDataNode[] = directories.map(dir => ({
    key: `dir-${dir.id}`,
    title: renaming?.type === 'dir' && renaming.id === dir.id ? (
      <Input
        ref={renameInputRef}
        size="small"
        defaultValue={dir.name}
        onBlur={handleRenameConfirm}
        onPressEnter={() => { if (!composingRef.current) handleRenameConfirm() }}
        onCompositionStart={() => { composingRef.current = true }}
        onCompositionEnd={() => { composingRef.current = false }}
        onKeyDown={e => e.stopPropagation()}
        autoFocus
        style={{ width: 130 }}
        onClick={e => e.stopPropagation()}
      />
    ) : (
      <Dropdown
        menu={{
          items: [
            { key: 'new-model', icon: <PlusOutlined />, label: '新建模型',
              onClick: () => handleCreateModel(dir.id) },
            { key: 'rename', icon: <EditOutlined />, label: '重命名',
              onClick: () => { setRenaming({ type: 'dir', id: dir.id }) } },
            { type: 'divider' },
            { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true,
              onClick: () => handleDeleteDirectory(dir) },
          ],
        }}
        trigger={['contextMenu']}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
          {expandedKeys.includes(`dir-${dir.id}`)
            ? <FolderOpenOutlined style={{ color: '#faad14' }} />
            : <FolderOutlined style={{ color: '#faad14' }} />}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {dir.name}
          </span>
          <span style={{ color: '#999', fontSize: 11, flexShrink: 0 }}>
            {models[dir.id]?.length || 0}
          </span>
        </span>
      </Dropdown>
    ),
    icon: null,
    children: (models[dir.id] || []).map(model => ({
      key: `model-${model.id}`,
      title: renaming?.type === 'model' && renaming.id === model.id ? (
        <Input
          ref={renameInputRef}
          size="small"
          defaultValue={model.name}
          onBlur={handleRenameConfirm}
          onPressEnter={() => { if (!composingRef.current) handleRenameConfirm() }}
          onCompositionStart={() => { composingRef.current = true }}
          onCompositionEnd={() => { composingRef.current = false }}
          onKeyDown={e => e.stopPropagation()}
          autoFocus
          style={{ width: 130 }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <Dropdown
          menu={{
            items: [
              { key: 'rename', icon: <EditOutlined />, label: '重命名',
                onClick: () => { setRenaming({ type: 'model', id: model.id }) } },
              { type: 'divider' },
              { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true,
                onClick: () => handleDeleteModel(model) },
            ],
          }}
          trigger={['contextMenu']}
        >
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4, width: '100%',
            fontWeight: currentModelId === model.id ? 600 : 400,
            color: currentModelId === model.id ? '#1677ff' : undefined,
          }}>
            <FileOutlined style={{ color: currentModelId === model.id ? '#1677ff' : '#8c8c8c' }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {model.name}
            </span>
            {model.building_count > 0 && (
              <span style={{ color: '#bbb', fontSize: 10, flexShrink: 0 }}>
                {model.building_count}栋
              </span>
            )}
          </span>
        </Dropdown>
      ),
      icon: null,
      isLeaf: true,
    })),
  }))

  // ─── Collapsed view ────────────────────────────────────

  if (collapsed) {
    return (
      <div style={{
        width: 36, background: '#fafafa', borderRight: '1px solid #e8e8e8',
        display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 8,
      }}>
        <Tooltip title="展开项目面板" placement="right">
          <Button type="text" size="small" icon={<FolderOutlined />}
            onClick={() => setCollapsed(false)} />
        </Tooltip>
        {dirty && currentModelId && (
          <Tooltip title="保存 (Ctrl+S)" placement="right">
            <Button type="text" size="small" icon={<SaveOutlined />}
              style={{ color: '#faad14' }} onClick={handleSave} />
          </Tooltip>
        )}
      </div>
    )
  }

  // ─── Full render ────────────────────────────────────────

  return (
    <div style={{
      width: 240, background: '#fafafa', borderRight: '1px solid #e8e8e8',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      userSelect: 'none', flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 8px 8px 12px', fontWeight: 600, fontSize: 13,
        borderBottom: '1px solid #e8e8e8',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FolderOutlined /> 项目
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          {dirty && currentModelId && (
            <Tooltip title="保存 (Ctrl+S)">
              <Button type="text" size="small" icon={<SaveOutlined />}
                style={{ color: '#faad14' }} onClick={handleSave} />
            </Tooltip>
          )}
          <Tooltip title="新建目录">
            <Button type="text" size="small" icon={<FolderAddOutlined />}
              onClick={handleCreateDirectory} />
          </Tooltip>
          <Button type="text" size="small"
            onClick={() => setCollapsed(true)}
            style={{ fontSize: 16, lineHeight: 1 }}>
            ‹
          </Button>
        </div>
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin size="small" /></div>
        ) : directories.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无项目"
            style={{ padding: '40px 0' }}
          >
            <Button type="primary" size="small" icon={<FolderAddOutlined />}
              onClick={handleCreateDirectory}>
              新建目录
            </Button>
          </Empty>
        ) : (
          <Tree
            treeData={treeData}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys as string[])}
            onSelect={(keys) => {
              const key = keys[0] as string
              if (!key) return
              if (key.startsWith('model-')) {
                handleSelectModel(key.replace('model-', ''))
              }
            }}
            selectedKeys={currentModelId ? [`model-${currentModelId}`] : []}
            showIcon={false}
            blockNode
            style={{ background: 'transparent' }}
          />
        )}
      </div>

      {/* Status bar */}
      {currentModelId && (
        <div style={{
          padding: '6px 12px', borderTop: '1px solid #e8e8e8',
          fontSize: 11, color: '#999', display: 'flex', justifyContent: 'space-between',
        }}>
          <span>{buildings.length} 栋建筑</span>
          {dirty && <span style={{ color: '#faad14' }}>● 未保存</span>}
        </div>
      )}
    </div>
  )
}
