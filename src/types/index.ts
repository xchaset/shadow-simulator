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

export interface AppState {
  location: Location
  setLocation: (loc: Location) => void
  dateTime: Date
  setDateTime: (dt: Date) => void
  buildings: Building[]
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
}
