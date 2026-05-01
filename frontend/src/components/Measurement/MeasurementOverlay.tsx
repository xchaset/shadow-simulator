import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import type { MeasurementPoint, MeasurementResult } from '../../types'

const LOG_PREFIX = '[MeasurementOverlay]'

interface PointMarkerProps {
  point: MeasurementPoint
  index: number
}

function PointMarker({ point, index }: PointMarkerProps) {
  const isBuilding = point.type === 'building'

  return (
    <group position={[point.position[0], 0.5, point.position[1]]}>
      <mesh>
        <cylinderGeometry args={[isBuilding ? 1.5 : 1, isBuilding ? 1.5 : 1, 0.2, 16]} />
        <meshBasicMaterial color={isBuilding ? '#52c41a' : '#1677ff'} />
      </mesh>
      <mesh position={[0, 3, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial color={isBuilding ? '#52c41a' : '#1677ff'} />
      </mesh>
    </group>
  )
}

interface LineProps {
  points: MeasurementPoint[]
  color: string
  closed?: boolean
}

function MeasuringLine({ points, color, closed = false }: LineProps) {
  const geometry = useMemo(() => {
    if (points.length < 2) return null

    const positions: number[] = []
    for (const point of points) {
      positions.push(point.position[0], 0.1, point.position[1])
    }

    if (closed && points.length >= 3) {
      positions.push(points[0].position[0], 0.1, points[0].position[1])
    }

    console.log(LOG_PREFIX, 'MeasuringLine geometry, positions count:', positions.length, 'closed:', closed)

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [points, closed])

  if (!geometry) return null

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} linewidth={3} />
    </line>
  )
}

interface AreaFillProps {
  points: MeasurementPoint[]
}

function AreaFill({ points }: AreaFillProps) {
  const geometry = useMemo(() => {
    if (points.length < 3) return null

    console.log(LOG_PREFIX, 'AreaFill 计算填充, 点数量:', points.length)
    console.log(LOG_PREFIX, 'AreaFill 点坐标:', points.map(p => p.position))

    const shape = new THREE.Shape()
    shape.moveTo(points[0].position[0], points[0].position[1])
    console.log(LOG_PREFIX, 'AreaFill moveTo:', points[0].position)
    
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].position[0], points[i].position[1])
      console.log(LOG_PREFIX, 'AreaFill lineTo:', points[i].position)
    }
    shape.lineTo(points[0].position[0], points[0].position[1])
    shape.closePath()

    const geo = new THREE.ShapeGeometry(shape)
    console.log(LOG_PREFIX, 'AreaFill ShapeGeometry 顶点数:', geo.attributes.position.count)
    
    return geo
  }, [points])

  if (!geometry) return null

  return (
    <mesh geometry={geometry} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
      <meshBasicMaterial color="#52c41a" opacity={0.3} transparent side={THREE.DoubleSide} />
    </mesh>
  )
}

interface ResultDisplayProps {
  result: MeasurementResult
}

function ResultDisplay({ result }: ResultDisplayProps) {
  const color = result.mode === 'distance' ? '#1677ff' : '#52c41a'
  const isClosed = result.mode === 'area' && result.points.length >= 3

  useEffect(() => {
    console.log(LOG_PREFIX, 'ResultDisplay 渲染结果:', {
      mode: result.mode,
      pointsCount: result.points.length,
      distance: result.distance,
      area: result.area
    })
  }, [result])

  return (
    <group>
      <MeasuringLine points={result.points} color={color} closed={isClosed} />
      {result.mode === 'area' && result.points.length >= 3 && (
        <AreaFill points={result.points} />
      )}
      {result.points.map((point, index) => (
        <PointMarker key={point.id} point={point} index={index} />
      ))}
    </group>
  )
}

export function MeasurementOverlay() {
  const measurementTool = useStore(s => s.measurementTool)

  useEffect(() => {
    console.log(LOG_PREFIX, '状态更新:', {
      enabled: measurementTool.enabled,
      mode: measurementTool.mode,
      pointsCount: measurementTool.points.length,
      resultsCount: measurementTool.results.length
    })
    if (measurementTool.points.length > 0) {
      console.log(LOG_PREFIX, '当前测量点:', measurementTool.points.map(p => ({
        id: p.id,
        position: p.position,
        type: p.type
      })))
    }
  }, [measurementTool])

  if (!measurementTool.enabled) {
    console.log(LOG_PREFIX, '测量工具未启用, 不渲染')
    return null
  }

  const { points, results, mode } = measurementTool
  const isClosed = mode === 'area' && points.length >= 3

  console.log(LOG_PREFIX, '渲染:', {
    pointsCount: points.length,
    resultsCount: results.length,
    mode,
    isClosed
  })

  return (
    <>
      {points.length > 0 && (
        <>
          <MeasuringLine points={points} color="#fa8c16" closed={isClosed} />
          {mode === 'area' && points.length >= 3 && (
            <AreaFill points={points} />
          )}
          {points.map((point, index) => (
            <PointMarker key={point.id} point={point} index={index} />
          ))}
        </>
      )}

      {results.map(result => (
        <ResultDisplay key={result.id} result={result} />
      ))}
    </>
  )
}
