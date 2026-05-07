import { useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import type { Annotation, AnnotationMode } from '../../types'
import { Billboard, Text } from '@react-three/drei'

const LOG_PREFIX = '[AnnotationOverlay]'

interface PointMarkerProps {
  position: [number, number]
  color: string
  yOffset?: number
  isSelected?: boolean
}

function PointMarker({ position, color, yOffset = 0.5, isSelected = false }: PointMarkerProps) {
  return (
    <group position={[position[0], yOffset, position[1]]}>
      <mesh>
        <cylinderGeometry args={[isSelected ? 2 : 1.5, isSelected ? 2 : 1.5, 0.3, 16]} />
        <meshBasicMaterial color={isSelected ? '#fff' : color} />
      </mesh>
      {isSelected && (
        <mesh>
          <cylinderGeometry args={[2.2, 2.2, 0.2, 16]} />
          <meshBasicMaterial color={color} opacity={0.5} transparent />
        </mesh>
      )}
    </group>
  )
}

interface TextAnnotationProps {
  annotation: Annotation
  isSelected: boolean
}

function TextAnnotation({ annotation, isSelected }: TextAnnotationProps) {
  const { position, yOffset, color, text, fontSize, scale } = annotation

  const displayText = text || '新标签'
  const displayFontSize = fontSize || 14

  useEffect(() => {
    console.log(LOG_PREFIX, 'TextAnnotation 渲染:', {
      id: annotation.id,
      text: displayText,
      position,
      color,
      isSelected
    })
  }, [annotation.id, displayText, position, color, isSelected])

  return (
    <group position={[position[0], yOffset, position[1]]} scale={[scale, scale, scale]}>
      <PointMarker position={[0, 0]} color={color} yOffset={0} isSelected={isSelected} />
      
      <Billboard
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
        position={[0, 4, 0]}
      >
        <group>
          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[displayText.length * 0.15 + 0.6, 0.8, 0.1]} />
            <meshBasicMaterial color={isSelected ? '#fff' : color} opacity={0.9} transparent />
          </mesh>
          
          <Text
            position={[0, 0, 0.06]}
            fontSize={displayFontSize / 100}
            color={isSelected ? '#000' : '#fff'}
            anchorX="center"
            anchorY="middle"
          >
            {displayText}
          </Text>
        </group>
      </Billboard>

      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0.5, 0, 0, 2, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} linewidth={2} dashed={isSelected} />
      </line>
    </group>
  )
}

interface DimensionAnnotationProps {
  annotation: Annotation
  isSelected: boolean
}

function DimensionAnnotation({ annotation, isSelected }: DimensionAnnotationProps) {
  const { position, yOffset, color, dimensionStart, dimensionEnd, scale } = annotation

  useEffect(() => {
    console.log(LOG_PREFIX, 'DimensionAnnotation 渲染:', {
      id: annotation.id,
      dimensionStart,
      dimensionEnd,
      position,
      isSelected
    })
  }, [annotation.id, dimensionStart, dimensionEnd, position, isSelected])

  const lineGeometry = useMemo(() => {
    if (!dimensionStart || !dimensionEnd) return null

    const startX = position[0] + (dimensionStart[0] - position[0])
    const startZ = position[1] + (dimensionStart[1] - position[1])
    const endX = position[0] + (dimensionEnd[0] - position[0])
    const endZ = position[1] + (dimensionEnd[1] - position[1])

    const positions = new Float32Array([
      startX, yOffset, startZ,
      endX, yOffset, endZ
    ])

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [position, yOffset, dimensionStart, dimensionEnd])

  const arrowGeometries = useMemo(() => {
    if (!dimensionStart || !dimensionEnd) return null

    const startX = position[0] + (dimensionStart[0] - position[0])
    const startZ = position[1] + (dimensionStart[1] - position[1])
    const endX = position[0] + (dimensionEnd[0] - position[0])
    const endZ = position[1] + (dimensionEnd[1] - position[1])

    const dirX = endX - startX
    const dirZ = endZ - startZ
    const length = Math.sqrt(dirX * dirX + dirZ * dirZ)
    
    if (length === 0) return null

    const normX = dirX / length
    const normZ = dirZ / length
    const perpX = -normZ
    const perpZ = normX

    const arrowSize = 3
    
    const startArrowPositions = new Float32Array([
      startX, yOffset, startZ,
      startX + arrowSize * normX + arrowSize * perpX, yOffset, startZ + arrowSize * normZ + arrowSize * perpZ,
      startX, yOffset, startZ,
      startX + arrowSize * normX - arrowSize * perpX, yOffset, startZ + arrowSize * normZ - arrowSize * perpZ
    ])

    const endArrowPositions = new Float32Array([
      endX, yOffset, endZ,
      endX - arrowSize * normX + arrowSize * perpX, yOffset, endZ - arrowSize * normZ + arrowSize * perpZ,
      endX, yOffset, endZ,
      endX - arrowSize * normX - arrowSize * perpX, yOffset, endZ - arrowSize * normZ - arrowSize * perpZ
    ])

    const startGeo = new THREE.BufferGeometry()
    startGeo.setAttribute('position', new THREE.BufferAttribute(startArrowPositions, 3))
    
    const endGeo = new THREE.BufferGeometry()
    endGeo.setAttribute('position', new THREE.BufferAttribute(endArrowPositions, 3))

    return { start: startGeo, end: endGeo }
  }, [position, yOffset, dimensionStart, dimensionEnd])

  const dimensionText = useMemo(() => {
    if (!dimensionStart || !dimensionEnd) return null
    
    const dx = dimensionEnd[0] - dimensionStart[0]
    const dz = dimensionEnd[1] - dimensionStart[1]
    const distance = Math.sqrt(dx * dx + dz * dz)
    
    return `${distance.toFixed(2)} 米`
  }, [dimensionStart, dimensionEnd])

  const textPosition = useMemo(() => {
    if (!dimensionStart || !dimensionEnd) return [0, yOffset + 2, 0] as [number, number, number]
    
    const midX = (dimensionStart[0] + dimensionEnd[0]) / 2
    const midZ = (dimensionStart[1] + dimensionEnd[1]) / 2
    
    return [midX, yOffset + 2, midZ] as [number, number, number]
  }, [dimensionStart, dimensionEnd, yOffset])

  return (
    <group scale={[scale, scale, scale]}>
      <PointMarker position={position} color={color} yOffset={yOffset} isSelected={isSelected} />
      
      {dimensionStart && (
        <PointMarker 
          position={[dimensionStart[0], dimensionStart[1]]} 
          color={color} 
          yOffset={yOffset} 
          isSelected={false} 
        />
      )}
      
      {dimensionEnd && (
        <PointMarker 
          position={[dimensionEnd[0], dimensionEnd[1]]} 
          color={color} 
          yOffset={yOffset} 
          isSelected={false} 
        />
      )}

      {lineGeometry && (
        <line geometry={lineGeometry}>
          <lineBasicMaterial color={color} linewidth={isSelected ? 4 : 2} dashed={isSelected} />
        </line>
      )}

      {arrowGeometries && (
        <>
          <line geometry={arrowGeometries.start}>
            <lineBasicMaterial color={color} linewidth={2} />
          </line>
          <line geometry={arrowGeometries.end}>
            <lineBasicMaterial color={color} linewidth={2} />
          </line>
        </>
      )}

      {dimensionText && (
        <Billboard
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
          position={textPosition}
        >
          <group>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[dimensionText.length * 0.12 + 0.4, 0.5, 0.1]} />
              <meshBasicMaterial color={color} opacity={0.9} transparent />
            </mesh>
            
            <Text
              position={[0, 0, 0.06]}
              fontSize={0.12}
              color="#fff"
              anchorX="center"
              anchorY="middle"
            >
              {dimensionText}
            </Text>
          </group>
        </Billboard>
      )}
    </group>
  )
}

interface ArrowAnnotationProps {
  annotation: Annotation
  isSelected: boolean
}

function ArrowAnnotation({ annotation, isSelected }: ArrowAnnotationProps) {
  const { position, yOffset, color, arrowDirection, arrowLength, scale } = annotation

  useEffect(() => {
    console.log(LOG_PREFIX, 'ArrowAnnotation 渲染:', {
      id: annotation.id,
      position,
      arrowDirection,
      arrowLength,
      isSelected
    })
  }, [annotation.id, position, arrowDirection, arrowLength, isSelected])

  const arrowGeometry = useMemo(() => {
    const dir = (arrowDirection || 0) * Math.PI / 180
    const length = arrowLength || 20
    
    const arrowStartX = position[0]
    const arrowStartZ = position[1]
    
    const arrowEndX = position[0] + Math.cos(dir) * length
    const arrowEndZ = position[1] + Math.sin(dir) * length

    const positions = new Float32Array([
      arrowStartX, yOffset, arrowStartZ,
      arrowEndX, yOffset, arrowEndZ
    ])

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [position, yOffset, arrowDirection, arrowLength])

  const arrowHeadGeometry = useMemo(() => {
    const dir = (arrowDirection || 0) * Math.PI / 180
    const length = arrowLength || 20
    
    const arrowEndX = position[0] + Math.cos(dir) * length
    const arrowEndZ = position[1] + Math.sin(dir) * length

    const headLength = 5
    const headWidth = 2.5

    const perpDir = dir + Math.PI / 2

    const positions = new Float32Array([
      arrowEndX, yOffset, arrowEndZ,
      arrowEndX - headLength * Math.cos(dir) + headWidth * Math.cos(perpDir), 
      yOffset, 
      arrowEndZ - headLength * Math.sin(dir) + headWidth * Math.sin(perpDir),
      
      arrowEndX, yOffset, arrowEndZ,
      arrowEndX - headLength * Math.cos(dir) - headWidth * Math.cos(perpDir), 
      yOffset, 
      arrowEndZ - headLength * Math.sin(dir) - headWidth * Math.sin(perpDir)
    ])

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [position, yOffset, arrowDirection, arrowLength])

  const filledArrowHeadGeometry = useMemo(() => {
    const dir = (arrowDirection || 0) * Math.PI / 180
    const length = arrowLength || 20
    
    const arrowEndX = position[0] + Math.cos(dir) * length
    const arrowEndZ = position[1] + Math.sin(dir) * length

    const headLength = 5
    const headWidth = 3

    const perpDir = dir + Math.PI / 2

    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.lineTo(-headLength, headWidth)
    shape.lineTo(-headLength, -headWidth)
    shape.lineTo(0, 0)
    shape.closePath()

    const geo = new THREE.ShapeGeometry(shape)
    geo.rotateY(-dir)
    geo.translate(arrowEndX, yOffset, arrowEndZ)
    
    return geo
  }, [position, yOffset, arrowDirection, arrowLength])

  return (
    <group scale={[scale, scale, scale]}>
      <PointMarker position={position} color={color} yOffset={yOffset} isSelected={isSelected} />

      <line geometry={arrowGeometry}>
        <lineBasicMaterial color={color} linewidth={isSelected ? 4 : 2} dashed={isSelected} />
      </line>

      <line geometry={arrowHeadGeometry}>
        <lineBasicMaterial color={color} linewidth={3} />
      </line>

      <mesh geometry={filledArrowHeadGeometry}>
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>

      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([position[0], yOffset, position[1], position[0], yOffset + 2, position[1]])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} linewidth={2} />
      </line>
    </group>
  )
}

interface AnnotationRendererProps {
  annotation: Annotation
  isSelected: boolean
}

function AnnotationRenderer({ annotation, isSelected }: AnnotationRendererProps) {
  switch (annotation.mode) {
    case 'text':
      return <TextAnnotation annotation={annotation} isSelected={isSelected} />
    case 'dimension':
      return <DimensionAnnotation annotation={annotation} isSelected={isSelected} />
    case 'arrow':
      return <ArrowAnnotation annotation={annotation} isSelected={isSelected} />
    default:
      return null
  }
}

export function AnnotationOverlay() {
  const annotationTool = useStore(s => s.annotationTool)

  useEffect(() => {
    console.log(LOG_PREFIX, '状态更新:', {
      enabled: annotationTool.enabled,
      mode: annotationTool.mode,
      annotationsCount: annotationTool.annotations.length,
      selectedAnnotationId: annotationTool.selectedAnnotationId
    })
    if (annotationTool.annotations.length > 0) {
      console.log(LOG_PREFIX, '当前标注:', annotationTool.annotations.map(a => ({
        id: a.id,
        mode: a.mode,
        position: a.position
      })))
    }
  }, [annotationTool])

  if (!annotationTool.enabled) {
    console.log(LOG_PREFIX, '标注工具未启用, 不渲染')
    return null
  }

  const { annotations, selectedAnnotationId, currentPosition, mode, color } = annotationTool

  console.log(LOG_PREFIX, '渲染:', {
    annotationsCount: annotations.length,
    selectedAnnotationId,
    currentPosition,
    mode
  })

  return (
    <>
      {annotations.map(annotation => (
        <AnnotationRenderer 
          key={annotation.id} 
          annotation={annotation} 
          isSelected={selectedAnnotationId === annotation.id}
        />
      ))}

      {currentPosition && (
        <PointMarker 
          position={[currentPosition[0], currentPosition[1]]} 
          color={color} 
          yOffset={0.5}
          isSelected={false}
        />
      )}
    </>
  )
}
