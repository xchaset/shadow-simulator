import { useRef, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { useStore } from '../../store/useStore'
import { createBuildingGeometries } from './BuildingFactory'
import type { Building } from '../../types'

// ─── Shared GLSL helpers ──────────────────────────────────

const glslNoise = /* glsl */ `
// Simplex-style gradient noise (2D), based on Ashima Arts webgl-noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 10.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,   // (3.0-sqrt(3.0))/6.0
    0.366025403784439,   // 0.5*(sqrt(3.0)-1.0)
   -0.577350269189626,   // -1.0 + 2.0 * C.x
    0.024390243902439);  // 1.0 / 41.0
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// FBM (Fractal Brownian Motion) — 多层噪声叠加
float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    value += amp * snoise(p * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return value;
}
`

// ─── Vertex Shader ────────────────────────────────────────

const waterVertexShader = /* glsl */ `
uniform float uTime;
uniform float uWaveHeight;
${glslNoise}

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vDepth;

// Gerstner 波 — 波峰尖锐、波谷平缓，比正弦波更真实
vec3 gerstnerWave(vec2 pos, vec2 dir, float steepness, float wavelength, float speed) {
  float k = 6.28318 / wavelength;
  float c = speed / k;
  float a = steepness / k;
  float phase = k * (dot(dir, pos) - c * uTime);
  return vec3(
    dir.x * a * cos(phase),
    a * sin(phase),
    dir.y * a * cos(phase)
  );
}

void main() {
  vUv = uv;
  vec3 pos = position;

  // 三组 Gerstner 波叠加，不同方向、波长、速度
  vec3 wave = vec3(0.0);
  wave += gerstnerWave(pos.xz, normalize(vec2(0.3, 1.0)), 0.15, 18.0, 3.5);
  wave += gerstnerWave(pos.xz, normalize(vec2(-0.2, 0.8)), 0.1,  12.0, 2.8);
  wave += gerstnerWave(pos.xz, normalize(vec2(0.5, 0.6)), 0.06,  7.0, 4.2);

  // 低频 FBM 微扰，打破规律感
  float fbmDisp = fbm(pos.xz * 0.02 + uTime * 0.06, 3) * uWaveHeight * 0.4;

  pos.x += wave.x;
  pos.y += wave.y * uWaveHeight + fbmDisp;
  pos.z += wave.z;

  // 用偏导数近似法线
  float eps = 0.5;
  vec3 waveR = gerstnerWave(pos.xz + vec2(eps, 0.0), normalize(vec2(0.3, 1.0)), 0.15, 18.0, 3.5);
  vec3 waveF = gerstnerWave(pos.xz + vec2(0.0, eps), normalize(vec2(0.3, 1.0)), 0.15, 18.0, 3.5);
  vec3 tangent = normalize(vec3(eps, (waveR.y - wave.y) * uWaveHeight, 0.0));
  vec3 bitangent = normalize(vec3(0.0, (waveF.y - wave.y) * uWaveHeight, eps));
  vNormal = normalize(cross(bitangent, tangent));

  vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
  // 横向深度因子：中间深、边缘浅
  vDepth = smoothstep(0.0, 0.4, uv.x) * smoothstep(1.0, 0.6, uv.x);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

// ─── Fragment Shader ──────────────────────────────────────

const waterFragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uDeepColor;
uniform float uOpacity;
uniform vec3 uSunDir;
${glslNoise}

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vDepth;

// 焦散光斑 — 模拟水底折射光纹
float caustics(vec2 p, float t) {
  float c = 0.0;
  // 两层不同速度的 Voronoi-like 图案叠加
  vec2 uv1 = p * 3.0 + vec2(t * 0.04, t * 0.03);
  vec2 uv2 = p * 5.0 - vec2(t * 0.03, t * 0.05);
  float n1 = snoise(uv1);
  float n2 = snoise(uv2);
  c = pow(abs(n1 + n2) * 0.5 + 0.5, 3.0);
  return c;
}

void main() {
  // ── 双层流动 UV（Flow Map 技术）──
  // 两层以不同速度/方向流动，交叉淡入淡出避免可见的平铺接缝
  float halfCycle = 4.0;  // 秒
  float phase = mod(uTime, halfCycle * 2.0);
  float blend = abs(phase / halfCycle - 1.0);  // 0→1→0 三角波

  vec2 flowDir = vec2(0.08, 0.12);  // 主流方向
  vec2 uv1 = vUv + flowDir * uTime;
  vec2 uv2 = vUv + flowDir * (uTime + halfCycle) + vec2(0.37, 0.19);  // 偏移避免重叠

  // 每层用 FBM 生成有机纹理
  float layer1 = fbm(uv1 * 6.0, 5) * 0.5 + 0.5;
  float layer2 = fbm(uv2 * 6.0, 5) * 0.5 + 0.5;
  float flowPattern = mix(layer1, layer2, blend);

  // ── 菲涅尔效果 ──
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
  fresnel = mix(0.04, 0.7, fresnel);  // 水的 F0 ≈ 0.04

  // ── 颜色混合 ──
  // 深度：中间深、边缘浅；加上流动纹理的微扰
  float depth = vDepth * (0.8 + flowPattern * 0.2);
  vec3 shallowColor = uColor * 1.15;
  vec3 deepColor = uDeepColor;
  vec3 waterColor = mix(shallowColor, deepColor, depth);

  // 天空反射色（简化：用固定的天空蓝）
  vec3 skyColor = vec3(0.55, 0.72, 0.88);
  waterColor = mix(waterColor, skyColor, fresnel * 0.5);

  // ── 焦散 ──
  float caust = caustics(vUv, uTime);
  waterColor += caust * vec3(0.08, 0.12, 0.15) * (1.0 - vDepth * 0.5);

  // ── 高光（Blinn-Phong）──
  vec3 halfVec = normalize(viewDir + uSunDir);
  float specAngle = max(dot(vNormal, halfVec), 0.0);
  float spec = pow(specAngle, 128.0) * 0.6;
  // 加一层宽散射光
  float scatter = pow(specAngle, 16.0) * 0.15;
  waterColor += (spec + scatter) * vec3(1.0, 0.97, 0.9);

  // ── 细微波纹纹理 ──
  float microDetail = snoise(vUv * 40.0 + uTime * vec2(0.1, 0.15)) * 0.03;
  waterColor += microDetail;

  // ── 边缘柔化 ──
  float edgeAlpha = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
  // 纵向首尾也柔化
  edgeAlpha *= smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);

  gl_FragColor = vec4(waterColor, uOpacity * edgeAlpha);
}
`

// ─── Component ────────────────────────────────────────────

interface Props {
  building: Building
}

export function RiverMesh({ building }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const isSelected = useStore(s => s.selectedBuildingId === building.id)
  const isMultiSelected = useStore(s => s.selectedBuildingIds.includes(building.id))
  const isSelectedVisual = isSelected || isMultiSelected

  const selectBuilding = useStore(s => s.selectBuilding)
  const toggleBuildingSelection = useStore(s => s.toggleBuildingSelection)
  const setEditorOpen = useStore(s => s.setEditorOpen)

  const geometries = useMemo(
    () => createBuildingGeometries(building.type, building.params),
    [building.type, building.params],
  )

  const edgesGeometries = useMemo(
    () => geometries.map(item => new THREE.EdgesGeometry(item.geometry)),
    [geometries],
  )

  const colors = useMemo(() => {
    const base = new THREE.Color(building.color)
    const deep = new THREE.Color(building.color).multiplyScalar(0.45)
    return { base, deep }
  }, [building.color])

  // 默认太阳方向（从右上方照射）
  const defaultSunDir = useMemo(() => new THREE.Vector3(0.5, 0.8, 0.3).normalize(), [])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: colors.base },
    uDeepColor: { value: colors.deep },
    uOpacity: { value: 0.78 },
    uWaveHeight: { value: 0.25 },
    uSunDir: { value: defaultSunDir },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state, delta) => {
    if (!materialRef.current) return
    const u = materialRef.current.uniforms
    u.uTime.value += delta
    u.uColor.value = colors.base
    u.uDeepColor.value = colors.deep
    u.uOpacity.value = isSelectedVisual ? 0.85 : 0.78

    // 如果场景有方向光，同步太阳方向
    const dirLight = state.scene.getObjectByProperty('type', 'DirectionalLight') as THREE.DirectionalLight | undefined
    if (dirLight) {
      u.uSunDir.value.copy(dirLight.position).normalize()
    }
  })

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.ctrlKey || e.metaKey) {
      toggleBuildingSelection(building.id)
    } else {
      selectBuilding(building.id)
    }
  }, [building.id, selectBuilding, toggleBuildingSelection])

  const handleDoubleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    selectBuilding(building.id)
    setEditorOpen(true)
  }, [building.id, selectBuilding, setEditorOpen])

  return (
    <group
      ref={groupRef}
      position={[building.position[0], building.baseHeight ?? 0, building.position[1]]}
      rotation={[0, (building.rotation * Math.PI) / 180, 0]}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {geometries.map((item, i) => (
        <mesh
          key={i}
          geometry={item.geometry}
          position={item.position}
          receiveShadow
        >
          <shaderMaterial
            ref={materialRef}
            vertexShader={waterVertexShader}
            fragmentShader={waterFragmentShader}
            uniforms={uniforms}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
          />
          {isSelectedVisual && (
            <lineSegments>
              <primitive object={edgesGeometries[i]} attach="geometry" />
              <lineBasicMaterial color={isMultiSelected ? "#52c41a" : "#ffffff"} linewidth={2} />
            </lineSegments>
          )}
        </mesh>
      ))}
    </group>
  )
}
