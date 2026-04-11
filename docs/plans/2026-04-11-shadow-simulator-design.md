# 建筑阴影模拟器 — 设计文档

> 日期: 2026-04-11
> 状态: 已确认

## 1. 产品概述

基于地理位置、日期、时间的建筑阴影模拟器。用户可自建建筑模型，通过时间轴控制太阳位置，实时观察建筑物之间的阴影变化。

### 核心功能
- 🏗️ 建筑物自主建模（10+ 预设形状）
- ☀️ 基于太阳天文学的实时阴影渲染
- 🌍 地理位置选择（热门城市 + 地图选点）
- ⏱️ 时间轴控制（日期 + 时间），阴影实时联动
- 🌅 日出日落时间计算与展示
- 🎨 3D 渲染，简洁示意风格

### 技术决策
| 决策项 | 选择 | 理由 |
|--------|------|------|
| 平台 | Web 应用 | 零安装，门槛低 |
| 框架 | React 18 + TypeScript | 生态成熟 |
| 3D 引擎 | @react-three/fiber + drei | 组件化 3D，社区活跃 |
| 地图 | 高德地图 JS API 2.0 | 国内用户体验好 |
| 后端 | 无（纯前端） | 所有计算客户端完成 |
| 视觉风格 | 简洁示意 | 突出阴影效果，性能好 |
| 状态管理 | Zustand | 轻量，适合中小项目 |
| UI 组件 | Ant Design | 丰富的控件支持 |
| 构建工具 | Vite | 快速 HMR |

---

## 2. 页面布局

```
┌─────────────────────────────────────────────────┐
│  顶部工具栏                                       │
│  [城市选择] [经纬度显示] [日出/日落时间] [建筑工具] │
├────────────────────────────┬────────────────────┤
│                            │                    │
│     3D 场景视口（主区域）    │   侧边面板          │
│     - 建筑物渲染            │   - 建筑列表        │
│     - 阴影实时投射          │   - 选中建筑属性     │
│     - 地面网格             │   - 形状/尺寸调整    │
│     - 太阳位置指示          │                    │
│                            │                    │
├────────────────────────────┴────────────────────┤
│  底部控制栏                                       │
│  [日期时间轴] [时间轴] [播放控制] [太阳信息]       │
└─────────────────────────────────────────────────┘
```

---

## 3. 项目结构

```
src/
├── components/
│   ├── Scene/              # 3D 场景
│   │   ├── SceneCanvas.tsx  # R3F Canvas 容器
│   │   ├── Ground.tsx       # 地面平面
│   │   ├── SunLight.tsx     # 太阳灯光（DirectionalLight）
│   │   ├── SunIndicator.tsx # 太阳位置可视化指示
│   │   └── CameraControls.tsx
│   ├── Buildings/
│   │   ├── BuildingMesh.tsx     # 通用建筑渲染组件
│   │   ├── shapes/              # 各形状几何体生成
│   │   │   ├── BoxShape.ts
│   │   │   ├── CylinderShape.ts
│   │   │   ├── PrismShape.ts
│   │   │   ├── LShape.ts
│   │   │   ├── UShape.ts
│   │   │   ├── TShape.ts
│   │   │   ├── SteppedShape.ts
│   │   │   ├── PodiumTower.ts
│   │   │   ├── DomeShape.ts
│   │   │   └── GableRoof.ts
│   │   └── BuildingFactory.ts   # 形状工厂
│   ├── Controls/
│   │   ├── TimeSlider.tsx       # 时间轴滑块
│   │   ├── DateSlider.tsx       # 日期轴滑块
│   │   ├── PlaybackControls.tsx # 播放/暂停/倍速
│   │   └── BottomBar.tsx        # 底部控制栏容器
│   ├── MapPicker/
│   │   ├── MapModal.tsx         # 地图选点弹窗
│   │   └── CitySelector.tsx     # 热门城市下拉选择
│   ├── Sidebar/
│   │   ├── BuildingList.tsx     # 建筑列表
│   │   └── BuildingEditor.tsx   # 建筑属性编辑面板
│   ├── Toolbar/
│   │   ├── Toolbar.tsx          # 顶部工具栏
│   │   └── BuildingTools.tsx    # 建筑形状选择工具
│   └── SunInfo/
│       └── SunInfoPanel.tsx     # 日出日落 & 太阳角度信息
├── hooks/
│   ├── useSunPosition.ts       # SunCalc 封装
│   ├── useBuildings.ts         # 建筑 CRUD 操作
│   └── usePlayback.ts          # 播放控制逻辑
├── utils/
│   ├── sunCalc.ts              # 太阳位置 & 日出日落计算
│   ├── buildings.ts            # 建筑形状参数定义 & 默认值
│   └── cities.ts               # 热门城市预设数据
├── store/
│   └── useStore.ts             # Zustand 全局 store
├── types/
│   └── index.ts                # TypeScript 类型定义
├── App.tsx
└── main.tsx
```

---

## 4. 建筑建模系统

### 4.1 预设建筑形状

| 形状 | 类型标识 | 可调参数 |
|------|----------|----------|
| 长方体 | `box` | 长、宽、高 |
| 圆柱体 | `cylinder` | 半径、高度、分段数 |
| 棱柱体 | `prism` | 边数、外接半径、高度 |
| L 形 | `l-shape` | 两翼长度、宽度、高度 |
| U 形 | `u-shape` | 三翼长度、宽度、高度 |
| T 形 | `t-shape` | 横翼/纵翼长宽、高度 |
| 阶梯退台 | `stepped` | 底部尺寸、层数、每层缩进量、层高 |
| 裙楼+塔楼 | `podium-tower` | 裙楼尺寸、塔楼尺寸、各自高度 |
| 穹顶 | `dome` | 半径、柱体高度 |
| 坡屋顶 | `gable-roof` | 长、宽、墙高、屋脊高 |

### 4.2 数据结构

```typescript
type BuildingType = 'box' | 'cylinder' | 'prism' | 'l-shape' | 'u-shape' 
  | 't-shape' | 'stepped' | 'podium-tower' | 'dome' | 'gable-roof'

interface Building {
  id: string
  name: string
  type: BuildingType
  params: Record<string, number>   // 各形状对应的尺寸参数
  position: [x: number, z: number] // 地面位置
  rotation: number                 // Y轴旋转角度（度）
  color: string                    // 建筑颜色
}
```

### 4.3 交互
1. 工具栏选择形状 → 点击地面放置
2. 选中建筑 → 侧边栏编辑参数
3. 拖拽移动建筑位置
4. 右键菜单：复制 / 删除

---

## 5. 太阳与阴影系统

### 5.1 太阳位置计算

使用 SunCalc 库，输入 (纬度, 经度, 日期时间) → 输出 (方位角, 高度角, 日出, 日落)。

```typescript
function useSunPosition(lat: number, lng: number, date: Date) {
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
```

### 5.2 Three.js 阴影方案

- **DirectionalLight** 模拟太阳平行光
- 位置根据 azimuth + altitude 计算：
  ```typescript
  function sunToLightPosition(azimuth: number, altitude: number, distance = 100) {
    const x = distance * Math.cos(altitude) * Math.sin(azimuth)
    const y = distance * Math.sin(altitude)
    const z = distance * Math.cos(altitude) * Math.cos(azimuth)
    return [x, y, z]
  }
  ```
- Shadow map: 2048×2048，正交相机覆盖场景
- 所有建筑 `castShadow + receiveShadow`
- 地面 `receiveShadow`
- 建筑互相遮挡阴影由 Three.js shadow map 自动处理

### 5.3 光照效果
- 太阳高度角低 → 阴影长
- 太阳高度角高 → 阴影短
- 夜间（altitude < 0）→ 场景变暗，无阴影
- 环境光 (AmbientLight) 亮度随太阳高度角调整

---

## 6. 控制面板

### 6.1 时间轴
- 范围：当日日出前1h ~ 日落后1h
- Ant Design Slider，步长 1 分钟
- 日出/日落位置用标记点标注

### 6.2 日期轴
- 范围：1月1日 ~ 12月31日
- 拖动改变日期，日出/日落时间随之更新

### 6.3 播放控制
- ▶ 播放 / ⏸ 暂停
- 倍速：1x / 2x / 5x / 10x
- 播放时自动推进时间，3D 场景实时联动

### 6.4 日出日落信息
- 日出时间、日落时间
- 日照时长
- 当前太阳高度角、方位角

---

## 7. 地理位置系统

### 7.1 热门城市选择器
顶部工具栏下拉，预设 10+ 国内热门城市，含经纬度。

### 7.2 地图选点
弹窗形式，集成高德地图 JS API 2.0：
- 点击地图获取经纬度
- 搜索框支持地址搜索（地理编码 API）
- 确认后更新全局位置

---

## 8. 全局状态 (Zustand)

```typescript
interface AppState {
  // 位置
  location: { lat: number; lng: number; cityName: string }
  setLocation: (loc: { lat: number; lng: number; cityName: string }) => void

  // 日期时间
  dateTime: Date
  setDateTime: (dt: Date) => void

  // 建筑物
  buildings: Building[]
  addBuilding: (b: Building) => void
  updateBuilding: (id: string, updates: Partial<Building>) => void
  removeBuilding: (id: string) => void

  // 选中建筑
  selectedBuildingId: string | null
  selectBuilding: (id: string | null) => void

  // 播放
  playback: { playing: boolean; speed: number }
  setPlayback: (p: Partial<{ playing: boolean; speed: number }>) => void
}
```

---

## 9. 性能优化

- 时间轴拖动：`requestAnimationFrame` 节流
- Shadow map：拖动中降分辨率 (1024)，松手后恢复 (2048)
- 建筑 geometry 缓存，参数不变不重建
- React.memo 避免无关组件重渲染

---

## 10. 测试策略

- **单元测试**: 太阳位置计算、建筑几何体生成、城市数据
- **组件测试**: 各 UI 控件交互逻辑
- **集成测试**: 时间轴拖动 → 阴影变化联动
- **E2E**: 完整工作流（选城市 → 放建筑 → 拖时间 → 观察阴影）
