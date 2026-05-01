import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Button, Input, Tree, Dropdown, Modal, message, Tooltip, Empty, Spin, Select, Upload, Descriptions,
} from 'antd'
import type { InputRef } from 'antd'
import {
  FolderOutlined, FolderOpenOutlined, FileOutlined,
  PlusOutlined, SaveOutlined, DeleteOutlined, EditOutlined,
  ExclamationCircleOutlined, FolderAddOutlined,
  CopyOutlined, DragOutlined, ExportOutlined, ImportOutlined,
  InboxOutlined, CheckOutlined, ReloadOutlined,
} from '@ant-design/icons'
import type { TreeDataNode } from 'antd'
import { useStore } from '../../store/useStore'
import { directoryApi, modelApi, recentModelApi, modelVersionApi, type ModelVersionDTO } from '../../utils/api'
import { saveState } from '../../utils/storage'
import {
  exportModel,
  exportDirectory,
  readImportFile,
  prepareExportData,
  isDirectoryImportData,
  type ImportedModelData,
  type ImportedDirectoryData,
  type ImportedData,
  type ExportedModel,
} from '../../utils/exportImport'
import type { Directory, Model } from '../../types'
import { TerrainToolbar } from '../Terrain/TerrainToolbar'
import { MeasurementToolbar } from '../Measurement'

export function ProjectSidebar() {
  const {
    currentModelId, currentDirectoryId, dirty,
    buildings, location, dateTime,
    setBuildings, setLocation, setDateTime,
    setCurrentModelId, setCurrentDirectoryId,
    setDirty, setDirectories, directories,
    setCanvasSize, setShowGrid, setGridDivisions, setTerrainData,
    terrainEditor, setTerrainEditor,
    measurementTool,
  } = useStore()

  const [models, setModels] = useState<Record<string, Model[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'tree' | 'recent'>('tree')

  // Rename state
  const [renaming, setRenaming] = useState<{ type: 'dir' | 'model'; id: string } | null>(null)
  const renameInputRef = useRef<InputRef>(null)
  const composingRef = useRef(false)
  const renameTimeoutRef = useRef<number | null>(null)

  // Move modal state
  const [moveModal, setMoveModal] = useState<{ type: 'model'; id: string; currentDirId: string } | null>(null)
  const [moveTargetDirId, setMoveTargetDirId] = useState<string | null>(null)

  // Recent models
  const [recentModels, setRecentModels] = useState<Model[]>([])
  const [recentLoading, setRecentLoading] = useState(true)

  // Import modal state
  const [importModal, setImportModal] = useState<{
    open: boolean
    file: File | null
    parsed: ImportedData | null
    loading: boolean
    targetDirId: string | null
  }>({
    open: false,
    file: null,
    parsed: null,
    loading: false,
    targetDirId: null,
  })

  // History versions modal state
  const [historyModal, setHistoryModal] = useState<{
    open: boolean
    modelId: string | null
    modelName: string
    versions: ModelVersionDTO[]
    loading: boolean
  }>({
    open: false,
    modelId: null,
    modelName: '',
    versions: [],
    loading: false,
  })

  // 加载最近打开的模型详情
  const loadRecentModels = useCallback(async () => {
    setRecentLoading(true)
    try {
      console.log('[recent] loading...')
      const list = await recentModelApi.list(20)
      console.log('[recent] loaded:', list.length, list.map(m => m.name))
      setRecentModels(list)
    } catch (e) {
      console.error('[recent] error:', e)
      setRecentModels([])
    } finally {
      setRecentLoading(false)
    }
  }, [])

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

  useEffect(() => {
    loadRecentModels()
  }, [loadRecentModels])

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
    if (model.canvas_size !== undefined) setCanvasSize(model.canvas_size)
    if (model.show_grid !== undefined) setShowGrid(model.show_grid)
    if (model.grid_divisions !== undefined) setGridDivisions(model.grid_divisions)
    if (model.terrain_data) {
      setTerrainData({
        ...model.terrain_data,
        heights: new Float32Array(model.terrain_data.heights),
      })
    } else {
      setTerrainData(null)
    }
    setCurrentModelId(model.id)
    setCurrentDirectoryId(model.directory_id)
    setDirty(false)
    // 记录到后端最近打开
    recentModelApi.record(model.id).catch(() => {})
    // 本地记录 lastModelId
    saveState({ lastModelId: model.id })
  }, [setBuildings, setLocation, setDateTime, setCanvasSize, setShowGrid, setGridDivisions, setTerrainData, setCurrentModelId, setCurrentDirectoryId, setDirty])

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

  const handleCancelRename = () => {
    if (renameTimeoutRef.current) {
      clearTimeout(renameTimeoutRef.current)
      renameTimeoutRef.current = null
    }
    setRenaming(null)
  }

  // 双击模型重命名
  const handleModelDblClick = (id: string) => {
    setRenaming({ type: 'model', id })
    renameTimeoutRef.current = setTimeout(() => {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
      renameTimeoutRef.current = null
    }, 50)
  }

  // ─── Copy / Move operations ─────────────────────────────

  const handleCopyDirectory = async (dir: Directory) => {
    try {
      await directoryApi.copy(dir.id)
      await fetchDirectories()
      message.success('目录已复制')
    } catch (err: any) {
      message.error('复制目录失败: ' + err.message)
    }
  }

  const handleCopyModel = async (model: Model) => {
    try {
      await modelApi.copy(model.id)
      await fetchDirectories()
      message.success('模型已复制')
    } catch (err: any) {
      message.error('复制模型失败: ' + err.message)
    }
  }

  // ─── History versions operations ────────────────────────

  const handleOpenHistoryModal = async (model: Model) => {
    setHistoryModal({
      open: true,
      modelId: model.id,
      modelName: model.name,
      versions: [],
      loading: true,
    })

    try {
      const versions = await modelVersionApi.list(model.id)
      setHistoryModal(prev => ({
        ...prev,
        versions,
        loading: false,
      }))
    } catch (err: any) {
      message.error('加载历史版本失败: ' + err.message)
      setHistoryModal(prev => ({ ...prev, loading: false }))
    }
  }

  const handleRestoreVersion = async (versionId: string) => {
    if (!historyModal.modelId) return

    try {
      const model = await modelVersionApi.restore(historyModal.modelId, versionId)
      message.success('已回滚到历史版本')

      if (currentModelId === historyModal.modelId) {
        loadSceneFromModel(model)
      }

      await fetchDirectories()

      const versions = await modelVersionApi.list(historyModal.modelId)
      setHistoryModal(prev => ({ ...prev, versions }))
    } catch (err: any) {
      message.error('回滚失败: ' + err.message)
    }
  }

  const handleDeleteVersion = (version: ModelVersionDTO) => {
    Modal.confirm({
      title: '删除历史版本',
      icon: <ExclamationCircleOutlined />,
      content: `确定删除版本 v${version.version_number}？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        if (!historyModal.modelId) return
        try {
          await modelVersionApi.delete(historyModal.modelId, version.id)
          message.success('已删除')
          const versions = await modelVersionApi.list(historyModal.modelId)
          setHistoryModal(prev => ({ ...prev, versions }))
        } catch (err: any) {
          message.error('删除失败: ' + err.message)
        }
      },
    })
  }

  const handleMoveModelConfirm = async () => {
    if (!moveModal || !moveTargetDirId) return
    try {
      await modelApi.move(moveModal.id, moveTargetDirId)
      if (currentModelId === moveModal.id) {
        setCurrentDirectoryId(moveTargetDirId)
      }
      await fetchDirectories()
      setExpandedKeys(prev =>
        prev.includes(`dir-${moveTargetDirId}`) ? prev : [...prev, `dir-${moveTargetDirId}`]
      )
      message.success('模型已移动')
    } catch (err: any) {
      message.error('移动失败: ' + err.message)
    }
    setMoveModal(null)
    setMoveTargetDirId(null)
  }

  // ─── Model operations ──────────────────────────────────

  const handleCreateModel = async (dirId: string) => {
    try {
      const model = await modelApi.create(dirId, {
        name: '新建模型',
        location_lat: location.lat,
        location_lng: location.lng,
        city_name: location.cityName,
        date_time: dateTime.toISOString(),
      })
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
          recentModelApi.remove(model.id).catch(() => {})
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

  // ─── Export / Import ───────────────────────────────────

  const handleExportModel = useCallback(async (model: Model) => {
    try {
      let fullModel: Model = model

      if (!model.scene_data || model.scene_data.length === 0) {
        fullModel = await modelApi.get(model.id)
      }

      const { terrainData, canvasSize, showGrid, gridDivisions } = useStore.getState()

      exportModel(
        {
          name: fullModel.name,
          description: fullModel.description || '',
          location_lat: fullModel.location_lat,
          location_lng: fullModel.location_lng,
          city_name: fullModel.city_name,
          date_time: fullModel.date_time,
          scene_data: fullModel.scene_data || [],
        },
        terrainData,
        canvasSize,
        showGrid,
        gridDivisions
      )

      message.success('模型已导出')
    } catch (err: any) {
      message.error('导出失败: ' + err.message)
    }
  }, [])

  const handleExportDirectory = useCallback(async (dir: Directory) => {
    try {
      const dirModels = models[dir.id] || []

      if (dirModels.length === 0) {
        message.warning('该目录没有模型，无需导出')
        return
      }

      const exportedModels: ExportedModel[] = []

      for (const model of dirModels) {
        let fullModel: Model = model

        if (!model.scene_data || model.scene_data.length === 0) {
          fullModel = await modelApi.get(model.id)
        }

        const exported = prepareExportData(
          {
            name: fullModel.name,
            description: fullModel.description || '',
            location_lat: fullModel.location_lat,
            location_lng: fullModel.location_lng,
            city_name: fullModel.city_name,
            date_time: fullModel.date_time,
            scene_data: fullModel.scene_data || [],
            canvas_size: fullModel.canvas_size,
            show_grid: fullModel.show_grid,
            grid_divisions: fullModel.grid_divisions,
          },
          fullModel.terrain_data,
          fullModel.canvas_size,
          fullModel.show_grid,
          fullModel.grid_divisions
        )

        exportedModels.push(exported)
      }

      exportDirectory(dir.name, dir.description || '', exportedModels)
      message.success(`已导出目录「${dir.name}」，包含 ${exportedModels.length} 个模型`)
    } catch (err: any) {
      message.error('导出目录失败: ' + err.message)
    }
  }, [models])

  const handleOpenImportModal = () => {
    setImportModal({
      open: true,
      file: null,
      parsed: null,
      loading: false,
      targetDirId: currentDirectoryId || directories[0]?.id || null,
    })
  }

  const handleCloseImportModal = () => {
    setImportModal({
      open: false,
      file: null,
      parsed: null,
      loading: false,
      targetDirId: null,
    })
  }

  const handleImportFileSelect = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      message.error('请上传 .json 文件')
      return false
    }

    setImportModal(prev => ({ ...prev, loading: true, parsed: null }))

    try {
      const parsed = await readImportFile(file)
      setImportModal(prev => ({
        ...prev,
        file,
        parsed,
        loading: false,
      }))
      message.success('文件解析成功')
    } catch (err: any) {
      message.error('文件解析失败: ' + err.message)
      setImportModal(prev => ({ ...prev, loading: false }))
    }

    return false
  }

  const handleImportSingleModel = async (modelData: ImportedModelData, targetDirId: string, loadAfterImport = false) => {
    const newModel = await modelApi.create(targetDirId, {
      name: modelData.name,
      description: modelData.description,
      location_lat: modelData.location_lat,
      location_lng: modelData.location_lng,
      city_name: modelData.city_name,
      date_time: modelData.date_time,
      scene_data: modelData.scene_data,
    })

    if (modelData.terrain_data ||
        modelData.canvas_size !== undefined ||
        modelData.show_grid !== undefined ||
        modelData.grid_divisions !== undefined) {
      await modelApi.update(newModel.id, {
        canvas_size: modelData.canvas_size,
        show_grid: modelData.show_grid,
        grid_divisions: modelData.grid_divisions,
        terrain_data: modelData.terrain_data,
      })
    }

    if (loadAfterImport) {
      const updatedModel = await modelApi.get(newModel.id)
      loadSceneFromModel(updatedModel)
    }

    return newModel
  }

  const handleImportConfirm = async () => {
    if (!importModal.parsed) {
      message.warning('请先选择文件')
      return
    }

    try {
      if (isDirectoryImportData(importModal.parsed)) {
        const dirData = importModal.parsed as ImportedDirectoryData

        const newDir = await directoryApi.create(
          dirData.name,
          dirData.description || ''
        )

        let importedCount = 0
        for (const modelData of dirData.models) {
          try {
            await handleImportSingleModel(modelData, newDir.id, false)
            importedCount++
          } catch (err: any) {
            console.error(`导入模型「${modelData.name}」失败:`, err)
            message.warning(`模型「${modelData.name}」导入失败: ${err.message}`)
          }
        }

        await fetchDirectories()

        message.success(`目录「${dirData.name}」导入成功，共导入 ${importedCount}/${dirData.models.length} 个模型`)
        handleCloseImportModal()

        setExpandedKeys(prev => [...prev, `dir-${newDir.id}`])
      } else {
        if (!importModal.targetDirId) {
          message.warning('请选择目标目录')
          return
        }

        const modelData = importModal.parsed as ImportedModelData
        await handleImportSingleModel(modelData, importModal.targetDirId, true)

        await fetchDirectories()

        message.success('模型导入成功')
        handleCloseImportModal()
      }
    } catch (err: any) {
      message.error('导入失败: ' + err.message)
    }
  }

  // ─── Save ───────────────────────────────────────────────

  const handleSave = async () => {
    console.log('[ProjectSidebar] handleSave 开始')
    
    if (!currentModelId) {
      message.warning('请先选择或创建一个模型')
      console.log('[ProjectSidebar] 保存失败：没有 currentModelId')
      return
    }
    
    const { terrainData, canvasSize, showGrid, gridDivisions, dirty } = useStore.getState()
    console.log('[ProjectSidebar] 保存前的状态:', {
      currentModelId,
      dirty,
      terrainDataExists: !!terrainData,
      terrainDataDetails: terrainData ? {
        resolution: terrainData.resolution,
        heightsLength: terrainData.heights?.length,
        maxHeight: terrainData.maxHeight,
        sampleHeights: terrainData.heights ? Array.from(terrainData.heights.slice(0, 5)) : null
      } : null,
      canvasSize,
      showGrid,
      gridDivisions,
      buildingsCount: buildings.length
    })
    
    try {
      const terrainDataToSend = terrainData ? {
        resolution: terrainData.resolution,
        heights: Array.from(terrainData.heights),
        maxHeight: terrainData.maxHeight,
      } : null
      
      console.log('[ProjectSidebar] 准备发送的 terrain_data:', terrainDataToSend ? {
        resolution: terrainDataToSend.resolution,
        heightsLength: terrainDataToSend.heights?.length,
        maxHeight: terrainDataToSend.maxHeight,
        sampleHeights: terrainDataToSend.heights?.slice(0, 5)
      } : 'null')
      
      await modelApi.update(currentModelId, {
        scene_data: buildings,
        location_lat: location.lat,
        location_lng: location.lng,
        city_name: location.cityName,
        date_time: dateTime.toISOString(),
        canvas_size: canvasSize,
        show_grid: showGrid,
        grid_divisions: gridDivisions,
        terrain_data: terrainDataToSend,
      })
      
      console.log('[ProjectSidebar] 保存请求发送成功')
      setDirty(false)
      await fetchDirectories()
      message.success('已保存')
      console.log('[ProjectSidebar] handleSave 结束，保存成功')
    } catch (err: any) {
      console.error('[ProjectSidebar] 保存失败:', err)
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
        onKeyDown={e => {
          if (e.key === 'Escape') handleCancelRename()
          e.stopPropagation()
        }}
        onCompositionStart={() => { composingRef.current = true }}
        onCompositionEnd={() => { composingRef.current = false }}
        autoFocus
        style={{ width: 120 }}
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
            { key: 'copy', icon: <CopyOutlined />, label: '复制目录',
              onClick: () => handleCopyDirectory(dir) },
            { key: 'export', icon: <ExportOutlined />, label: '导出目录',
              onClick: () => handleExportDirectory(dir) },
            { type: 'divider' },
            { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true,
              onClick: () => handleDeleteDirectory(dir) },
          ],
        }}
        trigger={['contextMenu']}
      >
        <span
          style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}
        >
          {expandedKeys.includes(`dir-${dir.id}`)
            ? <FolderOpenOutlined style={{ color: '#faad14' }} />
            : <FolderOutlined style={{ color: '#faad14' }} />}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {dir.name}
          </span>
          <span style={{ color: '#999', fontSize: 11, flexShrink: 0 }}>
            {models[dir.id]?.length || 0}
          </span>
          <PlusOutlined
            style={{ color: '#999', fontSize: 12, flexShrink: 0, cursor: 'pointer', padding: '0 2px' }}
            onClick={(e) => { e.stopPropagation(); handleCreateModel(dir.id) }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#1677ff' }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#999' }}
          />
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
          onKeyDown={e => {
            if (e.key === 'Escape') handleCancelRename()
            e.stopPropagation()
          }}
          onCompositionStart={() => { composingRef.current = true }}
          onCompositionEnd={() => { composingRef.current = false }}
          autoFocus
          style={{ width: 120 }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <Dropdown
          menu={{
            items: [
              { key: 'rename', icon: <EditOutlined />, label: '重命名',
                onClick: () => { setRenaming({ type: 'model', id: model.id }) } },
              { key: 'copy', icon: <CopyOutlined />, label: '复制模型',
                onClick: () => handleCopyModel(model) },
              { key: 'move', icon: <DragOutlined />, label: '移动到…',
                disabled: directories.length < 2,
                onClick: () => {
                  setMoveTargetDirId(null)
                  setMoveModal({ type: 'model', id: model.id, currentDirId: model.directory_id })
                } },
              { key: 'export', icon: <ExportOutlined />, label: '导出模型',
                onClick: () => handleExportModel(model) },
              { key: 'history', icon: <ReloadOutlined />, label: '历史版本',
                onClick: () => handleOpenHistoryModal(model) },
              { type: 'divider' },
              { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true,
                onClick: () => handleDeleteModel(model) },
            ],
          }}
          trigger={['contextMenu']}
        >
          <span
            style={{
              display: 'flex', alignItems: 'center', gap: 4, width: '100%',
              fontWeight: currentModelId === model.id ? 600 : 400,
              color: currentModelId === model.id ? '#1677ff' : undefined,
            }}
            onDoubleClick={(e) => { e.stopPropagation(); handleModelDblClick(model.id) }}
          >
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
        borderBottom: '1px solid #e8e8e8',
      }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8' }}>
          {(['tree', 'recent'] as const).map(tab => (
            <div
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, textAlign: 'center', padding: '8px 0',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                color: activeTab === tab ? '#1677ff' : '#999',
                borderBottom: activeTab === tab ? '2px solid #1677ff' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {tab === 'tree' ? '项目' : '最近打开'}
            </div>
          ))}
        </div>
        {/* Actions bar (only show for tree tab) */}
        {activeTab === 'tree' && (
          <div style={{
            padding: '6px 8px 6px 12px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: '#666' }}>
              <FolderOutlined style={{ marginRight: 4 }} />{directories.length} 个目录
            </span>
            <div style={{ display: 'flex', gap: 2 }}>
              {dirty && currentModelId && (
                <Tooltip title="保存 (Ctrl+S)">
                  <Button type="text" size="small" icon={<SaveOutlined />}
                    style={{ color: '#faad14' }} onClick={handleSave} />
                </Tooltip>
              )}
              <Tooltip title="导入模型">
                <Button type="text" size="small" icon={<ImportOutlined />}
                  onClick={handleOpenImportModal} />
              </Tooltip>
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
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {activeTab === 'tree' ? (
          loading ? (
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
          )
        ) : (
          // Recent models tab
          recentLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin size="small" /></div>
          ) : recentModels.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无最近打开的模型" style={{ padding: '40px 0' }} />
          ) : (
            <div style={{ padding: '0 8px' }}>
              {recentModels.map(model => (
                <div
                  key={model.id}
                  onClick={() => handleSelectModel(model.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                    background: currentModelId === model.id ? '#e6f4ff' : 'transparent',
                    marginBottom: 2,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (currentModelId !== model.id) (e.currentTarget.style.background = '#f0f0f0') }}
                  onMouseLeave={e => { if (currentModelId !== model.id) (e.currentTarget.style.background = 'transparent') }}
                >
                  <FileOutlined style={{ color: currentModelId === model.id ? '#1677ff' : '#8c8c8c' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: currentModelId === model.id ? 600 : 400,
                      color: currentModelId === model.id ? '#1677ff' : '#333',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {model.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                      {model.building_count || 0} 栋建筑 · {new Date((model as any).opened_at || model.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  {currentModelId === model.id && <span style={{ fontSize: 10, color: '#1677ff' }}>当前</span>}
                </div>
              ))}
            </div>
          )
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

      {/* 地貌编辑工具栏 - 显示在左侧边栏内 */}
      {terrainEditor.enabled && (
        <TerrainToolbar onReset={() => setTerrainEditor({ enabled: false })} />
      )}

      {/* 测量工具栏 - 显示在左侧边栏内 */}
      {measurementTool.enabled && (
        <MeasurementToolbar />
      )}

      {/* Move Modal */}
      <Modal
        title="移动模型"
        open={!!moveModal}
        onOk={handleMoveModelConfirm}
        onCancel={() => {
          setMoveModal(null)
          setMoveTargetDirId(null)
        }}
        okText="移动"
        cancelText="取消"
        okButtonProps={{ disabled: !moveTargetDirId || moveTargetDirId === moveModal?.currentDirId }}
      >
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>选择目标目录：</div>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择目录"
            value={moveTargetDirId}
            onChange={setMoveTargetDirId}
            options={directories
              .filter(d => d.id !== moveModal?.currentDirId)
              .map(d => ({
                value: d.id,
                label: `${d.name} (${models[d.id]?.length || 0} 个模型)`,
              }))}
          />
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        title={
          importModal.parsed && isDirectoryImportData(importModal.parsed)
            ? '📥 导入目录'
            : '📥 导入模型'
        }
        open={importModal.open}
        onCancel={handleCloseImportModal}
        width={600}
        footer={
          importModal.parsed ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {!isDirectoryImportData(importModal.parsed) && (
                  <Select
                    placeholder="选择目标目录"
                    value={importModal.targetDirId}
                    onChange={(v) => setImportModal(prev => ({ ...prev, targetDirId: v }))}
                    style={{ width: 200 }}
                    options={directories.map(d => ({
                      value: d.id,
                      label: `${d.name} (${models[d.id]?.length || 0} 个模型)`,
                    }))}
                  />
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Upload
                  accept=".json"
                  showUploadList={false}
                  beforeUpload={handleImportFileSelect}
                >
                  <Button icon={<ReloadOutlined />}>重新选择文件</Button>
                </Upload>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleImportConfirm}
                  disabled={
                    !isDirectoryImportData(importModal.parsed) && !importModal.targetDirId
                  }
                >
                  {isDirectoryImportData(importModal.parsed) ? '导入目录' : '导入模型'}
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {!importModal.parsed ? (
          <div>
            <Upload.Dragger
              accept=".json"
              showUploadList={false}
              beforeUpload={handleImportFileSelect}
              disabled={importModal.loading}
              style={{ padding: '20px 0' }}
            >
              {importModal.loading ? (
                <div style={{ padding: '20px 0' }}>
                  <Spin size="large" />
                  <p style={{ marginTop: 12, color: '#999' }}>正在解析文件...</p>
                </div>
              ) : (
                <>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽上传模型导出文件</p>
                  <p className="ant-upload-hint">
                    支持 .json 格式，即通过「导出模型」功能生成的文件
                  </p>
                </>
              )}
            </Upload.Dragger>

            <div style={{ marginTop: 16, padding: '12px 16px', background: '#f6f8fa', borderRadius: 8, fontSize: 12, color: '#666' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>💡 提示</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>导入的文件必须是通过本系统「导出模型」功能生成的 JSON 文件</li>
                <li>导入后会在目标目录下创建一个新模型</li>
                <li>GLB 模型文件不会随模型导出，导入后需要重新上传</li>
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
                ✅ 文件已解析
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                {importModal.file?.name}
              </div>
            </div>

            {isDirectoryImportData(importModal.parsed) ? (
              <div>
                <Descriptions bordered size="small" column={2} title="目录信息">
                  <Descriptions.Item label="目录名称">
                    {(importModal.parsed as ImportedDirectoryData).name}
                  </Descriptions.Item>
                  <Descriptions.Item label="模型数量">
                    {(importModal.parsed as ImportedDirectoryData).model_count} 个
                  </Descriptions.Item>
                  {(importModal.parsed as ImportedDirectoryData).description && (
                    <Descriptions.Item label="描述" span={2}>
                      {(importModal.parsed as ImportedDirectoryData).description}
                    </Descriptions.Item>
                  )}
                </Descriptions>

                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>包含的模型：</div>
                  <div style={{
                    maxHeight: 200,
                    overflow: 'auto',
                    border: '1px solid #f0f0f0',
                    borderRadius: 6,
                  }}>
                    {(importModal.parsed as ImportedDirectoryData).models.map((m, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '8px 12px',
                          borderBottom: index < (importModal.parsed as ImportedDirectoryData).models.length - 1 ? '1px solid #f0f0f0' : 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileOutlined style={{ color: '#8c8c8c' }} />
                          <span>{m.name}</span>
                        </span>
                        <span style={{ color: '#999', fontSize: 12 }}>
                          {m.scene_data?.length || 0} 栋建筑
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 16, padding: '12px 16px', background: '#f6f8fa', borderRadius: 8, fontSize: 12, color: '#666' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>💡 提示</div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    <li>导入后会创建一个新目录「{(importModal.parsed as ImportedDirectoryData).name}」</li>
                    <li>所有模型将被导入到新创建的目录中</li>
                    <li>GLB 模型文件不会随模型导出，导入后需要重新上传</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div>
                <Descriptions bordered size="small" column={2} title="模型信息">
                  <Descriptions.Item label="模型名称">
                    {(importModal.parsed as ImportedModelData).name}
                  </Descriptions.Item>
                  <Descriptions.Item label="建筑数量">
                    {(importModal.parsed as ImportedModelData).scene_data?.length || 0} 栋
                  </Descriptions.Item>
                  <Descriptions.Item label="城市">
                    {(importModal.parsed as ImportedModelData).city_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="坐标">
                    {(importModal.parsed as ImportedModelData).location_lat.toFixed(4)}, {(importModal.parsed as ImportedModelData).location_lng.toFixed(4)}
                  </Descriptions.Item>
                  {(importModal.parsed as ImportedModelData).description && (
                    <Descriptions.Item label="描述" span={2}>
                      {(importModal.parsed as ImportedModelData).description}
                    </Descriptions.Item>
                  )}
                  {(importModal.parsed as ImportedModelData).canvas_size !== undefined && (
                    <Descriptions.Item label="画布尺寸">
                      {(importModal.parsed as ImportedModelData).canvas_size} 米
                    </Descriptions.Item>
                  )}
                  {(importModal.parsed as ImportedModelData).terrain_data && (
                    <Descriptions.Item label="地形数据">
                      有 ({(importModal.parsed as ImportedModelData).terrain_data!.resolution}×{(importModal.parsed as ImportedModelData).terrain_data!.resolution})
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* History Versions Modal */}
      <Modal
        title={`📜 历史版本 - ${historyModal.modelName}`}
        open={historyModal.open}
        onCancel={() => setHistoryModal(prev => ({ ...prev, open: false }))}
        width={700}
        footer={null}
      >
        {historyModal.loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <p style={{ marginTop: 12, color: '#999' }}>正在加载历史版本...</p>
          </div>
        ) : historyModal.versions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无历史版本"
            style={{ padding: '40px 0' }}
          >
            <div style={{ fontSize: 12, color: '#999' }}>
              每次保存模型时会自动创建历史版本快照
            </div>
          </Empty>
        ) : (
          <div style={{ maxHeight: 500, overflow: 'auto' }}>
            {historyModal.versions.map((version, index) => (
              <div
                key={version.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: index < historyModal.versions.length - 1 ? '1px solid #f0f0f0' : 'none',
                  borderRadius: 6,
                  marginBottom: 4,
                  background: index === 0 ? '#f6ffed' : '#fafafa',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: index === 0 ? '#52c41a' : '#333',
                    }}>
                      v{version.version_number}
                    </span>
                    {index === 0 && (
                      <span style={{
                        fontSize: 10,
                        padding: '0 6px',
                        background: '#52c41a',
                        color: '#fff',
                        borderRadius: 4,
                      }}>
                        最新
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      onClick={() => handleRestoreVersion(version.id)}
                    >
                      回滚到此版本
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={() => handleDeleteVersion(version)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  gap: 16,
                  fontSize: 12,
                  color: '#999',
                  flexWrap: 'wrap',
                }}>
                  <span>📅 {new Date(version.created_at).toLocaleString()}</span>
                  <span>🏢 {version.building_count} 栋建筑</span>
                  {version.name && <span>📝 {version.name}</span>}
                  <span>📍 {version.city_name}</span>
                  <span>📐 {version.canvas_size}m</span>
                  {version.terrain_data && <span>🗺️ 有地形</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{
          marginTop: 16,
          padding: '12px 16px',
          background: '#f6f8fa',
          borderRadius: 8,
          fontSize: 12,
          color: '#666',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>💡 提示</div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>每次保存模型时会自动创建一个新的历史版本</li>
            <li>回滚到旧版本前，会自动将当前状态保存为新版本</li>
            <li>删除历史版本不会影响当前模型状态</li>
          </ul>
        </div>
      </Modal>
    </div>
  )
}
