import type { Building, BuildingType } from '../types'

export interface BuildingPreset {
  label: string
  icon: string
  defaultParams: Record<string, number>
  paramLabels: Record<string, string>
  defaultColor?: string
}

export const BUILDING_PRESETS: Record<BuildingType, BuildingPreset> = {
  box: {
    label: '长方体',
    icon: 'box',
    defaultParams: { width: 20, depth: 15, height: 50 },
    paramLabels: { width: '宽度', depth: '进深', height: '高度' },
  },
  cylinder: {
    label: '圆柱体',
    icon: 'cylinder',
    defaultParams: { radius: 10, height: 40, segments: 32 },
    paramLabels: { radius: '半径', height: '高度', segments: '分段数' },
  },
  prism: {
    label: '棱柱体',
    icon: 'prism',
    defaultParams: { sides: 6, radius: 12, height: 35 },
    paramLabels: { sides: '边数', radius: '外接半径', height: '高度' },
  },
  'l-shape': {
    label: 'L 形',
    icon: 'l-shape',
    defaultParams: { wing1Length: 30, wing2Length: 25, width: 12, height: 40 },
    paramLabels: { wing1Length: '翼1长度', wing2Length: '翼2长度', width: '宽度', height: '高度' },
  },
  'u-shape': {
    label: 'U 形',
    icon: 'u-shape',
    defaultParams: { wing1Length: 25, wing2Length: 25, backLength: 30, width: 10, height: 35 },
    paramLabels: { wing1Length: '翼1长度', wing2Length: '翼2长度', backLength: '底边长', width: '宽度', height: '高度' },
  },
  't-shape': {
    label: 'T 形',
    icon: 't-shape',
    defaultParams: { crossLength: 40, stemLength: 30, width: 12, height: 45 },
    paramLabels: { crossLength: '横翼长度', stemLength: '纵翼长度', width: '宽度', height: '高度' },
  },
  stepped: {
    label: '阶梯退台',
    icon: 'stepped',
    defaultParams: { baseWidth: 30, baseDepth: 25, levels: 3, stepback: 4, levelHeight: 15 },
    paramLabels: { baseWidth: '底部宽度', baseDepth: '底部进深', levels: '层数', stepback: '每层缩进', levelHeight: '层高' },
  },
  'podium-tower': {
    label: '裙楼+塔楼',
    icon: 'podium-tower',
    defaultParams: { podiumWidth: 40, podiumDepth: 30, podiumHeight: 15, towerWidth: 18, towerDepth: 15, towerHeight: 60 },
    paramLabels: { podiumWidth: '裙楼宽', podiumDepth: '裙楼深', podiumHeight: '裙楼高', towerWidth: '塔楼宽', towerDepth: '塔楼深', towerHeight: '塔楼高' },
  },
  dome: {
    label: '穹顶',
    icon: 'dome',
    defaultParams: { radius: 12, cylinderHeight: 20 },
    paramLabels: { radius: '半径', cylinderHeight: '柱体高度' },
  },
  'gable-roof': {
    label: '坡屋顶',
    icon: 'gable-roof',
    defaultParams: { width: 20, depth: 25, wallHeight: 12, ridgeHeight: 8 },
    paramLabels: { width: '宽度', depth: '进深', wallHeight: '墙高', ridgeHeight: '屋脊高' },
  },
  road: {
    label: '道路',
    icon: 'road',
    defaultParams: { length: 80, width: 12 },
    paramLabels: { length: '长度', width: '宽度' },
    defaultColor: '#708090',
  },
  'green-belt': {
    label: '绿化带',
    icon: 'green-belt',
    defaultParams: { length: 60, width: 6, height: 1.5 },
    paramLabels: { length: '长度', width: '宽度', height: '高度' },
    defaultColor: '#4CAF50',
  },
  tree: {
    label: '树木',
    icon: 'tree',
    defaultParams: { trunkHeight: 5, trunkRadius: 0.8, canopyRadius: 5, canopyHeight: 8 },
    paramLabels: { trunkHeight: '树干高', trunkRadius: '树干半径', canopyRadius: '树冠半径', canopyHeight: '树冠高' },
    defaultColor: '#2E7D32',
  },
  river: {
    label: '河流',
    icon: 'river',
    defaultParams: { length: 120, width: 10, depth: 3, curvature: 30, segments: 32 },
    paramLabels: { length: '长度', width: '宽度', depth: '深度', curvature: '弯曲度', segments: '分段数' },
    defaultColor: '#3B82C4',
  },
  'ai-circular': {
    label: 'AI 圆形建筑',
    icon: 'ai-circular',
    defaultParams: { radius: 15, segments: 48, levels: 3 },
    paramLabels: { radius: '半径', segments: '分段数', levels: '层数' },
  },
  'ai-complex': {
    label: 'AI 复杂建筑',
    icon: 'ai-complex',
    defaultParams: { levels: 3 },
    paramLabels: { levels: '层数' },
  },
  glb: {
    label: 'GLB 模型',
    icon: 'glb',
    defaultParams: { scale: 1 },
    paramLabels: { scale: '缩放' },
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
  const preset = BUILDING_PRESETS[type]
  const color = preset.defaultColor ?? COLORS[colorIndex % COLORS.length]
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
