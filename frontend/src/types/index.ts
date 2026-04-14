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
  // 画布设置（与模型绑定）
  canvas_size?: number  // 画布尺寸（默认 2000）
  show_grid?: boolean  // 是否显示网格（默认 true）
  grid_divisions?: number  // 网格分割数（默认 200）
  sort_order: number
  created_at: string
  updated_at: string
}

// ─── App State ────────────────────────────────────────────

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
}
