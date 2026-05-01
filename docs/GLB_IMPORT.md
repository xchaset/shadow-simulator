# GLB 模型导入功能

## 功能概述

Shadow Simulator 现在支持导入 GLB/GLTF 格式的 3D 模型，可以将 Blender、SketchUp 等建模软件制作的建筑模型直接导入到场景中。

## 使用流程

### 1. 在 Blender 中准备模型

#### 建模要点
- 使用 Blender 创建建筑模型
- 确保模型原点在底部中心（便于放置）
- 应用所有变换：`Ctrl + A` → `All Transforms`
- 检查法线方向：编辑模式 → `Alt + N` → `Recalculate Outside`

#### 导出设置
1. `File` → `Export` → `glTF 2.0 (.glb/.gltf)`
2. 关键设置：
   - **Format**: `GLB` (推荐，单文件包含贴图)
   - **Transform**: 勾选 `+Y Up` (ThreeJS 使用 Y 轴向上)
   - **Geometry**: 勾选 `Apply Modifiers`、`UVs`、`Normals`
   - **Compression**: 勾选 `Draco` (可选，大幅减小文件体积)

### 2. 在 Shadow Simulator 中导入

1. 点击工具栏的 **GLB** 按钮
2. 拖拽或选择 `.glb` / `.gltf` 文件上传（最大 50MB）
3. 调整模型缩放比例（如果模型太大或太小）
4. 点击"添加到场景"

### 3. 编辑 GLB 模型

选中 GLB 模型后，可以在右侧编辑面板中：
- 调整缩放比例（0.01 - 100）
- 旋转角度（0 - 360°）
- 使用方向键移动位置
- 复制粘贴（Ctrl+C / Ctrl+V）

## 技术实现

### 前端
- **类型定义**: 新增 `'glb'` 建筑类型，Building 接口增加 `glbUrl` 和 `glbScale` 字段
- **组件**:
  - `GlbBuildingMesh.tsx`: 使用 GLTFLoader 加载和渲染 GLB 模型
  - `GlbImporter.tsx`: 文件上传和参数配置 UI
- **加载器**: 使用 Three.js 的 GLTFLoader + DRACOLoader（支持压缩）
- **渲染**: 自动启用阴影投射和接收

### 后端
- **路由**: `/api/upload/glb` (POST) 上传文件
- **存储**: 文件保存在 `backend/data/uploads/glb/` 目录
- **访问**: `/api/uploads/glb/:filename` (GET) 下载文件
- **限制**: 50MB 文件大小限制，仅支持 `.glb` 和 `.gltf` 格式

## 常见问题

### Q: 模型加载失败显示红色线框？
A: 检查：
1. 文件格式是否正确（.glb 或 .gltf）
2. 文件是否损坏
3. 浏览器控制台是否有错误信息
4. 后端服务是否正常运行

### Q: 模型太大或太小？
A: 在编辑面板中调整"缩放"参数，或在 Blender 中重新导出时调整模型尺寸。

### Q: 模型方向不对？
A: 确保 Blender 导出时勾选了 `+Y Up` 选项。如果已导出，可以在场景中旋转模型。

### Q: 模型没有材质/颜色？
A: GLB 模型使用自身的材质，不受 Shadow Simulator 的颜色设置影响。请在 Blender 中设置好材质后再导出。

### Q: 如何优化文件大小？
A: 
1. Blender 导出时开启 Draco 压缩（可减小 50-90%）
2. 减少多边形数量（使用 Decimate 修改器）
3. 压缩纹理贴图（降低分辨率，使用 JPG 而非 PNG）

## 示例工作流

```
1. Blender 建模
   ↓
2. 导出 GLB (勾选 +Y Up, Draco)
   ↓
3. Shadow Simulator 导入
   ↓
4. 调整缩放和位置
   ↓
5. 模拟阴影效果
```

## 文件结构

```
frontend/src/
├── components/
│   ├── Buildings/
│   │   ├── GlbBuildingMesh.tsx      # GLB 模型渲染组件
│   │   └── BuildingGroup.tsx        # 更新：区分 GLB 和普通建筑
│   └── Toolbar/
│       └── GlbImporter.tsx          # GLB 上传 UI
├── types/index.ts                   # 更新：Building 类型增加 glbUrl/glbScale
└── utils/
    ├── api.ts                       # 更新：glbApi 上传接口
    └── buildings.ts                 # 更新：glb 预设配置

backend/src/
└── routes/
    └── uploads.ts                   # GLB 文件上传路由
```

## 未来改进

- [ ] 支持 FBX、OBJ 等其他 3D 格式
- [ ] 模型预览缩略图
- [ ] 批量导入多个模型
- [ ] 模型库管理（保存常用模型）
- [ ] 自动计算模型边界框并调整缩放
- [ ] 支持带动画的 GLB 模型
