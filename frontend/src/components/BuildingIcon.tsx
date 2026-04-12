import {
  BuildOutlined,
  BankOutlined,
  GoldOutlined,
  BorderOutlined,
  ColumnWidthOutlined,
  PlusSquareOutlined,
  BarChartOutlined,
  ShopOutlined,
  CrownOutlined,
  HomeOutlined,
  LineOutlined,
  BgColorsOutlined,
  PartitionOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'

const ICON_MAP: Record<string, ReactNode> = {
  BuildOutlined: <BuildOutlined />,
  BankOutlined: <BankOutlined />,
  GoldOutlined: <GoldOutlined />,
  BorderOutlined: <BorderOutlined />,
  ColumnWidthOutlined: <ColumnWidthOutlined />,
  PlusSquareOutlined: <PlusSquareOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  ShopOutlined: <ShopOutlined />,
  CrownOutlined: <CrownOutlined />,
  HomeOutlined: <HomeOutlined />,
  LineOutlined: <LineOutlined />,
  BgColorsOutlined: <BgColorsOutlined />,
  PartitionOutlined: <PartitionOutlined />,
}

export function BuildingIcon({ name }: { name: string }) {
  return <>{ICON_MAP[name] ?? null}</>
}
