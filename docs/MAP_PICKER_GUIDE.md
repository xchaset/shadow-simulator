# 高德地图选点功能配置指南

## 1. 概述

本文档详细介绍了如何在 Shadow Simulator 项目中配置和使用高德地图选点功能。该功能允许用户通过地图界面直观地选择地理位置，支持点击选点、搜索选点、坐标获取与转换等多种方式。

## 2. 前置要求

### 2.1 高德地图开发者账号

在使用高德地图 API 之前，您需要：

1. 注册 [高德开放平台](https://lbs.amap.com/) 开发者账号
2. 完成实名认证
3. 获取 API Key

### 2.2 技术栈

- React 19+
- TypeScript
- Vite
- Ant Design

## 3. 快速开始

### 3.1 安装依赖

项目已经安装了高德地图 JS API Loader 依赖，如果需要重新安装：

```bash
cd frontend
npm install @amap/amap-jsapi-loader
```

### 3.2 获取 API Key

1. 登录 [高德开放平台控制台](https://console.amap.com/dev/key/app)
2. 点击「应用管理」→「我的应用」
3. 点击「创建新应用」，填写应用名称和类型
4. 点击「添加新 Key」，选择「Web 端（JS API）」
5. 提交后获取 API Key

**注意**：
- 选择「Web 端（JS API）」类型，不要选择 Android 或 iOS
- 可以设置安全密钥（可选，但推荐）
- 可以设置域名白名单（生产环境推荐）

### 3.3 配置环境变量

1. 在 `frontend` 目录下创建 `.env` 文件：

```bash
cd frontend
cp .env.example .env
```

2. 编辑 `.env` 文件，填入您的 API Key：

```env
VITE_AMAP_KEY=your_actual_api_key_here
```

**重要**：
- 不要将包含真实 API Key 的 `.env` 文件提交到版本控制
- 确保 `.env` 文件已添加到 `.gitignore`

## 4. 功能详解

### 4.1 地图初始化

地图组件位于 `frontend/src/components/MapPicker/MapModal.tsx`，使用以下参数初始化：

```typescript
const map = new AMap.Map(container, {
  zoom: 13,                    // 初始缩放级别
  center: [lng, lat],          // 初始中心点坐标
  resizeEnable: true,          // 自动调整大小
  dragEnable: true,            // 启用拖拽
  zoomEnable: true,            // 启用缩放
  scrollWheel: true,           // 启用滚轮缩放
  doubleClickZoom: false,      // 禁用双击缩放（避免冲突）
  keyboardEnable: true,        // 启用键盘操作
})
```

### 4.2 地图控件配置

组件配置了以下地图控件：

| 控件 | 功能 | 位置 |
|------|------|------|
| ToolBar | 缩放按钮、平移工具 | 左上角 (LT) |
| Scale | 比例尺 | 左下角 (LB) |
| Geolocation | 定位功能 | 默认位置 |

#### 4.2.1 缩放控件 (ToolBar)

```typescript
const toolbar = new AMap.ToolBar({
  position: 'LT',        // 左上角
  offset: [10, 10]       // 偏移量
})
map.addControl(toolbar)
```

#### 4.2.2 比例尺控件 (Scale)

```typescript
const scale = new AMap.Scale({
  position: 'LB',        // 左下角
  offset: [10, 10]
})
map.addControl(scale)
```

#### 4.2.3 定位控件 (Geolocation)

```typescript
const geolocation = new AMap.Geolocation({
  enableHighAccuracy: true,    // 高精度模式
  timeout: 10000,              // 超时时间 10 秒
  zoomToAccuracy: true,        // 自动缩放定位结果
  showButton: true,            // 显示定位按钮
  showMarker: true,            // 显示定位标记
  showCircle: true,            // 显示精度范围圆
})
map.addControl(geolocation)
```

### 4.3 选点功能实现

#### 4.3.1 点击选点

用户可以直接点击地图上的任意位置进行选点：

```typescript
map.on('click', (e) => {
  const { lnglat } = e
  const newLng = lnglat.getLng()
  const newLat = lnglat.getLat()
  
  // 更新坐标状态
  setLng(newLng)
  setLat(newLat)
  
  // 移动标记到点击位置
  marker.setPosition(lnglat)
  
  // 根据坐标获取地址
  getAddressFromCoordinate(newLng, newLat)
})
```

#### 4.3.2 拖拽选点

用户可以拖动地图上的标记来调整位置：

```typescript
marker.on('dragend', (e) => {
  const { lnglat } = e
  const newLng = lnglat.getLng()
  const newLat = lnglat.getLat()
  
  setLng(newLng)
  setLat(newLat)
  
  getAddressFromCoordinate(newLng, newLat)
})
```

#### 4.3.3 搜索选点

组件集成了高德地图的搜索功能，用户可以通过搜索框快速定位：

```typescript
const placeSearch = new AMap.PlaceSearch({
  pageSize: 10,          // 每页显示数量
  pageIndex: 1,          // 当前页码
  extensions: 'base'     // 基础信息模式
})

// 执行搜索
placeSearch.search(keyword, (status, result) => {
  if (status === 'complete' && result.poiList) {
    // 处理搜索结果
    const pois = result.poiList.pois
    // ...
  }
})
```

### 4.4 坐标获取与转换

#### 4.4.1 坐标转地址 (逆地理编码)

```typescript
const geocoder = new AMap.Geocoder({
  radius: 1000,          // 搜索半径
  extensions: 'base'
})

geocoder.getAddress(lnglat, (status, result) => {
  if (status === 'complete' && result.regeocode) {
    const address = result.regeocode.formattedAddress
    const district = result.regeocode.addressComponent.district
    const city = result.regeocode.addressComponent.city
    const province = result.regeocode.addressComponent.province
    // ...
  }
})
```

#### 4.4.2 地址转坐标 (地理编码)

```typescript
geocoder.getLocation(address, (status, result) => {
  if (status === 'complete' && result.geocodes) {
    const location = result.geocodes[0].location
    const lng = location.getLng()
    const lat = location.getLat()
    // ...
  }
})
```

## 5. 类型声明

项目包含完整的 TypeScript 类型声明，位于 `frontend/src/types/amap.d.ts`，声明了以下核心类和接口：

- `AMap.Map` - 地图类
- `AMap.LngLat` - 经纬度类
- `AMap.Marker` - 标记类
- `AMap.ToolBar` - 缩放工具栏
- `AMap.Scale` - 比例尺
- `AMap.Geolocation` - 定位
- `AMap.Geocoder` - 地理编码/逆地理编码
- `AMap.PlaceSearch` - 地点搜索
- `AMap.AutoComplete` - 输入提示

## 6. 错误处理

### 6.1 常见错误处理

组件实现了以下错误处理逻辑：

1. **API Key 未配置**：
   - 显示友好的提示信息
   - 禁用地图相关功能
   - 保留手动输入坐标的功能

2. **地图加载失败**：
   - 捕获并显示错误信息
   - 提供检查 API Key 的建议

3. **搜索失败**：
   - 显示搜索中状态
   - 搜索失败时显示"未找到相关地点"

4. **定位失败**：
   - 由高德地图 Geolocation 组件自动处理
   - 可通过回调获取详细错误信息

### 6.2 错误提示

```typescript
// API Key 未配置
if (!hasApiKey) {
  setMapError('未配置高德地图 API Key')
  return
}

// 地图加载失败
try {
  const AMap = await loadAMap({ ... })
} catch (error) {
  console.error('高德地图加载失败:', error)
  setMapError(error instanceof Error ? error.message : '地图加载失败')
}
```

## 7. 兼容性考虑

### 7.1 浏览器兼容性

高德地图 JS API 2.0 支持以下浏览器：

| 浏览器 | 支持版本 |
|--------|----------|
| Chrome | 49+ |
| Firefox | 45+ |
| Safari | 10+ |
| Edge | 12+ |
| IE | 11 (部分支持) |

### 7.2 降级方案

组件提供了完整的降级方案：

1. **无 API Key 时**：
   - 显示占位地图区域
   - 保留手动输入坐标的功能
   - 用户可以直接输入经纬度选择位置

2. **地图加载失败时**：
   - 显示错误信息
   - 仍然可以手动输入坐标

3. **搜索功能不可用时**：
   - 用户仍然可以通过点击地图或输入坐标选点

### 7.3 响应式设计

组件使用相对单位和弹性布局，支持：

- 不同屏幕尺寸自适应
- 模态框宽度设置为 700px
- 地图区域高度 350px
- 使用 Ant Design 的 `Space` 组件实现响应式布局

## 8. 使用方法

### 8.1 打开地图选点

1. 在主界面点击顶部工具栏的地图图标
2. 地图选点弹窗将打开

### 8.2 选点方式

**方式一：点击地图**
- 直接在地图上点击任意位置
- 标记会移动到点击位置
- 自动获取该位置的地址信息

**方式二：搜索地址**
- 在搜索框中输入地址或地点名称
- 从搜索结果中选择目标位置
- 地图自动定位到所选位置

**方式三：拖动标记**
- 点击并拖动地图上的标记
- 释放后更新位置
- 自动获取新位置的地址

**方式四：手动输入坐标**
- 直接在纬度/经度输入框中输入数值
- 实时更新地图位置
- 支持 4 位小数精度

### 8.3 确认选择

选择位置后，点击「确定」按钮：
- 应用所选位置到场景
- 更新太阳位置计算
- 更新城市名称显示

## 9. 常见问题

### 9.1 地图不显示？

**可能原因**：
1. 未配置 API Key 或 Key 无效
2. API Key 类型错误（选择了 Android/iOS 而非 Web 端）
3. 域名白名单限制（生产环境）

**解决方法**：
1. 检查 `.env` 文件中的 `VITE_AMAP_KEY` 是否正确
2. 确认 API Key 类型为「Web 端（JS API）」
3. 检查浏览器控制台是否有错误信息

### 9.2 搜索功能不可用？

**可能原因**：
1. API Key 未启用搜索服务
2. 搜索服务配额已用完

**解决方法**：
1. 登录高德开放平台控制台检查 Key 权限
2. 检查服务配额使用情况

### 9.3 定位功能失败？

**可能原因**：
1. 浏览器不支持定位 API
2. 用户拒绝了定位权限
3. HTTPS 要求（部分浏览器）

**解决方法**：
1. 使用 HTTPS 协议访问
2. 检查浏览器定位权限设置
3. 确保网络连接正常

### 9.4 开发环境热更新问题？

**注意**：
- 地图组件使用 `destroyOnClose` 确保每次打开都重新初始化
- 组件卸载时会调用 `map.destroy()` 清理资源
- 开发环境热更新可能导致地图实例泄漏，建议刷新页面

## 10. 性能优化

### 10.1 懒加载

地图组件采用懒加载策略：
- 仅在弹窗打开时才加载地图 SDK
- 使用 `@amap/amap-jsapi-loader` 异步加载
- 弹窗关闭时销毁地图实例释放资源

### 10.2 资源清理

```typescript
useEffect(() => {
  return () => {
    if (mapRef.current) {
      mapRef.current.destroy()
    }
  }
}, [])
```

## 11. 安全建议

### 11.1 API Key 保护

1. **开发环境**：使用 `.env` 文件管理 Key，不要提交到 Git
2. **生产环境**：
   - 设置域名白名单（在高德控制台配置）
   - 使用安全密钥（可选）
   - 考虑使用代理服务中转请求

### 11.2 环境变量配置

确保 `.env` 文件已添加到 `.gitignore`：

```gitignore
# 环境变量
.env
.env.local
.env.*.local
```

## 12. 相关文件

| 文件路径 | 说明 |
|----------|------|
| `frontend/src/components/MapPicker/MapModal.tsx` | 地图选点组件 |
| `frontend/src/types/amap.d.ts` | 高德地图类型声明 |
| `frontend/.env.example` | 环境变量示例 |
| `frontend/package.json` | 依赖配置 |

## 13. 更新日志

| 日期 | 更新内容 |
|------|----------|
| 2026-05-05 | 初始版本，集成高德地图选点功能 |

---

**更多信息**：
- [高德地图 JS API 2.0 文档](https://lbs.amap.com/api/javascript-api/summary)
- [高德开放平台](https://lbs.amap.com/)
- [API Key 申请指南](https://lbs.amap.com/faq/account/key)
