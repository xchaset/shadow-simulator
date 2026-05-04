import { create } from 'zustand'
import type { AppState, Building, Directory, Location, Model, PlaybackState, TerrainData, TerrainEditorState, TerrainBrushMode, ShadowAnalysisReport, MeasurementToolState, MeasurementMode, MeasurementPoint, MeasurementResult, CustomTemplate, LakeState } from '../types'

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
      waterMask: terrainData.waterMask ? new Uint8Array(terrainData.waterMask) : undefined,
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
      waterMask: terrainData.waterMask ? new Uint8Array(terrainData.waterMask) : undefined,
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
      waterMask: terrainData.waterMask ? new Uint8Array(terrainData.waterMask) : undefined,
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

  // Lake
  lake: {
    enabled: false,
    waterLevel: -5,
    waterColor: '#1a75ff',
    waveHeight: 0.25,
    opacity: 0.78,
  } as LakeState,

  setLake: (updates: Partial<LakeState>) =>
    set(state => ({
      lake: { ...state.lake, ...updates },
      dirty: true,
    })),

  lakeRegions: [],

  addLakeRegion: (region) =>
    set(state => ({
      lakeRegions: [...state.lakeRegions, region],
      dirty: true,
    })),

  removeLakeRegion: (id) =>
    set(state => ({
      lakeRegions: state.lakeRegions.filter(r => r.id !== id),
      dirty: true,
    })),

  clearLakeRegions: () =>
    set({
      lakeRegions: [],
      dirty: true,
    }),

  setLakeRegions: (regions) =>
    set({
      lakeRegions: regions,
      dirty: true,
    }),

  // Shadow Analysis
  shadowAnalysisReport: null,
  setShadowAnalysisReport: (report: ShadowAnalysisReport | null) =>
    set({ shadowAnalysisReport: report }),
  isGeneratingReport: false,
  setIsGeneratingReport: (v: boolean) => set({ isGeneratingReport: v }),

  // Measurement Tool
  measurementTool: {
    enabled: false,
    mode: 'distance',
    points: [],
    results: [],
    isDrawing: false,
  } as MeasurementToolState,

  setMeasurementTool: (updates: Partial<MeasurementToolState>) =>
    set(state => ({
      measurementTool: { ...state.measurementTool, ...updates },
    })),

  addMeasurementPoint: (point: MeasurementPoint) =>
    set(state => ({
      measurementTool: {
        ...state.measurementTool,
        points: [...state.measurementTool.points, point],
      },
    })),

  removeMeasurementPoint: (id: string) =>
    set(state => ({
      measurementTool: {
        ...state.measurementTool,
        points: state.measurementTool.points.filter(p => p.id !== id),
      },
    })),

  clearMeasurementPoints: () =>
    set(state => ({
      measurementTool: {
        ...state.measurementTool,
        points: [],
      },
    })),

  completeMeasurement: () => {
    const { measurementTool } = get()
    const { mode, points } = measurementTool

    if (points.length < 2) return

    const result: MeasurementResult = {
      id: `measurement-${Date.now()}`,
      mode,
      points: [...points],
      createdAt: new Date(),
    }

    if (mode === 'distance' && points.length >= 2) {
      let totalDistance = 0
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i]
        const p2 = points[i + 1]
        const dx = p2.position[0] - p1.position[0]
        const dz = p2.position[1] - p1.position[1]
        totalDistance += Math.sqrt(dx * dx + dz * dz)
      }
      result.distance = totalDistance
    }

    if (mode === 'area' && points.length >= 3) {
      let area = 0
      const n = points.length
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n
        area += points[i].position[0] * points[j].position[1]
        area -= points[j].position[0] * points[i].position[1]
      }
      result.area = Math.abs(area) / 2
    }

    set(state => ({
      measurementTool: {
        ...state.measurementTool,
        points: [],
        results: [...state.measurementTool.results, result],
      },
    }))
  },

  clearMeasurementResults: () =>
    set(state => ({
      measurementTool: {
        ...state.measurementTool,
        results: [],
      },
    })),

  // Share Mode
  shareMode: {
    isShareMode: false,
    shareToken: null,
    isReadOnly: false,
    shareData: null,
  },
  setShareMode: (updates: Partial<{
    isShareMode: boolean
    shareToken: string | null
    isReadOnly: boolean
    shareData: any
  }>) =>
    set(state => ({
      shareMode: {
        ...state.shareMode,
        ...updates,
      },
    })),

  // Custom Templates
  customTemplates: [],
  setCustomTemplates: (templates: CustomTemplate[]) =>
    set({ customTemplates: templates }),
  customTemplateRefreshTrigger: 0,
  triggerCustomTemplateRefresh: () =>
    set(state => ({ customTemplateRefreshTrigger: state.customTemplateRefreshTrigger + 1 })),
}))
