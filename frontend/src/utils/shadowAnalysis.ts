import type { 
  Building, 
  Location, 
  SolarTerm, 
  ShadowAnalysisReport, 
  SolarTermDaylightAnalysis, 
  BuildingDaylightResult,
  ShadowHeatmapGridPoint, 
  ShadowHeatmapMode, 
  ShadowHeatmapResult 
} from '../types'
import { getSunData } from './sunCalc'
import * as THREE from 'three'
import { BUILDING_PRESETS } from './buildings'

export const SOLAR_TERMS: SolarTerm[] = [
  { id: 'lichun', name: '立春', month: 2, day: 4, description: '春季开始' },
  { id: 'chunfen', name: '春分', month: 3, day: 21, description: '昼夜平分' },
  { id: 'lixia', name: '立夏', month: 5, day: 6, description: '夏季开始' },
  { id: 'xiazhi', name: '夏至', month: 6, day: 22, description: '白天最长' },
  { id: 'liqiu', name: '立秋', month: 8, day: 8, description: '秋季开始' },
  { id: 'qiufen', name: '秋分', month: 9, day: 23, description: '昼夜平分' },
  { id: 'lidong', name: '立冬', month: 11, day: 8, description: '冬季开始' },
  { id: 'dongzhi', name: '冬至', month: 12, day: 22, description: '白天最短' },
]

function getSolarTermDate(term: SolarTerm, year: number): Date {
  return new Date(year, term.month - 1, term.day, 12, 0, 0)
}

function getBuildingBoundingBox(building: Building): THREE.Box3 {
  const { type, params, position, rotation } = building
  const [x, z] = position
  let width = 0, depth = 0, height = 0

  switch (type) {
    case 'box':
      width = params.width || 20
      depth = params.depth || 15
      height = params.height || 50
      break
    case 'cylinder':
      const radius = params.radius || 10
      width = radius * 2
      depth = radius * 2
      height = params.height || 40
      break
    case 'prism':
      const pRadius = params.radius || 12
      width = pRadius * 2
      depth = pRadius * 2
      height = params.height || 35
      break
    case 'l-shape':
      width = Math.max(params.wing1Length || 30, params.wing2Length || 25)
      depth = width
      height = params.height || 40
      break
    case 'u-shape':
      width = Math.max(params.wing1Length || 25, params.backLength || 30)
      depth = Math.max(params.wing2Length || 25, width)
      height = params.height || 35
      break
    case 't-shape':
      width = Math.max(params.crossLength || 40, params.stemLength || 30)
      depth = width
      height = params.height || 45
      break
    case 'stepped':
      width = params.baseWidth || 30
      depth = params.baseDepth || 25
      height = (params.levels || 3) * (params.levelHeight || 15)
      break
    case 'podium-tower':
      width = Math.max(params.podiumWidth || 40, params.towerWidth || 18)
      depth = Math.max(params.podiumDepth || 30, params.towerDepth || 15)
      height = (params.podiumHeight || 15) + (params.towerHeight || 60)
      break
    case 'dome':
      const dRadius = params.radius || 12
      width = dRadius * 2
      depth = dRadius * 2
      height = (params.cylinderHeight || 20) + dRadius
      break
    case 'gable-roof':
      width = params.width || 20
      depth = params.depth || 25
      height = (params.wallHeight || 12) + (params.ridgeHeight || 8)
      break
    case 'road':
      width = params.length || 80
      depth = params.width || 12
      height = 0.1
      break
    case 'green-belt':
      width = params.length || 60
      depth = params.width || 6
      height = params.height || 1.5
      break
    case 'tree':
      const tRadius = params.canopyRadius || 5
      width = tRadius * 2
      depth = tRadius * 2
      height = (params.trunkHeight || 5) + (params.canopyHeight || 8)
      break
    case 'ai-circular':
      const aiRadius = params.radius || 15
      width = aiRadius * 2
      depth = aiRadius * 2
      height = (params.levels || 3) * 15
      break
    case 'ai-complex':
      width = 30
      depth = 30
      height = (params.levels || 3) * 15
      break
    case 'glb':
      width = 20
      depth = 20
      height = 50
      break
    default:
      width = 20
      depth = 20
      height = 50
  }

  const halfWidth = width / 2
  const halfDepth = depth / 2

  return new THREE.Box3(
    new THREE.Vector3(x - halfWidth, 0, z - halfDepth),
    new THREE.Vector3(x + halfWidth, height, z + halfDepth)
  )
}

function doesBuildingCastShadowOn(
  shadowCaster: Building,
  targetBuilding: Building,
  sunAzimuth: number,
  sunAltitude: number
): boolean {
  if (shadowCaster.id === targetBuilding.id) return false

  const casterBox = getBuildingBoundingBox(shadowCaster)
  const targetBox = getBuildingBoundingBox(targetBuilding)

  const casterCenter = new THREE.Vector3()
  const targetCenter = new THREE.Vector3()
  casterBox.getCenter(casterCenter)
  targetBox.getCenter(targetCenter)

  const toTarget = new THREE.Vector3().subVectors(targetCenter, casterCenter)
  toTarget.y = 0
  const distance2D = toTarget.length()

  if (distance2D < 1) return false

  toTarget.normalize()

  const sunDirectionX = Math.sin(sunAzimuth)
  const sunDirectionZ = Math.cos(sunAzimuth)

  const sunDirection = new THREE.Vector3(-sunDirectionX, 0, sunDirectionZ).normalize()

  const dot = toTarget.dot(sunDirection)

  if (dot < 0.3) return false

  const casterHeight = casterBox.max.y - casterBox.min.y
  const targetHeight = targetBox.max.y - targetBox.min.y

  const shadowLength = casterHeight / Math.tan(Math.max(sunAltitude, 0.1))

  if (distance2D > shadowLength * 1.5) return false

  const heightRatio = targetHeight / casterHeight
  const distanceRatio = distance2D / shadowLength

  if (heightRatio > 1.5) return false
  if (distanceRatio > 1.0 && heightRatio < 0.5) return false

  return true
}

export function analyzeBuildingDaylight(
  building: Building,
  allBuildings: Building[],
  location: Location,
  date: Date
): BuildingDaylightResult {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  const sunData = getSunData(location.lat, location.lng, date)
  const sunrise = sunData.sunrise
  const sunset = sunData.sunset

  const daylightIntervals: Array<{ start: Date; end: Date; durationMinutes: number }> = []
  const hourlyData: Array<{ hour: number; daylightMinutes: number }> = []

  const startHour = sunrise.getHours()
  const endHour = sunset.getHours() + 1

  let currentIntervalStart: Date | null = null
  let totalDaylightMinutes = 0

  for (let hour = startHour; hour <= endHour; hour++) {
    let hourDaylightMinutes = 0

    for (let minute = 0; minute < 60; minute += 5) {
      const checkTime = new Date(year, month, day, hour, minute, 0)

      if (checkTime < sunrise || checkTime > sunset) continue

      const currentSunData = getSunData(location.lat, location.lng, checkTime)
      if (currentSunData.altitude <= 0) continue

      const isShadowed = allBuildings.some(otherBuilding =>
        doesBuildingCastShadowOn(
          otherBuilding,
          building,
          currentSunData.azimuth,
          currentSunData.altitude
        )
      )

      if (!isShadowed) {
        if (!currentIntervalStart) {
          currentIntervalStart = new Date(checkTime)
        }
        hourDaylightMinutes += 5
        totalDaylightMinutes += 5
      } else {
        if (currentIntervalStart) {
          const endTime = new Date(year, month, day, hour, minute - 5, 0)
          const duration = Math.round((endTime.getTime() - currentIntervalStart.getTime()) / 60000)
          if (duration > 0) {
            daylightIntervals.push({
              start: new Date(currentIntervalStart),
              end: endTime,
              durationMinutes: duration
            })
          }
          currentIntervalStart = null
        }
      }
    }

    if (hourDaylightMinutes > 0) {
      hourlyData.push({ hour, daylightMinutes: hourDaylightMinutes })
    }
  }

  if (currentIntervalStart) {
    const endTime = new Date(year, month, day, endHour, 55, 0)
    const actualEnd = endTime < sunset ? endTime : sunset
    const duration = Math.round((actualEnd.getTime() - currentIntervalStart.getTime()) / 60000)
    if (duration > 0) {
      daylightIntervals.push({
        start: new Date(currentIntervalStart),
        end: actualEnd,
        durationMinutes: duration
      })
    }
  }

  return {
    buildingId: building.id,
    buildingName: building.name,
    totalDaylightMinutes,
    daylightIntervals,
    hourlyData
  }
}

export function generateSolarTermAnalysis(
  buildingIds: string[],
  allBuildings: Building[],
  location: Location,
  year: number = new Date().getFullYear()
): SolarTermDaylightAnalysis[] {
  const selectedBuildings = allBuildings.filter(b => buildingIds.includes(b.id))

  return SOLAR_TERMS.map(term => {
    const date = getSolarTermDate(term, year)
    const sunData = getSunData(location.lat, location.lng, date)

    const buildingResults = selectedBuildings.map(building =>
      analyzeBuildingDaylight(building, allBuildings, location, date)
    )

    const totalDaylightMinutes = buildingResults.reduce(
      (sum, result) => sum + result.totalDaylightMinutes,
      0
    )

    return {
      solarTerm: term,
      date,
      sunrise: sunData.sunrise,
      sunset: sunData.sunset,
      totalDaylightMinutes: buildingResults.length > 0
        ? Math.round(totalDaylightMinutes / buildingResults.length)
        : 0,
      buildingResults
    }
  })
}

export function generateShadowAnalysisReport(
  buildingIds: string[],
  allBuildings: Building[],
  location: Location,
  year: number = new Date().getFullYear()
): ShadowAnalysisReport {
  const solarTermAnalyses = generateSolarTermAnalysis(buildingIds, allBuildings, location, year)

  const allDaylightMinutes = solarTermAnalyses
    .filter(a => a.totalDaylightMinutes > 0)
    .map(a => a.totalDaylightMinutes)

  const avgDaylightMinutes = allDaylightMinutes.length > 0
    ? Math.round(allDaylightMinutes.reduce((a, b) => a + b, 0) / allDaylightMinutes.length)
    : 0

  const maxDaylightMinutes = allDaylightMinutes.length > 0 ? Math.max(...allDaylightMinutes) : 0
  const minDaylightMinutes = allDaylightMinutes.length > 0 ? Math.min(...allDaylightMinutes) : 0

  const bestAnalysis = solarTermAnalyses.reduce((best, current) =>
    current.totalDaylightMinutes > best.totalDaylightMinutes ? current : best
  )
  const worstAnalysis = solarTermAnalyses.reduce((worst, current) =>
    current.totalDaylightMinutes < worst.totalDaylightMinutes ? current : worst
  )

  return {
    id: `report-${Date.now()}`,
    generatedAt: new Date(),
    location,
    buildingIds,
    solarTermAnalyses,
    summary: {
      avgDaylightMinutes,
      maxDaylightMinutes,
      minDaylightMinutes,
      bestSolarTerm: bestAnalysis.totalDaylightMinutes > 0 ? bestAnalysis.solarTerm : null,
      worstSolarTerm: worstAnalysis.totalDaylightMinutes > 0 ? worstAnalysis.solarTerm : null
    }
  }
}

export function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}min`
}

export function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

export function isPointInShadow(
  pointX: number,
  pointZ: number,
  buildings: Building[],
  sunAzimuth: number,
  sunAltitude: number
): boolean {
  const sunDirectionX = Math.sin(sunAzimuth)
  const sunDirectionZ = Math.cos(sunAzimuth)
  
  for (const building of buildings) {
    const buildingBox = getBuildingBoundingBox(building)
    const buildingCenter = new THREE.Vector3()
    buildingBox.getCenter(buildingCenter)
    
    const toPoint = new THREE.Vector3(pointX - buildingCenter.x, 0, pointZ - buildingCenter.z)
    const distance2D = toPoint.length()
    
    if (distance2D < 1) return true
    
    toPoint.normalize()
    
    const sunDirection = new THREE.Vector3(-sunDirectionX, 0, sunDirectionZ).normalize()
    const dot = toPoint.dot(sunDirection)
    
    if (dot < 0.1) continue
    
    const buildingHeight = buildingBox.max.y - buildingBox.min.y
    const shadowLength = buildingHeight / Math.tan(Math.max(sunAltitude, 0.1))
    
    if (distance2D > shadowLength * 1.2) continue
    
    const buildingHalfWidth = (buildingBox.max.x - buildingBox.min.x) / 2
    const buildingHalfDepth = (buildingBox.max.z - buildingBox.min.z) / 2
    
    const perpendicularX = -sunDirection.z
    const perpendicularZ = sunDirection.x
    const pointPerpendicularDist = Math.abs(
      (pointX - buildingCenter.x) * perpendicularX + 
      (pointZ - buildingCenter.z) * perpendicularZ
    )
    
    if (pointPerpendicularDist > Math.max(buildingHalfWidth, buildingHalfDepth) * 1.5) continue
    
    return true
  }
  
  return false
}

export function generateShadowHeatmapForDay(
  buildings: Building[],
  location: Location,
  date: Date,
  gridResolution: number = 50,
  canvasSize: number = 2000
): ShadowHeatmapGridPoint[] {
  const gridPoints: ShadowHeatmapGridPoint[] = []
  const halfSize = canvasSize / 2
  const step = canvasSize / gridResolution
  
  const sunData = getSunData(location.lat, location.lng, date)
  const sunrise = sunData.sunrise
  const sunset = sunData.sunset
  
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  
  for (let i = 0; i < gridResolution; i++) {
    for (let j = 0; j < gridResolution; j++) {
      const x = -halfSize + i * step + step / 2
      const z = -halfSize + j * step + step / 2
      
      let shadowMinutes = 0
      let totalMinutes = 0
      
      for (let hour = sunrise.getHours(); hour <= sunset.getHours(); hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const checkTime = new Date(year, month, day, hour, minute, 0)
          
          if (checkTime < sunrise || checkTime > sunset) continue
          
          const currentSunData = getSunData(location.lat, location.lng, checkTime)
          if (currentSunData.altitude <= 0) continue
          
          totalMinutes += 15
          
          const inShadow = isPointInShadow(
            x, z, buildings,
            currentSunData.azimuth,
            currentSunData.altitude
          )
          
          if (inShadow) {
            shadowMinutes += 15
          }
        }
      }
      
      gridPoints.push({
        x,
        z,
        shadowMinutes,
        totalMinutes
      })
    }
  }
  
  return gridPoints
}

export function generateShadowHeatmapForYear(
  buildings: Building[],
  location: Location,
  year: number,
  gridResolution: number = 50,
  canvasSize: number = 2000
): ShadowHeatmapGridPoint[] {
  const gridPoints: ShadowHeatmapGridPoint[] = []
  const halfSize = canvasSize / 2
  const step = canvasSize / gridResolution
  
  const analysisDates: Date[] = []
  
  for (const term of SOLAR_TERMS) {
    analysisDates.push(new Date(year, term.month - 1, term.day, 12, 0, 0))
  }
  
  for (let i = 0; i < gridResolution; i++) {
    for (let j = 0; j < gridResolution; j++) {
      const x = -halfSize + i * step + step / 2
      const z = -halfSize + j * step + step / 2
      
      let totalShadowMinutes = 0
      let totalDaylightMinutes = 0
      
      for (const date of analysisDates) {
        const sunData = getSunData(location.lat, location.lng, date)
        const sunrise = sunData.sunrise
        const sunset = sunData.sunset
        
        const yearVal = date.getFullYear()
        const month = date.getMonth()
        const day = date.getDate()
        
        for (let hour = sunrise.getHours(); hour <= sunset.getHours(); hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const checkTime = new Date(yearVal, month, day, hour, minute, 0)
            
            if (checkTime < sunrise || checkTime > sunset) continue
            
            const currentSunData = getSunData(location.lat, location.lng, checkTime)
            if (currentSunData.altitude <= 0) continue
            
            totalDaylightMinutes += 30
            
            const inShadow = isPointInShadow(
              x, z, buildings,
              currentSunData.azimuth,
              currentSunData.altitude
            )
            
            if (inShadow) {
              totalShadowMinutes += 30
            }
          }
        }
      }
      
      gridPoints.push({
        x,
        z,
        shadowMinutes: totalShadowMinutes,
        totalMinutes: totalDaylightMinutes
      })
    }
  }
  
  return gridPoints
}

export function getHeatmapColor(
  shadowRatio: number,
  maxShadowRatio: number = 1.0
): [number, number, number] {
  const normalizedRatio = Math.min(shadowRatio / maxShadowRatio, 1.0)
  
  if (normalizedRatio < 0.2) {
    const t = normalizedRatio / 0.2
    return [
      0.0 + t * 0.0,
      0.8 + t * 0.2,
      0.0
    ]
  } else if (normalizedRatio < 0.4) {
    const t = (normalizedRatio - 0.2) / 0.2
    return [
      0.0 + t * 1.0,
      1.0 - t * 0.2,
      0.0
    ]
  } else if (normalizedRatio < 0.6) {
    const t = (normalizedRatio - 0.4) / 0.2
    return [
      1.0,
      0.8 - t * 0.3,
      0.0
    ]
  } else if (normalizedRatio < 0.8) {
    const t = (normalizedRatio - 0.6) / 0.2
    return [
      1.0 - t * 0.3,
      0.5 - t * 0.3,
      0.0
    ]
  } else {
    const t = (normalizedRatio - 0.8) / 0.2
    return [
      0.7 - t * 0.4,
      0.2 - t * 0.1,
      0.0 + t * 0.3
    ]
  }
}
