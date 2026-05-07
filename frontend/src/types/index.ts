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
  | 'glb'
  | 'girder-bridge'
  | 'arch-bridge'
  | 'suspension-bridge'
  | 'cable-stayed-bridge'
  | 'basketball-court'
  | 'football-field'
  | 'tennis-court'
  | 'gymnasium'
  // ─── 车辆类型 ──────────────────────────────────────────────
  | 'car'
  | 'suv'
  | 'van'
  | 'truck'
  | 'bus'
  | 'city-bus'
  | 'train'
  // ─── 船舶类型 ──────────────────────────────────────────────
  | 'cargo-ship'
  | 'container-ship'
  | 'cruise-ship'
  | 'pleasure-boat'
  // ─── 交通设施类型 ──────────────────────────────────────────────
  | 'traffic-light'
  | 'street-sign'
  | 'street-lamp'

export type RoadMode = 'straight' | 'curve' | 'freehand'

export type RoadHeightMode = 'follow-terrain' | 'elevated'

export type LaneLineType = 'solid' | 'dashed' | 'double-yellow' | 'white-edge'

export interface RoadLaneConfig {
  laneCount: number
  laneWidth: number
  centerLineType: LaneLineType
  laneDividerType: LaneLineType
  edgeLineType: LaneLineType
  dashedLineLength: number
  dashedLineGap: number
  showLaneLines: boolean
}

export interface Building {
  id: string
  name: string
  type: BuildingType
  params: Record<string, number>
  position: [x: number, z: number]
  rotation: number
  color: string
  baseHeight?: number
  glbUrl?: string
  glbScale?: number
  roadMode?: RoadMode
  roadHeightMode?: RoadHeightMode
  roadElevation?: number
  roadPathPoints?: Array<{ x: number; z: number }>
  roadCurveTension?: number
  roadLaneConfig?: RoadLaneConfig
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

export type TerrainBrushMode = 'raise' | 'lower' | 'smooth' | 'flatten' | 'water' | 'color'

export interface TerrainData {
  /** 高度图分辨率（如 64, 128, 256） */
  resolution: number
  /** 高度数据，一维数组按行存储 [row * resolution + col] */
  heights: Float32Array | number[]
  /** 最大高度（米） */
  maxHeight: number
  /** 水标记，0=不是水，1=是水（笔刷绘制的湖泊区域） */
  waterMask?: Uint8Array | number[]
  /** 颜色数据，存储每个顶点的 RGB 颜色值，格式：[r, g, b, r, g, b, ...]，每个通道值范围 0-1 */
  colorData?: Float32Array | number[]
}

export type TerrainColorType = 0 | 1 | 2 | 3 | 4

export interface TerrainEditorState {
  /** 是否处于地形编辑模式 */
  enabled: boolean
  /** 笔刷模式 */
  brushMode: TerrainBrushMode
  /** 笔刷半径（世界单位） */
  brushRadius: number
  /** 笔刷强度（每次绘制增加/减少的高度） */
  brushStrength: number
  /** 笔刷最大高度限制（提升地形时的最大高度） */
  brushMaxHeight: number
  /** 笔刷位置（世界坐标） */
  brushPosition: [number, number] | null
  /** 是否正在绘制 */
  isDrawing: boolean
  /** 撤销栈 */
  undoStack: TerrainData[]
  /** 重做栈 */
  redoStack: TerrainData[]
  /** 当前选择的地貌颜色类型 (0=默认, 1=森林, 2=雪山, 3=岩石, 4=草地) */
  brushColorType: TerrainColorType
}

// ─── Lake Types ────────────────────────────────────────────

export interface LakeState {
  /** 是否启用湖泊 */
  enabled: boolean
  /** 水位高度（相对于0平面，负值表示低于地面） */
  waterLevel: number
  /** 水的颜色 */
  waterColor: string
  /** 波浪高度 */
  waveHeight: number
  /** 不透明度 */
  opacity: number
}

/** 一个被水填充的区域（湖泊/池塘） */
export interface LakeRegion {
  /** 区域ID */
  id: string
  /** 该区域所有被水覆盖的网格点索引 */
  indices: number[]
  /** 边界顶点（用于生成网格） */
  boundary: [number, number][]
  /** 水位高度 */
  waterLevel: number
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
  /** 湖泊数据 */
  lake_data?: LakeState
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

// ─── Annotation Types ─────────────────────────────────────

export type AnnotationMode = 'text' | 'dimension' | 'arrow'

export type AnnotationColor = '#1677ff' | '#52c41a' | '#fa8c16' | '#ff4d4f' | '#722ed1' | '#13c2c2'

export interface Annotation {
  id: string
  mode: AnnotationMode
  position: [x: number, z: number]
  yOffset: number
  rotation: number
  scale: number
  color: AnnotationColor
  text?: string
  fontSize?: number
  dimensionStart?: [x: number, z: number]
  dimensionEnd?: [x: number, z: number]
  arrowDirection?: number
  arrowLength?: number
  createdAt: Date
}

export interface AnnotationToolState {
  enabled: boolean
  mode: AnnotationMode
  annotations: Annotation[]
  selectedAnnotationId: string | null
  isDrawing: boolean
  currentPosition: [number, number] | null
  temporaryAnnotation: Partial<Annotation> | null
  color: AnnotationColor
  fontSize: number
}

export interface RoadEditorState {
  enabled: boolean
  roadWidth: number
  roadElevation: number
  roadHeightMode: RoadHeightMode
  roadMode: RoadMode
  curveTension: number
  previewPoints: Array<{ x: number; z: number }>
  isDrawing: boolean
  laneConfig: RoadLaneConfig
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
  name?: string
  baseHeight?: number
  glbUrl?: string
  glbScale?: number
}

export interface BuildingTemplate {
  id: string
  name: string
  category: string
  description: string
  icon: string
  buildings: TemplateBuilding[]
}

export interface CustomTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: string
  source_model_ids: string[]
  buildings: TemplateBuilding[]
  sort_order: number
  created_at: string
  updated_at: string
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

export interface CustomTemplateState {
  templates: CustomTemplate[]
  refreshTrigger: number
}

export type ShadowHeatmapMode = 'day' | 'year'

export interface ShadowHeatmapGridPoint {
  x: number
  z: number
  shadowMinutes: number
  totalMinutes: number
}

export interface ShadowHeatmapResult {
  mode: ShadowHeatmapMode
  gridSize: number
  gridPoints: ShadowHeatmapGridPoint[]
  maxShadowMinutes: number
  minShadowMinutes: number
  generatedAt: Date
}

export interface ShadowHeatmapState {
  enabled: boolean
  mode: ShadowHeatmapMode
  isGenerating: boolean
  result: ShadowHeatmapResult | null
  opacity: number
  gridResolution: number
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

  // Lake
  lake: LakeState
  setLake: (updates: Partial<LakeState>) => void
  lakeRegions: LakeRegion[]
  addLakeRegion: (region: LakeRegion) => void
  removeLakeRegion: (id: string) => void
  clearLakeRegions: () => void
  setLakeRegions: (regions: LakeRegion[]) => void

  // Shadow Analysis
  shadowAnalysisReport: ShadowAnalysisReport | null
  setShadowAnalysisReport: (report: ShadowAnalysisReport | null) => void
  isGeneratingReport: boolean
  setIsGeneratingReport: (v: boolean) => void

  // Shadow Heatmap
  shadowHeatmap: ShadowHeatmapState
  setShadowHeatmap: (updates: Partial<ShadowHeatmapState>) => void
  generateShadowHeatmap: (mode: ShadowHeatmapMode) => void
  clearShadowHeatmap: () => void

  // Measurement Tool
  measurementTool: MeasurementToolState
  setMeasurementTool: (updates: Partial<MeasurementToolState>) => void
  addMeasurementPoint: (point: MeasurementPoint) => void
  removeMeasurementPoint: (id: string) => void
  clearMeasurementPoints: () => void
  completeMeasurement: () => void
  clearMeasurementResults: () => void

  // Road Editor
  roadEditor: RoadEditorState
  setRoadEditor: (updates: Partial<RoadEditorState>) => void
  addRoadPreviewPoint: (point: { x: number; z: number }) => void
  completeRoad: () => void
  cancelRoadDrawing: () => void

  // Annotation Tool
  annotationTool: AnnotationToolState
  setAnnotationTool: (updates: Partial<AnnotationToolState>) => void
  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  removeAnnotation: (id: string) => void
  clearAnnotations: () => void
  selectAnnotation: (id: string | null) => void

  // Share Mode
  shareMode: ShareModeState
  setShareMode: (mode: Partial<ShareModeState>) => void

  // Custom Templates
  customTemplates: CustomTemplate[]
  setCustomTemplates: (templates: CustomTemplate[]) => void
  triggerCustomTemplateRefresh: () => void
  customTemplateRefreshTrigger: number
}
