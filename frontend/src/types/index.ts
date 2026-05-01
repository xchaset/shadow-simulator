export type BuildingType =
  | 'box'
  | 'cylinder'
  | 'prism'
  | 'l-shape'
  | 'u-shape'
  | 't-shape'
  | 'stepped'
  | 'podium-tower'
  | 'dome'
  | 'gable-roof'
  | 'road'
  | 'green-belt'
  | 'tree'
  | 'ai-circular'
  | 'ai-complex'
  | 'river'
  | 'glb'

export interface Building {
  id: string
  name: string
  type: BuildingType
  params: Record<string, number>
  position: [x: number, z: number]
  rotation: number
  color: string
  glbUrl?: string  // GLB 模型文件 URL（仅 type='glb' 时使用）
  glbScale?: number  // GLB 模型缩放比例（默认 1）
}

export interface Location {
  lat: number
  lng: number
  cityName: string
}

export interface SunData {
  azimuth: number
  altitude: number
  sunrise: Date
  sunset: Date
  isNight: boolean
}

export interface PlaybackState {
  playing: boolean
  speed: number
}

// ─── Terrain Types ────────────────────────────────────────

export type TerrainBrushMode = 'raise' | 'lower' | 'smooth' | 'flatten'

export interface TerrainData {
  /** 高度图分辨率（如 64, 128, 256） */
  resolution: number
  /** 高度数据，一维数组按行存储 [row * resolution + col] */
  heights: Float32Array | number[]
  /** 最大高度（米） */
  maxHeight: number
}

export interface TerrainEditorState {
  /** 是否处于地形编辑模式 */
  enabled: boolean
  /** 笔刷模式 */
  brushMode: TerrainBrushMode
  /** 笔刷半径（世界单位） */
  brushRadius: number
  /** 笔刷强度 */
  brushStrength: number
  /** 笔刷位置（世界坐标） */
  brushPosition: [number, number] | null
  /** 是否正在绘制 */
  isDrawing: boolean
  /** 撤销栈 */
  undoStack: TerrainData[]
  /** 重做栈 */
  redoStack: TerrainData[]
}

// ─── Project Types ────────────────────────────────────────

export interface Directory {
  id: string
  name: string
  description: string
  sort_order: number
  model_count?: number
  created_at: string
  updated_at: string
}

export interface Model {
  id: string
  directory_id: string
  name: string
  description: string
  location_lat: number
  location_lng: number
  city_name: string
  date_time: string
  building_count: number
  scene_data?: Building[]
  /** 地貌数据 */
  terrain_data?: TerrainData
  // 画布设置（与模型绑定）
  canvas_size?: number  // 画布尺寸（默认 2000）
  show_grid?: boolean  // 是否显示网格（默认 true）
  grid_divisions?: number  // 网格分割数（默认 200）
  sort_order: number
  created_at: string
  updated_at: string
}

// ─── Measurement Types ─────────────────────────────────────

export type MeasurementMode = 'distance' | 'area'

export interface MeasurementPoint {
  id: string
  position: [x: number, z: number]
  type: 'point' | 'building'
  buildingId?: string
  buildingName?: string
}

export interface MeasurementResult {
  id: string
  mode: MeasurementMode
  points: MeasurementPoint[]
  distance?: number
  area?: number
  createdAt: Date
}

export interface MeasurementToolState {
  enabled: boolean
  mode: MeasurementMode
  points: MeasurementPoint[]
  results: MeasurementResult[]
  isDrawing: boolean
}

// ─── App State ────────────────────────────────────────────

// ─── Shadow Analysis Types ────────────────────────────────

export interface SolarTerm {
  id: string
  name: string
  month: number
  day: number
  description: string
}

export interface DaylightAnalysisPoint {
  time: Date
  altitude: number
  azimuth: number
  isDaylight: boolean
}

export interface BuildingDaylightResult {
  buildingId: string
  buildingName: string
  totalDaylightMinutes: number
  daylightIntervals: Array<{
    start: Date
    end: Date
    durationMinutes: number
  }>
  hourlyData: Array<{
    hour: number
    daylightMinutes: number
  }>
}

export interface SolarTermDaylightAnalysis {
  solarTerm: SolarTerm
  date: Date
  sunrise: Date
  sunset: Date
  totalDaylightMinutes: number
  buildingResults: BuildingDaylightResult[]
}

export interface ShadowAnalysisReport {
  id: string
  generatedAt: Date
  location: Location
  buildingIds: string[]
  solarTermAnalyses: SolarTermDaylightAnalysis[]
  summary: {
    avgDaylightMinutes: number
    maxDaylightMinutes: number
    minDaylightMinutes: number
    bestSolarTerm: SolarTerm | null
    worstSolarTerm: SolarTerm | null
  }
}

export interface TemplateBuilding {
  type: BuildingType
  params: Record<string, number>
  position: [x: number, z: number]
  rotation: number
  color: string
}

export interface BuildingTemplate {
  id: string
  name: string
  category: string
  description: string
  icon: string
  buildings: TemplateBuilding[]
}

// ─── Share Types ──────────────────────────────────────────

export interface Share {
  id: string
  token: string
  model_id: string | null
  name: string
  description: string
  location_lat: number
  location_lng: number
  city_name: string
  date_time: string
  building_count: number
  scene_data?: Building[]
  canvas_size: number
  show_grid: boolean
  grid_divisions: number
  terrain_data?: { resolution: number; heights: number[]; maxHeight: number } | null
  expires_at: string | null
  view_count: number
  is_read_only: boolean
  created_at: string
}

export interface ShareModeState {
  isShareMode: boolean
  shareToken: string | null
  isReadOnly: boolean
  shareData: Share | null
}

export interface AppState {
  // Scene
  location: Location
  setLocation: (loc: Location) => void
  dateTime: Date
  setDateTime: (dt: Date) => void
  buildings: Building[]
  setBuildings: (buildings: Building[]) => void
  addBuilding: (b: Building) => void
  updateBuilding: (id: string, updates: Partial<Building>) => void
  removeBuilding: (id: string) => void
  removeBuildings: (ids: string[]) => void
  renameBuilding: (id: string, name: string) => void
  selectedBuildingId: string | null
  selectBuilding: (id: string | null) => void
  // 多选支持
  selectedBuildingIds: string[]
  selectBuildings: (ids: string[]) => void
  toggleBuildingSelection: (id: string) => void
  clearSelection: () => void
  editorOpen: boolean
  setEditorOpen: (v: boolean) => void
  isDragging: boolean
  setDragging: (v: boolean) => void
  // 框选状态
  isBoxSelecting: boolean
  setBoxSelecting: (v: boolean) => void
  boxSelectStart: [number, number] | null
  setBoxSelectStart: (pos: [number, number] | null) => void
  boxSelectEnd: [number, number] | null
  setBoxSelectEnd: (pos: [number, number] | null) => void
  playback: PlaybackState
  setPlayback: (p: Partial<PlaybackState>) => void
  // 画布设置（与模型绑定）
  canvasSize: number
  setCanvasSize: (size: number) => void
  showGrid: boolean
  setShowGrid: (v: boolean) => void
  gridDivisions: number
  setGridDivisions: (divs: number) => void

  // Project
  directories: Directory[]
  setDirectories: (dirs: Directory[]) => void
  models: Model[]
  setModels: (models: Model[] | ((prev: Model[]) => Model[])) => void
  currentDirectoryId: string | null
  setCurrentDirectoryId: (id: string | null) => void
  currentModelId: string | null
  setCurrentModelId: (id: string | null) => void
  dirty: boolean
  setDirty: (v: boolean) => void

  // Terrain
  terrainData: TerrainData | null
  setTerrainData: (data: TerrainData | null) => void
  terrainEditor: TerrainEditorState
  setTerrainEditor: (updates: Partial<TerrainEditorState>) => void
  pushTerrainUndo: () => void
  terrainUndo: () => void
  terrainRedo: () => void

  // Shadow Analysis
  shadowAnalysisReport: ShadowAnalysisReport | null
  setShadowAnalysisReport: (report: ShadowAnalysisReport | null) => void
  isGeneratingReport: boolean
  setIsGeneratingReport: (v: boolean) => void

  // Measurement Tool
  measurementTool: MeasurementToolState
  setMeasurementTool: (updates: Partial<MeasurementToolState>) => void
  addMeasurementPoint: (point: MeasurementPoint) => void
  removeMeasurementPoint: (id: string) => void
  clearMeasurementPoints: () => void
  completeMeasurement: () => void
  clearMeasurementResults: () => void

  // Share Mode
  shareMode: ShareModeState
  setShareMode: (mode: Partial<ShareModeState>) => void
}
