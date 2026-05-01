# 建筑阴影模拟器 — 实施计划

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** 构建一个基于地理位置、日期、时间的 3D 建筑阴影模拟器 Web 应用。

**Architecture:** 纯前端 React 应用，使用 react-three-fiber 渲染 3D 场景，SunCalc 计算太阳位置，Zustand 管理全局状态，高德地图 JS API 实现地图选点。底部时间轴控制日期和时间，太阳光照和阴影实时联动。

**Tech Stack:** React 18, TypeScript, Vite, @react-three/fiber, @react-three/drei, SunCalc, Zustand, Ant Design, 高德地图 JS API 2.0

---

## Task 1: 项目脚手架搭建

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/App.css`
- Create: `src/vite-env.d.ts`

**Step 1: 初始化项目**
```bash
cd ~/.openclaw/workspace/shadow-simulator
npm create vite@latest . -- --template react-ts
```
如果目录已存在，选择 ignore existing files。

**Step 2: 安装核心依赖**
```bash
npm install three @react-three/fiber @react-three/drei suncalc zustand antd @ant-design/icons
npm install -D @types/three @types/suncalc vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 3: 配置 Vitest**
在 `vite.config.ts` 中添加 test 配置：
```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

Create `src/test-setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

**Step 4: 验证项目启动**
```bash
npm run dev
```
Expected: Vite 开发服务器启动，浏览器可访问。

**Step 5: 验证测试运行**
在 `package.json` scripts 中添加 `"test": "vitest run"`。
创建 `src/__tests__/setup.test.ts`:
```typescript
describe('project setup', () => {
  it('should run tests', () => {
    expect(1 + 1).toBe(2)
  })
})
```
```bash
npm test
```
Expected: PASS

**Step 6: Commit**
```bash
git add -A && git commit -m "chore: 项目脚手架搭建"
```

---

## Task 2: TypeScript 类型定义

**Files:**
- Create: `src/types/index.ts`
- Test: `src/__tests__/types.test.ts`

**Step 1: Write the failing test**
```typescript
// src/__tests__/types.test.ts
import type { Building, BuildingType, Location, SunData, AppState } from '../types'

describe('Type definitions', () => {
  it('should create a valid Building object', () => {
    const building: Building = {
      id: 'test-1',
      name: '测试建筑',
      type: 'box',
      params: { width: 20, depth: 15, height: 50 },
      position: [0, 0],
      rotation: 0,
      color: '#8899aa',
    }
    expect(building.id).toBe('test-1')
    expect(building.type).toBe('box')
  })

  it('should create a valid Location object', () => {
    const loc: Location = {
      lat: 39.9042,
      lng: 116.4074,
      cityName: '北京',
    }
    expect(loc.lat).toBeCloseTo(39.9042)
  })

  it('should create a valid SunData object', () => {
    const sun: SunData = {
      azimuth: 3.14,
      altitude: 0.8,
      sunrise: new Date('2026-04-11T06:12:00'),
      sunset: new Date('2026-04-11T18:34:00'),
      isNight: false,
    }
    expect(sun.isNight).toBe(false)
  })
})
```

**Step 2: Run test — confirm it fails**
```bash
npm test
```
Expected: FAIL — cannot find module '../types'

**Step 3: Write implementation**
```typescript
// src/types/index.ts
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
  playback: PlaybackState
  setPlayback: (p: Partial<PlaybackState>) => void
}
```

**Step 4: Run test — confirm it passes**
```bash
npm test
```
Expected: PASS

**Step 5: Commit**
```bash
git add -A && git commit -m "feat: TypeScript 类型定义"
```

---

## Task 3: 热门城市数据

**Files:**
- Create: `src/utils/cities.ts`
- Test: `src/__tests__/cities.test.ts`

**Step 1: Write the failing test**
```typescript
// src/__tests__/cities.test.ts
import { HOT_CITIES, getCityByName } from '../utils/cities'

describe('cities', () => {
  it('should have at least 10 hot cities', () => {
    expect(HOT_CITIES.length).toBeGreaterThanOrEqual(10)
  })

  it('each city should have name, lat, lng', () => {
    HOT_CITIES.forEach(city => {
      expect(city.name).toBeTruthy()
      expect(city.lat).toBeGreaterThan(-90)
      expect(city.lat).toBeLessThan(90)
      expect(city.lng).toBeGreaterThan(-180)
      expect(city.lng).toBeLessThan(180)
    })
  })

  it('should find city by name', () => {
    const beijing = getCityByName('北京')
    expect(beijing).toBeDefined()
    expect(beijing!.lat).toBeCloseTo(39.9042, 1)
  })

  it('should return undefined for unknown city', () => {
    expect(getCityByName('亚特兰蒂斯')).toBeUndefined()
  })
})
```

**Step 2: Run test — confirm it fails**
Expected: FAIL — cannot find module

**Step 3: Write implementation**
```typescript
// src/utils/cities.ts
export interface CityData {
  name: string
  lat: number
  lng: number
}

export const HOT_CITIES: CityData[] = [
  { name: '北京', lat: 39.9042, lng: 116.4074 },
  { name: '上海', lat: 31.2304, lng: 121.4737 },
  { name: '广州', lat: 23.1291, lng: 113.2644 },
  { name: '深圳', lat: 22.5431, lng: 114.0579 },
  { name: '成都', lat: 30.5728, lng: 104.0668 },
  { name: '杭州', lat: 30.2741, lng: 120.1551 },
  { name: '武汉', lat: 30.5928, lng: 114.3055 },
  { name: '南京', lat: 32.0603, lng: 118.7969 },
  { name: '重庆', lat: 29.4316, lng: 106.9123 },
  { name: '西安', lat: 34.3416, lng: 108.9398 },
  { name: '天津', lat: 39.0842, lng: 117.2010 },
  { name: '苏州', lat: 31.2990, lng: 120.5853 },
  { name: '长沙', lat: 28.2282, lng: 112.9388 },
  { name: '郑州', lat: 34.7466, lng: 113.6254 },
  { name: '青岛', lat: 36.0671, lng: 120.3826 },
  { name: '大连', lat: 38.9140, lng: 121.6147 },
  { name: '厦门', lat: 24.4798, lng: 118.0894 },
  { name: '昆明', lat: 25.0389, lng: 102.7183 },
  { name: '哈尔滨', lat: 45.8038, lng: 126.5350 },
  { name: '拉萨', lat: 29.6500, lng: 91.1000 },
]

export function getCityByName(name: string): CityData | undefined {
  return HOT_CITIES.find(c => c.name === name)
}
```

**Step 4: Run test — confirm it passes**
Expected: PASS

**Step 5: Commit**
```bash
git add -A && git commit -m "feat: 热门城市数据"
```

---

## Task 4: 太阳位置计算工具

**Files:**
- Create: `src/utils/sunCalc.ts`
- Test: `src/__tests__/sunCalc.test.ts`

**Step 1: Write the failing test**
```typescript
// src/__tests__/sunCalc.test.ts
import { getSunData, sunToLightPosition, formatTime } from '../utils/sunCalc'

describe('sunCalc', () => {
  const beijing = { lat: 39.9042, lng: 116.4074 }
  const summerDate = new Date(2026, 5, 21, 12, 0, 0) // 6月21日正午

  it('should calculate sun position for Beijing summer noon', () => {
    const data = getSunData(beijing.lat, beijing.lng, summerDate)
    // 夏至正午太阳高度角应该很高（北京约73°）
    expect(data.altitude).toBeGreaterThan(1.0) // >57°in radians ~1.0
    expect(data.isNight).toBe(false)
  })

  it('should calculate sunrise and sunset', () => {
    const data = getSunData(beijing.lat, beijing.lng, summerDate)
    expect(data.sunrise).toBeInstanceOf(Date)
    expect(data.sunset).toBeInstanceOf(Date)
    // 夏至日出应该在5点左右
    expect(data.sunrise.getHours()).toBeLessThanOrEqual(6)
    // 夏至日落应该在19点左右
    expect(data.sunset.getHours()).toBeGreaterThanOrEqual(19)
  })

  it('should detect night time', () => {
    const nightDate = new Date(2026, 5, 21, 2, 0, 0) // 凌晨2点
    const data = getSunData(beijing.lat, beijing.lng, nightDate)
    expect(data.isNight).toBe(true)
  })

  it('should convert sun position to 3D light coordinates', () => {
    const pos = sunToLightPosition(Math.PI / 4, Math.PI / 4, 100)
    expect(pos).toHaveLength(3)
    // Y should be positive (sun above horizon)
    expect(pos[1]).toBeGreaterThan(0)
  })

  it('formatTime should format date to HH:MM', () => {
    const d = new Date(2026, 0, 1, 6, 5, 0)
    expect(formatTime(d)).toBe('06:05')
  })
})
```

**Step 2: Run test — confirm it fails**
Expected: FAIL

**Step 3: Write implementation**
```typescript
// src/utils/sunCalc.ts
import SunCalc from 'suncalc'
import type { SunData } from '../types'

export function getSunData(lat: number, lng: number, date: Date): SunData {
  const position = SunCalc.getPosition(date, lat, lng)
  const times = SunCalc.getTimes(date, lat, lng)

  return {
    azimuth: position.azimuth,
    altitude: position.altitude,
    sunrise: times.sunrise,
    sunset: times.sunset,
    isNight: position.altitude < 0,
  }
}

export function sunToLightPosition(
  azimuth: number,
  altitude: number,
  distance = 100,
): [number, number, number] {
  const x = distance * Math.cos(altitude) * Math.sin(azimuth)
  const y = distance * Math.sin(altitude)
  const z = distance * Math.cos(altitude) * Math.cos(azimuth)
  return [x, y, z]
}

export function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

export function getDaylightDuration(sunrise: Date, sunset: Date): string {
  const diffMs = sunset.getTime() - sunrise.getTime()
  const hours = Math.floor(diffMs / 3600000)
  const minutes = Math.floor((diffMs % 3600000) / 60000)
  return `${hours}h ${minutes}min`
}
```

**Step 4: Run test — confirm it passes**
Expected: PASS

**Step 5: Commit**
```bash
git add -A && git commit -m "feat: 太阳位置计算工具"
```

---

## Task 5: 建筑形状参数定义与默认值

**Files:**
- Create: `src/utils/buildings.ts`
- Test: `src/__tests__/buildings.test.ts`

**Step 1: Write the failing test**
```typescript
// src/__tests__/buildings.test.ts
import { BUILDING_PRESETS, getDefaultParams, createBuilding } from '../utils/buildings'
import type { BuildingType } from '../types'

describe('buildings', () => {
  it('should have presets for all building types', () => {
    const types: BuildingType[] = [
      'box', 'cylinder', 'prism', 'l-shape', 'u-shape',
      't-shape', 'stepped', 'podium-tower', 'dome', 'gable-roof',
    ]
    types.forEach(t => {
      expect(BUILDING_PRESETS[t]).toBeDefined()
      expect(BUILDING_PRESETS[t].label).toBeTruthy()
    })
  })

  it('should return default params for each type', () => {
    const params = getDefaultParams('box')
    expect(params.width).toBeGreaterThan(0)
    expect(params.depth).toBeGreaterThan(0)
    expect(params.height).toBeGreaterThan(0)
  })

  it('should create a building with unique id', () => {
    const b1 = createBuilding('box')
    const b2 = createBuilding('box')
    expect(b1.id).not.toBe(b2.id)
    expect(b1.type).toBe('box')
    expect(b1.params.width).toBeGreaterThan(0)
  })
})
```

**Step 2: Run test — confirm it fails**
Expected: FAIL

**Step 3: Write implementation**
```typescript
// src/utils/buildings.ts
import type { Building, BuildingType } from '../types'

export interface BuildingPreset {
  label: string
  icon: string
  defaultParams: Record<string, number>
  paramLabels: Record<string, string>
}

export const BUILDING_PRESETS: Record<BuildingType, BuildingPreset> = {
  box: {
    label: '长方体',
    icon: '🏢',
    defaultParams: { width: 20, depth: 15, height: 50 },
    paramLabels: { width: '宽度', depth: '进深', height: '高度' },
  },
  cylinder: {
    label: '圆柱体',
    icon: '🏛️',
    defaultParams: { radius: 10, height: 40, segments: 32 },
    paramLabels: { radius: '半径', height: '高度', segments: '分段数' },
  },
  prism: {
    label: '棱柱体',
    icon: '⬡',
    defaultParams: { sides: 6, radius: 12, height: 35 },
    paramLabels: { sides: '边数', radius: '外接半径', height: '高度' },
  },
  'l-shape': {
    label: 'L 形',
    icon: '🔲',
    defaultParams: { wing1Length: 30, wing2Length: 25, width: 12, height: 40 },
    paramLabels: { wing1Length: '翼1长度', wing2Length: '翼2长度', width: '宽度', height: '高度' },
  },
  'u-shape': {
    label: 'U 形',
    icon: '🔳',
    defaultParams: { wing1Length: 25, wing2Length: 25, backLength: 30, width: 10, height: 35 },
    paramLabels: { wing1Length: '翼1长度', wing2Length: '翼2长度', backLength: '底边长', width: '宽度', height: '高度' },
  },
  't-shape': {
    label: 'T 形',
    icon: '✝️',
    defaultParams: { crossLength: 40, stemLength: 30, width: 12, height: 45 },
    paramLabels: { crossLength: '横翼长度', stemLength: '纵翼长度', width: '宽度', height: '高度' },
  },
  stepped: {
    label: '阶梯退台',
    icon: '📶',
    defaultParams: { baseWidth: 30, baseDepth: 25, levels: 3, stepback: 4, levelHeight: 15 },
    paramLabels: { baseWidth: '底部宽度', baseDepth: '底部进深', levels: '层数', stepback: '每层缩进', levelHeight: '层高' },
  },
  'podium-tower': {
    label: '裙楼+塔楼',
    icon: '🏙️',
    defaultParams: { podiumWidth: 40, podiumDepth: 30, podiumHeight: 15, towerWidth: 18, towerDepth: 15, towerHeight: 60 },
    paramLabels: { podiumWidth: '裙楼宽', podiumDepth: '裙楼深', podiumHeight: '裙楼高', towerWidth: '塔楼宽', towerDepth: '塔楼深', towerHeight: '塔楼高' },
  },
  dome: {
    label: '穹顶',
    icon: '🕌',
    defaultParams: { radius: 12, cylinderHeight: 20 },
    paramLabels: { radius: '半径', cylinderHeight: '柱体高度' },
  },
  'gable-roof': {
    label: '坡屋顶',
    icon: '🏠',
    defaultParams: { width: 20, depth: 25, wallHeight: 12, ridgeHeight: 8 },
    paramLabels: { width: '宽度', depth: '进深', wallHeight: '墙高', ridgeHeight: '屋脊高' },
  },
}

const COLORS = [
  '#6B8EC2', '#8FC1A9', '#D4A574', '#C2847A', '#9B8EC2',
  '#7ABFBF', '#C2B06B', '#B07AAB', '#7A9FC2', '#A0C27A',
]

let colorIndex = 0

export function getDefaultParams(type: BuildingType): Record<string, number> {
  return { ...BUILDING_PRESETS[type].defaultParams }
}

export function createBuilding(type: BuildingType, position: [number, number] = [0, 0]): Building {
  const color = COLORS[colorIndex % COLORS.length]
  colorIndex++
  return {
    id: `building-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${BUILDING_PRESETS[type].label} ${colorIndex}`,
    type,
    params: getDefaultParams(type),
    position,
    rotation: 0,
    color,
  }
}
```

**Step 4: Run test — confirm it passes**
Expected: PASS

**Step 5: Commit**
```bash
git add -A && git commit -m "feat: 建筑形状参数定义与默认值"
```

---

## Task 6: Zustand 全局状态管理

**Files:**
- Create: `src/store/useStore.ts`
- Test: `src/__tests__/store.test.ts`

**Step 1: Write the failing test**
```typescript
// src/__tests__/store.test.ts
import { useStore } from '../store/useStore'
import { createBuilding } from '../utils/buildings'

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({
      location: { lat: 39.9042, lng: 116.4074, cityName: '北京' },
      dateTime: new Date(2026, 3, 11, 14, 0, 0),
      buildings: [],
      selectedBuildingId: null,
      playback: { playing: false, speed: 1 },
    })
  })

  it('should have default location as Beijing', () => {
    const state = useStore.getState()
    expect(state.location.cityName).toBe('北京')
  })

  it('should set location', () => {
    useStore.getState().setLocation({ lat: 31.23, lng: 121.47, cityName: '上海' })
    expect(useStore.getState().location.cityName).toBe('上海')
  })

  it('should set dateTime', () => {
    const newDate = new Date(2026, 6, 1, 10, 0, 0)
    useStore.getState().setDateTime(newDate)
    expect(useStore.getState().dateTime).toBe(newDate)
  })

  it('should add building', () => {
    const b = createBuilding('box')
    useStore.getState().addBuilding(b)
    expect(useStore.getState().buildings).toHaveLength(1)
    expect(useStore.getState().buildings[0].id).toBe(b.id)
  })

  it('should update building', () => {
    const b = createBuilding('box')
    useStore.getState().addBuilding(b)
    useStore.getState().updateBuilding(b.id, { rotation: 45 })
    expect(useStore.getState().buildings[0].rotation).toBe(45)
  })

  it('should remove building', () => {
    const b = createBuilding('box')
    useStore.getState().addBuilding(b)
    useStore.getState().removeBuilding(b.id)
    expect(useStore.getState().buildings).toHaveLength(0)
  })

  it('should deselect when selected building is removed', () => {
    const b = createBuilding('box')
    useStore.getState().addBuilding(b)
    useStore.getState().selectBuilding(b.id)
    useStore.getState().removeBuilding(b.id)
    expect(useStore.getState().selectedBuildingId).toBeNull()
  })

  it('should set playback', () => {
    useStore.getState().setPlayback({ playing: true, speed: 5 })
    const s = useStore.getState().playback
    expect(s.playing).toBe(true)
    expect(s.speed).toBe(5)
  })
})
```

**Step 2: Run test — confirm it fails**
Expected: FAIL

**Step 3: Write implementation**
```typescript
// src/store/useStore.ts
import { create } from 'zustand'
import type { AppState, Building, Location, PlaybackState } from '../types'

export const useStore = create<AppState>((set, get) => ({
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
```

**Step 4: Run test — confirm it passes**
Expected: PASS

**Step 5: Commit**
```bash
git add -A && git commit -m "feat: Zustand 全局状态管理"
```

---

## Task 7: 建筑几何体生成器（shapes）

**Files:**
- Create: `src/components/Buildings/shapes/BoxShape.ts`
- Create: `src/components/Buildings/shapes/CylinderShape.ts`
- Create: `src/components/Buildings/shapes/PrismShape.ts`
- Create: `src/components/Buildings/shapes/LShape.ts`
- Create: `src/components/Buildings/shapes/UShape.ts`
- Create: `src/components/Buildings/shapes/TShape.ts`
- Create: `src/components/Buildings/shapes/SteppedShape.ts`
- Create: `src/components/Buildings/shapes/PodiumTower.ts`
- Create: `src/components/Buildings/shapes/DomeShape.ts`
- Create: `src/components/Buildings/shapes/GableRoof.ts`
- Create: `src/components/Buildings/BuildingFactory.ts`
- Test: `src/__tests__/shapes.test.ts`

**概述：** 每个 shape 文件导出一个函数，接收 params → 返回一个 Three.js `BufferGeometry` 或一个 geometry 数组（用于组合体）。复杂形状（L/U/T/阶梯/裙楼塔楼）使用多个 BoxGeometry 的 CSG 合并或返回 group 子网格数组。

此任务代码量较大，实现时每个形状单独编写测试（验证返回的 geometry 不为 null，且顶点数 > 0），然后实现。

**Step 1: 编写测试**
```typescript
// src/__tests__/shapes.test.ts
import * as THREE from 'three'
import { createBuildingGeometries } from '../components/Buildings/BuildingFactory'

describe('BuildingFactory', () => {
  const types = [
    'box', 'cylinder', 'prism', 'l-shape', 'u-shape',
    't-shape', 'stepped', 'podium-tower', 'dome', 'gable-roof',
  ] as const

  types.forEach(type => {
    it(`should create geometry for ${type}`, () => {
      const result = createBuildingGeometries(type, undefined)
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
      result.forEach(item => {
        expect(item.geometry).toBeInstanceOf(THREE.BufferGeometry)
        expect(item.position).toBeDefined()
      })
    })
  })
})
```

**Step 2: Run test — confirm it fails**
Expected: FAIL

**Step 3: Write implementation**
每个 shape 文件导出 `create<Shape>Geometries(params) => GeometryItem[]`。

`BuildingFactory.ts` 汇总：
```typescript
// src/components/Buildings/BuildingFactory.ts
import * as THREE from 'three'
import type { BuildingType } from '../../types'
import { getDefaultParams } from '../../utils/buildings'

export interface GeometryItem {
  geometry: THREE.BufferGeometry
  position: [number, number, number]
}

export function createBuildingGeometries(
  type: BuildingType,
  params?: Record<string, number>,
): GeometryItem[] {
  const p = params ?? getDefaultParams(type)

  switch (type) {
    case 'box':
      return [{ geometry: new THREE.BoxGeometry(p.width, p.height, p.depth), position: [0, p.height / 2, 0] }]
    case 'cylinder':
      return [{ geometry: new THREE.CylinderGeometry(p.radius, p.radius, p.height, p.segments || 32), position: [0, p.height / 2, 0] }]
    case 'prism':
      return [{ geometry: new THREE.CylinderGeometry(p.radius, p.radius, p.height, p.sides || 6), position: [0, p.height / 2, 0] }]
    case 'l-shape':
      return createLShape(p)
    case 'u-shape':
      return createUShape(p)
    case 't-shape':
      return createTShape(p)
    case 'stepped':
      return createStepped(p)
    case 'podium-tower':
      return createPodiumTower(p)
    case 'dome':
      return createDome(p)
    case 'gable-roof':
      return createGableRoof(p)
    default:
      return [{ geometry: new THREE.BoxGeometry(10, 30, 10), position: [0, 15, 0] }]
  }
}

function createLShape(p: Record<string, number>): GeometryItem[] {
  const w = p.width, h = p.height
  return [
    { geometry: new THREE.BoxGeometry(p.wing1Length, h, w), position: [p.wing1Length / 2 - w / 2, h / 2, 0] },
    { geometry: new THREE.BoxGeometry(w, h, p.wing2Length), position: [0, h / 2, p.wing2Length / 2 - w / 2] },
  ]
}

function createUShape(p: Record<string, number>): GeometryItem[] {
  const w = p.width, h = p.height
  return [
    { geometry: new THREE.BoxGeometry(w, h, p.wing1Length), position: [-p.backLength / 2 + w / 2, h / 2, p.wing1Length / 2] },
    { geometry: new THREE.BoxGeometry(w, h, p.wing2Length), position: [p.backLength / 2 - w / 2, h / 2, p.wing2Length / 2] },
    { geometry: new THREE.BoxGeometry(p.backLength, h, w), position: [0, h / 2, 0] },
  ]
}

function createTShape(p: Record<string, number>): GeometryItem[] {
  const w = p.width, h = p.height
  return [
    { geometry: new THREE.BoxGeometry(p.crossLength, h, w), position: [0, h / 2, -p.stemLength / 2 + w / 2] },
    { geometry: new THREE.BoxGeometry(w, h, p.stemLength), position: [0, h / 2, 0] },
  ]
}

function createStepped(p: Record<string, number>): GeometryItem[] {
  const items: GeometryItem[] = []
  for (let i = 0; i < p.levels; i++) {
    const shrink = i * p.stepback * 2
    const w = p.baseWidth - shrink
    const d = p.baseDepth - shrink
    if (w <= 0 || d <= 0) break
    items.push({
      geometry: new THREE.BoxGeometry(w, p.levelHeight, d),
      position: [0, i * p.levelHeight + p.levelHeight / 2, 0],
    })
  }
  return items
}

function createPodiumTower(p: Record<string, number>): GeometryItem[] {
  return [
    { geometry: new THREE.BoxGeometry(p.podiumWidth, p.podiumHeight, p.podiumDepth), position: [0, p.podiumHeight / 2, 0] },
    { geometry: new THREE.BoxGeometry(p.towerWidth, p.towerHeight, p.towerDepth), position: [0, p.podiumHeight + p.towerHeight / 2, 0] },
  ]
}

function createDome(p: Record<string, number>): GeometryItem[] {
  return [
    { geometry: new THREE.CylinderGeometry(p.radius, p.radius, p.cylinderHeight, 32), position: [0, p.cylinderHeight / 2, 0] },
    { geometry: new THREE.SphereGeometry(p.radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, p.cylinderHeight, 0] },
  ]
}

function createGableRoof(p: Record<string, number>): GeometryItem[] {
  const roofGeom = new THREE.BufferGeometry()
  const hw = p.width / 2
  const hd = p.depth / 2
  const rh = p.ridgeHeight
  // Triangular prism roof via custom geometry
  const vertices = new Float32Array([
    -hw, 0, -hd, hw, 0, -hd, 0, rh, -hd,
    -hw, 0, hd, hw, 0, hd, 0, rh, hd,
    -hw, 0, -hd, 0, rh, -hd, 0, rh, hd, -hw, 0, hd,
    hw, 0, -hd, hw, 0, hd, 0, rh, hd, 0, rh, -hd,
  ])
  const indices = [
    0, 1, 2, 3, 5, 4,
    6, 7, 8, 6, 8, 9,
    10, 11, 12, 10, 12, 13,
  ]
  roofGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  roofGeom.setIndex(indices)
  roofGeom.computeVertexNormals()

  return [
    { geometry: new THREE.BoxGeometry(p.width, p.wallHeight, p.depth), position: [0, p.wallHeight / 2, 0] },
    { geometry: roofGeom, position: [0, p.wallHeight, 0] },
  ]
}
```

**Step 4: Run test — confirm it passes**
Expected: PASS

**Step 5: Commit**
```bash
git add -A && git commit -m "feat: 建筑几何体生成器"
```

---

## Task 8: 3D 场景核心组件（Canvas、Ground、SunLight、Camera）

**Files:**
- Create: `src/components/Scene/SceneCanvas.tsx`
- Create: `src/components/Scene/Ground.tsx`
- Create: `src/components/Scene/SunLight.tsx`
- Create: `src/components/Scene/SunIndicator.tsx`
- Create: `src/components/Scene/CameraControls.tsx`
- Create: `src/hooks/useSunPosition.ts`

**概述：** 搭建 R3F Canvas，包含地面、太阳光照（DirectionalLight + shadow）、环境光、OrbitControls、太阳位置指示球体。

**实现要点：**
- `SceneCanvas`: R3F `<Canvas>` 容器，设置 shadows, camera fov/position
- `Ground`: `<mesh>` + `PlaneGeometry(200,200)`, receiveShadow, 浅灰色
- `SunLight`: `<directionalLight>` 位置由 useSunPosition 驱动, castShadow, shadow.mapSize=2048
- `SunIndicator`: 小球体标示太阳位置（跟随灯光方向）
- `CameraControls`: OrbitControls from drei
- `useSunPosition`: 封装 store 中的 location+dateTime → 调用 getSunData → 返回 SunData

由于 R3F 组件依赖 Canvas 上下文，不适合纯单元测试。此任务以手动验证为主：启动 dev server 后确认场景渲染正常。

**Step 1: 实现 useSunPosition hook**
```typescript
// src/hooks/useSunPosition.ts
import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { getSunData, sunToLightPosition } from '../utils/sunCalc'
import type { SunData } from '../types'

export function useSunPosition() {
  const location = useStore(s => s.location)
  const dateTime = useStore(s => s.dateTime)

  const sunData = useMemo(
    () => getSunData(location.lat, location.lng, dateTime),
    [location.lat, location.lng, dateTime],
  )

  const lightPosition = useMemo(
    () => sunToLightPosition(sunData.azimuth, sunData.altitude),
    [sunData.azimuth, sunData.altitude],
  )

  const ambientIntensity = useMemo(() => {
    if (sunData.isNight) return 0.1
    return Math.max(0.15, Math.min(0.6, sunData.altitude / (Math.PI / 2) * 0.6))
  }, [sunData.altitude, sunData.isNight])

  const directionalIntensity = useMemo(() => {
    if (sunData.isNight) return 0
    return Math.max(0, Math.min(2.0, sunData.altitude / (Math.PI / 4) * 1.5))
  }, [sunData.altitude, sunData.isNight])

  return {
    ...sunData,
    lightPosition,
    ambientIntensity,
    directionalIntensity,
  }
}
```

**Step 2: 实现场景组件**
（各组件代码见上方设计文档结构，此处不再完整列出。实现者按上述 hook 的输出驱动灯光和环境光即可。）

**Step 3: 验证**
```bash
npm run dev
```
Expected: 浏览器中看到灰色地面 + 可旋转视角

**Step 4: Commit**
```bash
git add -A && git commit -m "feat: 3D 场景核心组件"
```

---

## Task 9: 建筑物渲染组件

**Files:**
- Create: `src/components/Buildings/BuildingMesh.tsx`
- Create: `src/components/Buildings/BuildingGroup.tsx`

**概述：** 
- `BuildingMesh`: 接收一个 Building 对象，调用 BuildingFactory 生成几何体，渲染为 mesh group。支持 castShadow + receiveShadow。点击选中。
- `BuildingGroup`: 遍历 store 中所有 buildings 渲染 BuildingMesh。

**实现要点：**
- 使用 `useMemo` 缓存 geometry
- 选中建筑高亮边框（drei 的 `<Edges>` 或 outlinePass）
- 点击事件：`onClick` → `selectBuilding(id)`

**验证：** 在 store 中手动添加一个 building，刷新页面看到 3D 建筑物带阴影。

**Commit:**
```bash
git add -A && git commit -m "feat: 建筑物渲染组件"
```

---

## Task 10: 顶部工具栏 + 建筑形状选择

**Files:**
- Create: `src/components/Toolbar/Toolbar.tsx`
- Create: `src/components/Toolbar/BuildingTools.tsx`
- Create: `src/components/Toolbar/CitySelector.tsx`

**概述：**
- `Toolbar`: 顶部固定栏容器（Ant Design Layout.Header）
- `BuildingTools`: 10 个建筑形状按钮（icon + label），点击后创建建筑放到场景中心
- `CitySelector`: Ant Design Select，数据来自 HOT_CITIES，选择后更新 store location

**验证：** 点击形状按钮 → 场景中出现对应建筑。切换城市 → 阴影角度变化。

**Commit:**
```bash
git add -A && git commit -m "feat: 顶部工具栏与建筑形状选择"
```

---

## Task 11: 侧边栏 — 建筑列表与属性编辑

**Files:**
- Create: `src/components/Sidebar/Sidebar.tsx`
- Create: `src/components/Sidebar/BuildingList.tsx`
- Create: `src/components/Sidebar/BuildingEditor.tsx`

**概述：**
- `BuildingList`: 展示所有建筑，点击选中，显示颜色标记和名称
- `BuildingEditor`: 选中建筑后展示其参数（Ant Design InputNumber / Slider），支持修改尺寸、旋转角度、颜色（ColorPicker）、删除按钮

**验证：** 添加建筑 → 列表更新。选中 → 编辑参数 → 3D 模型实时变化。删除 → 从列表和场景中移除。

**Commit:**
```bash
git add -A && git commit -m "feat: 侧边栏建筑列表与属性编辑"
```

---

## Task 12: 底部控制栏 — 时间轴 + 日期轴 + 播放控制

**Files:**
- Create: `src/components/Controls/BottomBar.tsx`
- Create: `src/components/Controls/TimeSlider.tsx`
- Create: `src/components/Controls/DateSlider.tsx`
- Create: `src/components/Controls/PlaybackControls.tsx`
- Create: `src/hooks/usePlayback.ts`

**概述：**
- `TimeSlider`: Ant Design Slider，范围 0-1440 分钟，标注日出/日落位置，拖动更新 store dateTime 的时分
- `DateSlider`: Ant Design Slider，范围 1-365 天，拖动更新 store dateTime 的月日
- `PlaybackControls`: 播放/暂停按钮 + 倍速选择（1x/2x/5x/10x）
- `usePlayback`: 播放时用 `requestAnimationFrame` 自动递增时间

**验证：** 拖动时间轴 → 阴影角度实时变化。拖动日期轴 → 阴影长度变化 + 日出日落时间更新。点播放 → 阴影动画。

**Commit:**
```bash
git add -A && git commit -m "feat: 底部控制栏时间轴与播放控制"
```

---

## Task 13: 太阳信息面板

**Files:**
- Create: `src/components/SunInfo/SunInfoPanel.tsx`

**概述：**
在工具栏或底部栏中展示：
- 🌅 日出时间
- 🌇 日落时间
- ☀️ 日照时长
- 📐 太阳高度角（度）
- 🧭 太阳方位角（度）

数据来自 `useSunPosition` hook，格式化显示。

**Commit:**
```bash
git add -A && git commit -m "feat: 太阳信息面板"
```

---

## Task 14: 地图选点弹窗（高德地图）

**Files:**
- Create: `src/components/MapPicker/MapModal.tsx`
- Create: `public/index.html` — 添加高德地图 JS API script（或在 index.html 中引入）

**概述：**
- Ant Design Modal 弹窗
- 内嵌高德地图（AMap JS API 2.0），支持点击获取经纬度
- 搜索框 + 高德地理编码 API
- 确认后更新 store location

**注意：** 高德地图需要 API key，先在代码中用占位符 `YOUR_AMAP_KEY`，用户部署时替换。也可使用环境变量 `VITE_AMAP_KEY`。

**验证：** 打开弹窗 → 看到地图 → 点击选点 → 确认 → 阴影变化。

**Commit:**
```bash
git add -A && git commit -m "feat: 高德地图选点弹窗"
```

---

## Task 15: App 整体布局组装

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

**概述：**
将所有组件组装到一起：
```
<div className="app">
  <Toolbar />
  <div className="main-content">
    <SceneCanvas />
    <Sidebar />
  </div>
  <BottomBar />
</div>
```

CSS: flex 布局，Toolbar 固定顶部，BottomBar 固定底部，中间 main-content flex:1，SceneCanvas 占满剩余，Sidebar 固定宽度 280px。

**验证：** 全部功能端到端可用。

**Commit:**
```bash
git add -A && git commit -m "feat: App 整体布局组装"
```

---

## Task 16: 建筑拖拽移动

**Files:**
- Modify: `src/components/Buildings/BuildingMesh.tsx`

**概述：**
- 选中建筑后支持拖拽移动位置
- 使用 drei 的 `useDrag` 或自定义 pointer events
- 拖拽时在地面平面上投射 raycaster 计算新位置
- 松手后更新 store building.position

**Commit:**
```bash
git add -A && git commit -m "feat: 建筑拖拽移动"
```

---

## Task 17: 场景导入导出 (localStorage)

**Files:**
- Create: `src/utils/storage.ts`
- Test: `src/__tests__/storage.test.ts`

**概述：**
- `saveScene()`: 将 buildings + location + dateTime 序列化存入 localStorage
- `loadScene()`: 从 localStorage 加载恢复
- `exportScene()`: 导出为 JSON 文件下载
- `importScene()`: 从 JSON 文件导入
- 自动保存（store 变化时 debounce 保存）

**Commit:**
```bash
git add -A && git commit -m "feat: 场景导入导出"
```

---

## Task 18: 样式打磨与响应式

**Files:**
- Modify: `src/App.css`
- Create: `src/styles/theme.ts`

**概述：**
- Ant Design 主题定制（暗色/亮色可选）
- 底部控制栏样式打磨
- 工具栏图标与间距优化
- 窗口缩小时侧边栏可折叠

**Commit:**
```bash
git add -A && git commit -m "style: 样式打磨与响应式"
```

---

## 执行顺序总结

| 阶段 | 任务 | 依赖 |
|------|------|------|
| 基础 | Task 1 脚手架 | 无 |
| 基础 | Task 2 类型定义 | Task 1 |
| 数据 | Task 3 城市数据 | Task 2 |
| 数据 | Task 4 太阳计算 | Task 2 |
| 数据 | Task 5 建筑参数 | Task 2 |
| 数据 | Task 6 状态管理 | Task 2, 5 |
| 3D | Task 7 几何体生成 | Task 5 |
| 3D | Task 8 场景组件 | Task 4, 6 |
| 3D | Task 9 建筑渲染 | Task 7, 8 |
| UI | Task 10 工具栏 | Task 3, 5, 6 |
| UI | Task 11 侧边栏 | Task 6 |
| UI | Task 12 时间轴 | Task 4, 6 |
| UI | Task 13 太阳信息 | Task 4 |
| UI | Task 14 地图选点 | Task 6 |
| 集成 | Task 15 布局组装 | Task 8-14 |
| 交互 | Task 16 拖拽 | Task 9 |
| 持久化 | Task 17 导入导出 | Task 6 |
| 打磨 | Task 18 样式 | Task 15 |
