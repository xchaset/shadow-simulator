import { useState } from 'react'
import { FloatButton, Modal, Typography, Collapse, Tag, Space } from 'antd'
import {
  QuestionCircleOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
  AimOutlined,
  BuildOutlined,
  CameraOutlined,
  FileAddOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CaretRightOutlined,
  BorderlessTableOutlined,
  DragOutlined,
  FolderOutlined,
  RiseOutlined,
  SelectOutlined,
  EyeOutlined,
  ShareAltOutlined,
} from '@ant-design/icons'
import { useStore } from '../../store/useStore'

const { Text, Paragraph } = Typography

interface GuideItem {
  key: string
  icon: React.ReactNode
  title: string
  tag?: string
  tagColor?: string
  desc: string
  tips?: string[]
  shortcuts?: { key: string; action: string }[]
}

const READ_ONLY_GUIDE_ITEMS: GuideItem[] = [
  {
    key: 'intro',
    icon: <ShareAltOutlined />,
    title: '关于此分享',
    tag: '只读模式',
    tagColor: 'blue',
    desc: '这是一个只读的阴影模拟分享链接。您可以查看场景、观察日照阴影效果，但无法编辑建筑、地形或保存更改。',
    tips: [
      '所有编辑功能已禁用',
      '如需编辑，请联系分享者获取原模型',
    ],
  },
  {
    key: 'view',
    icon: <EyeOutlined />,
    title: '视角控制',
    tag: '3D 视图',
    tagColor: 'orange',
    desc: '在 3D 场景中调整视角，从不同角度观察场景。',
    shortcuts: [
      { key: '左键拖动', action: '旋转视角' },
      { key: '右键拖动', action: '平移视角' },
      { key: '滚轮', action: '缩放' },
    ],
  },
  {
    key: 'timeline',
    icon: <CalendarOutlined />,
    title: '日期控制',
    tag: '左侧滑块',
    tagColor: 'volcano',
    desc: '拖动左侧垂直滑块选择一年中的日期，观察不同季节的日照变化。',
  },
  {
    key: 'time',
    icon: <ClockCircleOutlined />,
    title: '时间控制',
    tag: '底部滑块',
    tagColor: 'volcano',
    desc: '拖动底部水平滑块选择一天中的时刻，实时观察阴影变化。滑块上标注了日出和日落时间。',
  },
  {
    key: 'playback',
    icon: <CaretRightOutlined />,
    title: '时间播放',
    tag: '底部控制',
    tagColor: 'volcano',
    desc: '点击播放按钮自动推进时间，观察一天中阴影的动态变化。支持 1x ~ 30x 多种播放速度。',
  },
  {
    key: 'sun',
    icon: <AppstoreOutlined />,
    title: '太阳信息',
    tag: '顶部右侧',
    tagColor: 'default',
    desc: '实时显示当前日出时间、日落时间、日照时长、太阳高度角和方位角。夜间会显示"夜间"标识。',
  },
]

const FULL_GUIDE_ITEMS: GuideItem[] = [
  {
    key: 'project',
    icon: <FolderOutlined />,
    title: '项目管理',
    tag: '左侧面板',
    tagColor: 'blue',
    desc: '管理项目目录和场景模型。支持创建文件夹分类管理，每个场景可独立保存建筑、地形、画布设置等数据。',
    tips: [
      '右键目录或模型可进行重命名、复制、移动、删除等操作',
      '切换模型时会自动提示保存未保存的更改',
      '支持拖拽调整目录结构',
    ],
  },
  {
    key: 'city',
    icon: <EnvironmentOutlined />,
    title: '城市选择',
    tag: '顶部工具栏',
    tagColor: 'cyan',
    desc: '选择模拟所在的城市，系统会根据城市经纬度自动计算太阳轨迹和日照角度。',
    tips: [
      '内置多个主要城市，也可通过"选点"在地图上自定义位置',
    ],
  },
  {
    key: 'map',
    icon: <AimOutlined />,
    title: '地图选点',
    tag: '顶部工具栏',
    tagColor: 'cyan',
    desc: '在地图上点击选择精确的地理位置，获取经纬度坐标用于日照计算。',
  },
  {
    key: 'buildings',
    icon: <BuildOutlined />,
    title: '建筑工具',
    tag: '顶部工具栏',
    tagColor: 'cyan',
    desc: '快速添加预设建筑类型到场景中，包括住宅楼、写字楼、别墅、裙楼等多种建筑形态。',
    tips: [
      '点击建筑图标即可在场景中央添加对应类型的建筑',
      '添加后可在右侧面板编辑建筑属性',
    ],
  },
  {
    key: 'ai',
    icon: <CameraOutlined />,
    title: 'AI 图片生成建筑',
    tag: '顶部工具栏',
    tagColor: 'purple',
    desc: '上传建筑物照片，AI 自动分析建筑结构参数（楼层、尺寸、屋顶类型等），一键生成 3D 建筑模型。',
    tips: [
      '建议上传建筑正面或侧面的清晰照片',
      '支持多层复杂建筑的识别',
      '生成后可手动微调参数',
    ],
  },
  {
    key: 'glb',
    icon: <FileAddOutlined />,
    title: 'GLB 模型导入',
    tag: '顶部工具栏',
    tagColor: 'cyan',
    desc: '导入 GLB/GLTF 格式的 3D 模型文件，支持 Blender、SketchUp 等软件导出的模型。',
    tips: [
      '支持 .glb 和 .gltf 格式，最大 50MB',
      '导入时可调整模型缩放比例',
      'Blender 导出时建议勾选 "+Y Up" 并开启 Draco 压缩',
    ],
  },
  {
    key: 'terrain',
    icon: <RiseOutlined />,
    title: '地貌编辑',
    tag: '顶部工具栏',
    tagColor: 'green',
    desc: '开启地貌编辑模式，使用笔刷工具雕刻地形起伏，模拟真实地貌对日照的影响。',
    shortcuts: [
      { key: 'Alt + 左键拖动', action: '绘制地形' },
      { key: 'Q', action: '提升模式' },
      { key: 'W', action: '降低模式' },
      { key: 'E', action: '平滑模式' },
      { key: 'R', action: '平整模式' },
      { key: 'Ctrl+Z', action: '撤销' },
      { key: 'Ctrl+Shift+Z', action: '重做' },
    ],
    tips: [
      '在左侧面板底部可调整笔刷大小和强度',
      '建筑会自动贴合地形高度',
    ],
  },
  {
    key: 'scene',
    icon: <DragOutlined />,
    title: '场景交互',
    tag: '3D 视图',
    tagColor: 'orange',
    desc: '在 3D 场景中操作建筑和视角。',
    shortcuts: [
      { key: '左键拖动', action: '旋转视角' },
      { key: '右键拖动', action: '平移视角' },
      { key: '滚轮', action: '缩放' },
      { key: '点击建筑', action: '选中建筑' },
      { key: 'Ctrl + 点击', action: '多选建筑' },
      { key: '方向键', action: '微调建筑位置' },
      { key: 'Delete', action: '删除选中建筑' },
      { key: 'Ctrl+C / Ctrl+V', action: '复制粘贴建筑' },
    ],
  },
  {
    key: 'select',
    icon: <SelectOutlined />,
    title: '框选建筑',
    tag: '3D 视图',
    tagColor: 'orange',
    desc: '按住 Alt 键并拖动鼠标，可以框选多个建筑进行批量操作。',
  },
  {
    key: 'sidebar',
    icon: <UnorderedListOutlined />,
    title: '建筑列表 & 属性编辑',
    tag: '右侧面板',
    tagColor: 'gold',
    desc: '查看场景中所有建筑的列表，点击可选中并定位。展开属性编辑器可修改建筑的尺寸、楼层、颜色、旋转角度等参数。',
  },
  {
    key: 'timeline',
    icon: <CalendarOutlined />,
    title: '日期控制',
    tag: '左侧滑块',
    tagColor: 'volcano',
    desc: '拖动左侧垂直滑块选择一年中的日期，观察不同季节的日照变化。',
  },
  {
    key: 'time',
    icon: <ClockCircleOutlined />,
    title: '时间控制',
    tag: '底部滑块',
    tagColor: 'volcano',
    desc: '拖动底部水平滑块选择一天中的时刻，实时观察阴影变化。滑块上标注了日出和日落时间。',
  },
  {
    key: 'playback',
    icon: <CaretRightOutlined />,
    title: '时间播放',
    tag: '底部控制',
    tagColor: 'volcano',
    desc: '点击播放按钮自动推进时间，观察一天中阴影的动态变化。支持 1x ~ 30x 多种播放速度。',
  },
  {
    key: 'grid',
    icon: <BorderlessTableOutlined />,
    title: '网格 & 画布设置',
    tag: '右上角',
    tagColor: 'default',
    desc: '切换网格显示，调整画布尺寸和网格密度。画布尺寸决定了可放置建筑的范围。',
  },
  {
    key: 'sun',
    icon: <AppstoreOutlined />,
    title: '太阳信息',
    tag: '顶部右侧',
    tagColor: 'default',
    desc: '实时显示当前日出时间、日落时间、日照时长、太阳高度角和方位角。夜间会显示"夜间"标识。',
  },
]

export function HelpButton() {
  const [open, setOpen] = useState(false)
  const shareMode = useStore(s => s.shareMode)
  const isReadOnly = shareMode.isReadOnly

  const guideItems = isReadOnly ? READ_ONLY_GUIDE_ITEMS : FULL_GUIDE_ITEMS
  const defaultActiveKey = isReadOnly ? ['intro'] : ['scene']
  const introText = isReadOnly
    ? '这是一个只读的阴影模拟分享链接。以下是您可以使用的功能说明。'
    : '阴影模拟器用于模拟建筑物在不同时间、不同地点的日照阴影效果。以下是各功能模块的说明。'

  const collapseItems = guideItems.map(item => ({
    key: item.key,
    label: (
      <Space size={8}>
        <span style={{ fontSize: 15 }}>{item.icon}</span>
        <span style={{ fontWeight: 500 }}>{item.title}</span>
        {item.tag && <Tag color={item.tagColor} style={{ marginLeft: 4 }}>{item.tag}</Tag>}
      </Space>
    ),
    children: (
      <div>
        <Paragraph style={{ margin: 0, color: '#333' }}>{item.desc}</Paragraph>

        {item.shortcuts && item.shortcuts.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text strong style={{ fontSize: 12, color: '#666' }}>快捷键</Text>
            <div style={{
              marginTop: 6,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '4px 16px',
              fontSize: 13,
            }}>
              {item.shortcuts.map(s => (
                <div key={s.key} style={{ display: 'contents' }}>
                  <code style={{
                    background: '#f5f5f5',
                    padding: '1px 6px',
                    borderRadius: 3,
                    fontSize: 12,
                    border: '1px solid #e8e8e8',
                    whiteSpace: 'nowrap',
                  }}>
                    {s.key}
                  </code>
                  <span style={{ color: '#555' }}>{s.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {item.tips && item.tips.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text strong style={{ fontSize: 12, color: '#666' }}>提示</Text>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#555', fontSize: 13 }}>
              {item.tips.map((tip, i) => (
                <li key={i} style={{ marginBottom: 2 }}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    ),
  }))

  return (
    <>
      <FloatButton
        icon={<QuestionCircleOutlined />}
        tooltip={isReadOnly ? '帮助' : '功能帮助'}
        onClick={() => setOpen(true)}
        style={{ right: 24, bottom: 64 }}
      />

      <Modal
        title={
          <Space>
            <QuestionCircleOutlined />
            <span>{isReadOnly ? '帮助' : '功能介绍'}</span>
          </Space>
        }
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={640}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto', padding: '12px 0' } }}
      >
        <Paragraph style={{ padding: '0 24px 8px', color: '#888', fontSize: 13 }}>
          {introText}
        </Paragraph>
        <Collapse
          accordion
          ghost
          items={collapseItems}
          defaultActiveKey={defaultActiveKey}
        />
      </Modal>
    </>
  )
}
