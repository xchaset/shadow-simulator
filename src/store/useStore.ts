import { create } from 'zustand'
import type { AppState, Building, Directory, Location, Model, PlaybackState } from '../types'

export const useStore = create<AppState>((set) => ({
  // ─── Scene State ────────────────────────────────────────

  location: { lat: 39.9042, lng: 116.4074, cityName: '北京' },
  setLocation: (loc: Location) => set({ location: loc }),

  dateTime: new Date(),
  setDateTime: (dt: Date) => set({ dateTime: dt }),

  buildings: [],
  setBuildings: (buildings: Building[]) => set({ buildings }),

  addBuilding: (b: Building) =>
    set(state => ({ buildings: [...state.buildings, b], dirty: true })),

  updateBuilding: (id: string, updates: Partial<Building>) =>
    set(state => ({
      buildings: state.buildings.map(b =>
        b.id === id ? { ...b, ...updates } : b,
      ),
      dirty: true,
    })),

  removeBuilding: (id: string) =>
    set(state => ({
      buildings: state.buildings.filter(b => b.id !== id),
      selectedBuildingId:
        state.selectedBuildingId === id ? null : state.selectedBuildingId,
      dirty: true,
    })),

  selectedBuildingId: null,
  selectBuilding: (id: string | null) => set({ selectedBuildingId: id, editorOpen: false }),

  editorOpen: false,
  setEditorOpen: (v: boolean) => set({ editorOpen: v }),

  isDragging: false,
  setDragging: (v: boolean) => set({ isDragging: v }),

  playback: { playing: false, speed: 1 },
  setPlayback: (p: Partial<PlaybackState>) =>
    set(state => ({ playback: { ...state.playback, ...p } })),

  // ─── Project State ──────────────────────────────────────

  directories: [],
  setDirectories: (dirs: Directory[]) => set({ directories: dirs }),

  models: [],
  setModels: (modelsOrFn: Model[] | ((prev: Model[]) => Model[])) =>
    set(state => ({
      models: typeof modelsOrFn === 'function' ? modelsOrFn(state.models) : modelsOrFn,
    })),

  currentDirectoryId: null,
  setCurrentDirectoryId: (id: string | null) => set({ currentDirectoryId: id }),

  currentModelId: null,
  setCurrentModelId: (id: string | null) => set({ currentModelId: id }),

  dirty: false,
  setDirty: (v: boolean) => set({ dirty: v }),
}))
