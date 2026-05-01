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
