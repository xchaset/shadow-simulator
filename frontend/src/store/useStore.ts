import { create } from 'zustand'
import type { AppState, Building, Directory, Location, Model, PlaybackState, TerrainData, TerrainEditorState, TerrainBrushMode, TerrainColorType, ShadowAnalysisReport, MeasurementToolState, MeasurementMode, MeasurementPoint, MeasurementResult, CustomTemplate, LakeState, RoadEditorState, RoadHeightMode, RoadMode, RoadLaneConfig, ShadowHeatmapMode, ShadowHeatmapResult, Annotation, AnnotationToolState, AnnotationMode, AnnotationColor } from '../types'
import { remapTerrainData } from '../utils/terrain'
import { createBuilding } from '../utils/buildings'
import { generateShadowHeatmapForDay, generateShadowHeatmapForYear } from '../utils/shadowAnalysis'

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
  setCanvasSize: (size: number) => {
    const currentState = get()
    const oldCanvasSize = currentState.canvasSize
    
    // 如果尺寸没有变化，直接返回
    if (oldCanvasSize === size) return
    
    // 如果有地形数据，需要重新映射以保持在相同的世界位置
    const terrainData = currentState.terrainData
    if (terrainData) {
      const remappedData = remapTerrainData(terrainData, oldCanvasSize, size)
      set({ canvasSize: size, terrainData: remappedData, dirty: true })
    } else {
      set({ canvasSize: size, dirty: true })
    }
  },
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
    brushMaxHeight: 500,
    brushPosition: null,
    isDrawing: false,
    undoStack: [],
    redoStack: [],
    brushColorType: 1 as TerrainColorType,
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
      colorData: terrainData.colorData ? new Float32Array(terrainData.colorData) : undefined,
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
      colorData: terrainData.colorData ? new Float32Array(terrainData.colorData) : undefined,
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
      colorData: terrainData.colorData ? new Float32Array(terrainData.colorData) : undefined,
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

  // Shadow Heatmap
  shadowHeatmap: {
    enabled: false,
    mode: 'day' as ShadowHeatmapMode,
    isGenerating: false,
    result: null,
    opacity: 0.6,
    gridResolution: 50,
  },
  
  setShadowHeatmap: (updates: Partial<AppState['shadowHeatmap']>) =>
    set(state => ({
      shadowHeatmap: { ...state.shadowHeatmap, ...updates },
    })),
  
  generateShadowHeatmap: (mode: ShadowHeatmapMode) => {
    const { buildings, location, dateTime, canvasSize, shadowHeatmap } = get()
    
    if (buildings.length === 0) return
    
    set({ shadowHeatmap: { ...shadowHeatmap, isGenerating: true, mode } })
    
    setTimeout(() => {
      try {
        const gridPoints = mode === 'day'
          ? generateShadowHeatmapForDay(
              buildings, 
              location, 
              dateTime,
              shadowHeatmap.gridResolution,
              canvasSize
            )
          : generateShadowHeatmapForYear(
              buildings, 
              location, 
              dateTime.getFullYear(),
              shadowHeatmap.gridResolution,
              canvasSize
            )
        
        const maxShadowMinutes = Math.max(...gridPoints.map(p => p.shadowMinutes))
        const minShadowMinutes = Math.min(...gridPoints.map(p => p.shadowMinutes))
        
        const result: ShadowHeatmapResult = {
          mode,
          gridSize: shadowHeatmap.gridResolution,
          gridPoints,
          maxShadowMinutes,
          minShadowMinutes,
          generatedAt: new Date(),
        }
        
        set({
          shadowHeatmap: {
            ...get().shadowHeatmap,
            isGenerating: false,
            result,
            enabled: true,
          },
        })
      } catch (error) {
        console.error('Failed to generate shadow heatmap:', error)
        set({
          shadowHeatmap: {
            ...get().shadowHeatmap,
            isGenerating: false,
          },
        })
      }
    }, 100)
  },
  
  clearShadowHeatmap: () => {
    set({
      shadowHeatmap: {
        ...get().shadowHeatmap,
        enabled: false,
        result: null,
      },
    })
  },

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

  roadEditor: {
    enabled: false,
    roadWidth: 12,
    roadElevation: 8,
    roadHeightMode: 'follow-terrain' as RoadHeightMode,
    roadMode: 'curve' as RoadMode,
    curveTension: 0.5,
    previewPoints: [],
    isDrawing: false,
    laneConfig: {
      laneCount: 2,
      laneWidth: 3.5,
      centerLineType: 'double-yellow',
      laneDividerType: 'dashed',
      edgeLineType: 'white-edge',
      dashedLineLength: 4,
      dashedLineGap: 6,
      showLaneLines: true,
    } as RoadLaneConfig,
  } as RoadEditorState,

  setRoadEditor: (updates: Partial<RoadEditorState>) =>
    set(state => ({
      roadEditor: { ...state.roadEditor, ...updates },
    })),

  addRoadPreviewPoint: (point: { x: number; z: number }) =>
    set(state => ({
      roadEditor: {
        ...state.roadEditor,
        previewPoints: [...state.roadEditor.previewPoints, point],
      },
    })),

  completeRoad: () => {
    const state = get()
    const { roadEditor } = state
    const { previewPoints, roadWidth, roadElevation, roadHeightMode, roadMode, curveTension, laneConfig } = roadEditor

    if (previewPoints.length < 2) return

    const firstPoint = previewPoints[0]
    const roadBuilding = createBuilding('road', [firstPoint.x, firstPoint.z])

    roadBuilding.roadMode = roadMode
    roadBuilding.roadHeightMode = roadHeightMode
    roadBuilding.roadElevation = roadElevation
    roadBuilding.roadPathPoints = previewPoints.map(p => ({
      x: p.x - firstPoint.x,
      z: p.z - firstPoint.z,
    }))
    roadBuilding.roadCurveTension = curveTension
    roadBuilding.roadLaneConfig = { ...laneConfig }
    roadBuilding.params = {
      width: roadWidth,
      thickness: 0.15,
      segments: 48,
    }

    set({
      buildings: [...state.buildings, roadBuilding],
      roadEditor: {
        ...state.roadEditor,
        previewPoints: [],
        isDrawing: false,
      },
      dirty: true,
    })
  },

  cancelRoadDrawing: () =>
    set(state => ({
      roadEditor: {
        ...state.roadEditor,
        enabled: false,
        previewPoints: [],
        isDrawing: false,
      },
    })),

  // Annotation Tool
  annotationTool: {
    enabled: false,
    mode: 'text' as AnnotationMode,
    annotations: [],
    selectedAnnotationId: null,
    isDrawing: false,
    currentPosition: null,
    temporaryAnnotation: null,
    color: '#1677ff' as AnnotationColor,
    fontSize: 14,
  } as AnnotationToolState,

  setAnnotationTool: (updates: Partial<AnnotationToolState>) =>
    set(state => ({
      annotationTool: { ...state.annotationTool, ...updates },
    })),

  addAnnotation: (annotation: Annotation) =>
    set(state => ({
      annotationTool: {
        ...state.annotationTool,
        annotations: [...state.annotationTool.annotations, annotation],
      },
      dirty: true,
    })),

  updateAnnotation: (id: string, updates: Partial<Annotation>) =>
    set(state => ({
      annotationTool: {
        ...state.annotationTool,
        annotations: state.annotationTool.annotations.map(a =>
          a.id === id ? { ...a, ...updates } : a
        ),
      },
      dirty: true,
    })),

  removeAnnotation: (id: string) =>
    set(state => ({
      annotationTool: {
        ...state.annotationTool,
        annotations: state.annotationTool.annotations.filter(a => a.id !== id),
        selectedAnnotationId:
          state.annotationTool.selectedAnnotationId === id
            ? null
            : state.annotationTool.selectedAnnotationId,
      },
      dirty: true,
    })),

  clearAnnotations: () =>
    set(state => ({
      annotationTool: {
        ...state.annotationTool,
        annotations: [],
        selectedAnnotationId: null,
      },
      dirty: true,
    })),

  selectAnnotation: (id: string | null) =>
    set(state => ({
      annotationTool: {
        ...state.annotationTool,
        selectedAnnotationId: id,
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
