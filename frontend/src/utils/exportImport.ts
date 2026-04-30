import type { Building, TerrainData, Model } from '../types'

/**
 * 模型导出格式 - 参考后端接口返回的格式
 * 可以直接用于导入而不报错
 */
export interface ExportedModel {
  name: string
  description: string
  location_lat: number
  location_lng: number
  city_name: string
  date_time: string
  canvas_size?: number
  show_grid?: boolean
  grid_divisions?: number
  building_count: number
  scene_data: Building[]
  terrain_data?: {
    resolution: number
    heights: number[]
    maxHeight: number
  }
  exported_at: string
  version: string
}

/**
 * 目录导出格式 - 包含目录信息和所有模型数据
 */
export interface ExportedDirectory {
  type: 'directory'
  name: string
  description: string
  model_count: number
  models: ExportedModel[]
  exported_at: string
  version: string
}

/**
 * 解析后的导入数据 - 可能是单个模型或目录
 */
export type ImportedData = ImportedModelData | ImportedDirectoryData

/**
 * 解析后的单个模型导入数据
 */
export interface ImportedModelData {
  type?: 'model'
  name: string
  description: string
  location_lat: number
  location_lng: number
  city_name: string
  date_time: string
  canvas_size?: number
  show_grid?: boolean
  grid_divisions?: number
  scene_data: Building[]
  terrain_data?: {
    resolution: number
    heights: number[]
    maxHeight: number
  }
}

/**
 * 解析后的目录导入数据
 */
export interface ImportedDirectoryData {
  type: 'directory'
  name: string
  description: string
  model_count: number
  models: ImportedModelData[]
}

const EXPORT_VERSION = '1.0'

/**
 * 准备导出数据 - 将模型数据转换为可导出的JSON格式
 */
export function prepareExportData(
  model: Partial<Model> & { name: string; location_lat: number; location_lng: number; city_name: string; date_time: string; scene_data: Building[] },
  terrainData?: TerrainData | null,
  canvasSize?: number,
  showGrid?: boolean,
  gridDivisions?: number
): ExportedModel {
  const exported: ExportedModel = {
    name: model.name,
    description: model.description || '',
    location_lat: model.location_lat,
    location_lng: model.location_lng,
    city_name: model.city_name,
    date_time: model.date_time,
    building_count: model.scene_data?.length || 0,
    scene_data: model.scene_data || [],
    exported_at: new Date().toISOString(),
    version: EXPORT_VERSION,
  }

  if (canvasSize !== undefined) {
    exported.canvas_size = canvasSize
  }
  if (showGrid !== undefined) {
    exported.show_grid = showGrid
  }
  if (gridDivisions !== undefined) {
    exported.grid_divisions = gridDivisions
  }

  if (terrainData && terrainData.heights) {
    exported.terrain_data = {
      resolution: terrainData.resolution,
      heights: Array.from(terrainData.heights),
      maxHeight: terrainData.maxHeight,
    }
  }

  return exported
}

/**
 * 准备目录导出数据
 */
export function prepareDirectoryExportData(
  dirName: string,
  dirDescription: string,
  models: ExportedModel[]
): ExportedDirectory {
  return {
    type: 'directory',
    name: dirName,
    description: dirDescription || '',
    model_count: models.length,
    models: models,
    exported_at: new Date().toISOString(),
    version: EXPORT_VERSION,
  }
}

/**
 * 导出模型为JSON文件并触发下载
 */
export function exportModel(
  model: Partial<Model> & { name: string; location_lat: number; location_lng: number; city_name: string; date_time: string; scene_data: Building[] },
  terrainData?: TerrainData | null,
  canvasSize?: number,
  showGrid?: boolean,
  gridDivisions?: number
): void {
  const exportData = prepareExportData(model, terrainData, canvasSize, showGrid, gridDivisions)
  const jsonStr = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${model.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 导出目录为JSON文件并触发下载
 */
export function exportDirectory(
  dirName: string,
  dirDescription: string,
  models: ExportedModel[]
): void {
  const exportData = prepareDirectoryExportData(dirName, dirDescription, models)
  const jsonStr = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${dirName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 验证单个模型导入数据的格式
 */
export function validateModelImportData(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: '无效的数据格式' }
  }

  if (!data.name || typeof data.name !== 'string') {
    return { valid: false, error: '缺少模型名称 (name)' }
  }

  if (typeof data.location_lat !== 'number' || typeof data.location_lng !== 'number') {
    return { valid: false, error: '缺少位置信息 (location_lat, location_lng)' }
  }

  if (!data.city_name || typeof data.city_name !== 'string') {
    return { valid: false, error: '缺少城市名称 (city_name)' }
  }

  if (!data.scene_data || !Array.isArray(data.scene_data)) {
    return { valid: false, error: '缺少场景数据 (scene_data)' }
  }

  return { valid: true }
}

/**
 * 验证目录导入数据的格式
 */
export function validateDirectoryImportData(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: '无效的数据格式' }
  }

  if (data.type !== 'directory') {
    return { valid: false, error: '不是目录导出格式' }
  }

  if (!data.name || typeof data.name !== 'string') {
    return { valid: false, error: '缺少目录名称 (name)' }
  }

  if (!data.models || !Array.isArray(data.models)) {
    return { valid: false, error: '缺少模型数据 (models)' }
  }

  for (let i = 0; i < data.models.length; i++) {
    const modelValidation = validateModelImportData(data.models[i])
    if (!modelValidation.valid) {
      return { valid: false, error: `第 ${i + 1} 个模型数据无效: ${modelValidation.error}` }
    }
  }

  return { valid: true }
}

/**
 * 验证导入数据的格式（兼容模型和目录）
 */
export function validateImportData(data: any): { valid: boolean; error?: string; isDirectory?: boolean } {
  if (data && data.type === 'directory') {
    const result = validateDirectoryImportData(data)
    return { ...result, isDirectory: true }
  }

  const result = validateModelImportData(data)
  return { ...result, isDirectory: false }
}

/**
 * 解析单个模型导入的JSON数据
 */
export function parseModelImportData(data: any): ImportedModelData {
  return {
    name: data.name,
    description: data.description || '',
    location_lat: data.location_lat,
    location_lng: data.location_lng,
    city_name: data.city_name,
    date_time: data.date_time || new Date().toISOString(),
    canvas_size: data.canvas_size,
    show_grid: data.show_grid,
    grid_divisions: data.grid_divisions,
    scene_data: data.scene_data || [],
    terrain_data: data.terrain_data,
  }
}

/**
 * 解析目录导入的JSON数据
 */
export function parseDirectoryImportData(data: any): ImportedDirectoryData {
  return {
    type: 'directory',
    name: data.name,
    description: data.description || '',
    model_count: data.model_count || data.models?.length || 0,
    models: (data.models || []).map((m: any) => parseModelImportData(m)),
  }
}

/**
 * 解析导入的JSON数据（兼容模型和目录）
 */
export function parseImportData(data: any): ImportedData {
  const validation = validateImportData(data)
  if (!validation.valid) {
    throw new Error(validation.error || '无效的导入文件')
  }

  if (validation.isDirectory) {
    return parseDirectoryImportData(data)
  }

  return parseModelImportData(data)
}

/**
 * 从文件读取导入数据（兼容模型和目录）
 */
export async function readImportFile(file: File): Promise<ImportedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        const parsed = parseImportData(data)
        resolve(parsed)
      } catch (err) {
        reject(err instanceof Error ? err : new Error('文件解析失败'))
      }
    }

    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }

    reader.readAsText(file)
  })
}

/**
 * 类型守卫：检查导入数据是否为目录类型
 */
export function isDirectoryImportData(data: ImportedData): data is ImportedDirectoryData {
  return 'type' in data && data.type === 'directory'
}
