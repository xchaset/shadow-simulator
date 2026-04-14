import { create } from 'zustand'
import type { AppState, Building, Directory, Location, Model, PlaybackState, TerrainData, TerrainEditorState, TerrainBrushMode } from '../types'

const MAX_UNDO = 20

export const useStore = create<AppState>((set, get) => ({
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
      selectedBuildingIds: state.selectedBuildingIds.filter(i => i !== id),
      dirty: true,
    })),

  removeBuildings: (ids: string[]) =>
    set(state => ({
      buildings: state.buildings.filter(b => !ids.includes(b.id)),
      selectedBuildingId:
        state.selectedBuildingId && ids.includes(state.selectedBuildingId)
          ? null
          : state.selectedBuildingId,
      selectedBuildingIds: state.selectedBuildingIds.filter(i => !ids.includes(i)),
      dirty: true,
    })),

  renameBuilding: (id: string, name: string) =>
    set(state => ({
      buildings: state.buildings.map(b =>
        b.id === id ? { ...b, name } : b,
      ),
      dirty: true,
    })),

  selectedBuildingId: null,
  selectBuilding: (id: string | null) => set({ selectedBuildingId: id, editorOpen: false }),

  // 多选支持
  selectedBuildingIds: [],
  selectBuildings: (ids: string[]) => set({ selectedBuildingIds: ids, editorOpen: false }),
  toggleBuildingSelection: (id: string) =>
    set(state => {
      const exists = state.selectedBuildingIds.includes(id)
      return {
        selectedBuildingIds: exists
          ? state.selectedBuildingIds.filter(i => i !== id)
          : [...state.selectedBuildingIds, id],
        editorOpen: false,
      }
    }),
  clearSelection: () => set({ selectedBuildingIds: [], selectedBuildingId: null, editorOpen: false }),

  // 框选状态
  isBoxSelecting: false,
  setBoxSelecting: (v: boolean) => set({ isBoxSelecting: v }),
  boxSelectStart: null,
  setBoxSelectStart: (pos: [number, number] | null) => set({ boxSelectStart: pos }),
  boxSelectEnd: null,
  setBoxSelectEnd: (pos: [number, number] | null) => set({ boxSelectEnd: pos }),

  editorOpen: false,
  setEditorOpen: (v: boolean) => set({ editorOpen: v }),

  isDragging: false,
  setDragging: (v: boolean) => set({ isDragging: v }),

  playback: { playing: false, speed: 1 },
  setPlayback: (p: Partial<PlaybackState>) =>
    set(state => ({ playback: { ...state.playback, ...p } })),

  // 画布设置（与模型绑定）
  canvasSize: 2000,
  setCanvasSize: (size: number) => set({ canvasSize: size, dirty: true }),
  showGrid: true,
  setShowGrid: (v: boolean) => set({ showGrid: v, dirty: true }),
  gridDivisions: 200,
  setGridDivisions: (divs: number) => set({ gridDivisions: divs, dirty: true }),

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

  // ─── Terrain State ──────────────────────────────────────

  terrainData: null,
  setTerrainData: (data: TerrainData | null) => set({ terrainData: data, dirty: true }),

  terrainEditor: {
    enabled: false,
    brushMode: 'raise',
    brushRadius: 50,
    brushStrength: 5,
    brushPosition: null,
    isDrawing: false,
    undoStack: [],
    redoStack: [],
  } as TerrainEditorState,

  setTerrainEditor: (updates: Partial<TerrainEditorState>) =>
    set(state => ({
      terrainEditor: { ...state.terrainEditor, ...updates },
    })),

  /** 将当前地形推入撤销栈 */
  pushTerrainUndo: () => {
    const { terrainData, terrainEditor } = get()
    if (!terrainData) return
    const snapshot: TerrainData = {
      resolution: terrainData.resolution,
      heights: new Float32Array(terrainData.heights),
      maxHeight: terrainData.maxHeight,
    }
    set({
      terrainEditor: {
        ...terrainEditor,
        undoStack: [...terrainEditor.undoStack.slice(-MAX_UNDO + 1), snapshot],
        redoStack: [],
      },
    })
  },

  /** 撤销 */
  terrainUndo: () => {
    const { terrainEditor, terrainData } = get()
    if (terrainEditor.undoStack.length === 0) return
    const last = terrainEditor.undoStack[terrainEditor.undoStack.length - 1]
    const currentSnapshot = terrainData ? {
      resolution: terrainData.resolution,
      heights: new Float32Array(terrainData.heights),
      maxHeight: terrainData.maxHeight,
    } : null
    set({
      terrainData: last,
      terrainEditor: {
        ...terrainEditor,
        undoStack: terrainEditor.undoStack.slice(0, -1),
        redoStack: currentSnapshot ? [...terrainEditor.redoStack, currentSnapshot] : terrainEditor.redoStack,
      },
      dirty: true,
    })
  },

  /** 重做 */
  terrainRedo: () => {
    const { terrainEditor, terrainData } = get()
    if (terrainEditor.redoStack.length === 0) return
    const next = terrainEditor.redoStack[terrainEditor.redoStack.length - 1]
    const currentSnapshot = terrainData ? {
      resolution: terrainData.resolution,
      heights: new Float32Array(terrainData.heights),
      maxHeight: terrainData.maxHeight,
    } : null
    set({
      terrainData: next,
      terrainEditor: {
        ...terrainEditor,
        redoStack: terrainEditor.redoStack.slice(0, -1),
        undoStack: currentSnapshot ? [...terrainEditor.undoStack, currentSnapshot] : terrainEditor.undoStack,
      },
      dirty: true,
    })
  },
}))
