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

export interface Building {
  id: string
  name: string
  type: BuildingType
  params: Record<string, number>
  position: [x: number, z: number]
  rotation: number
  color: string
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
  selectedBuildingId: string | null
  selectBuilding: (id: string | null) => void
  editorOpen: boolean
  setEditorOpen: (v: boolean) => void
  isDragging: boolean
  setDragging: (v: boolean) => void
  playback: PlaybackState
  setPlayback: (p: Partial<PlaybackState>) => void
  showGrid: boolean
  setShowGrid: (v: boolean) => void
  showGrid: boolean
  setShowGrid: (v: boolean) => void

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
