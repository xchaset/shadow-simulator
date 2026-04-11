import { create } from 'zustand'
import type { AppState, Building, Location, PlaybackState } from '../types'

export const useStore = create<AppState>((set) => ({
  location: { lat: 39.9042, lng: 116.4074, cityName: '北京' },

  setLocation: (loc: Location) => set({ location: loc }),

  dateTime: new Date(),

  setDateTime: (dt: Date) => set({ dateTime: dt }),

  buildings: [],

  addBuilding: (b: Building) =>
    set(state => ({ buildings: [...state.buildings, b] })),

  updateBuilding: (id: string, updates: Partial<Building>) =>
    set(state => ({
      buildings: state.buildings.map(b =>
        b.id === id ? { ...b, ...updates } : b,
      ),
    })),

  removeBuilding: (id: string) =>
    set(state => ({
      buildings: state.buildings.filter(b => b.id !== id),
      selectedBuildingId:
        state.selectedBuildingId === id ? null : state.selectedBuildingId,
    })),

  selectedBuildingId: null,

  selectBuilding: (id: string | null) => set({ selectedBuildingId: id }),

  playback: { playing: false, speed: 1 },

  setPlayback: (p: Partial<PlaybackState>) =>
    set(state => ({ playback: { ...state.playback, ...p } })),
}))
