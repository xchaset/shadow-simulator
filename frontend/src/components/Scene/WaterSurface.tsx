import { useRef, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

const glslNoise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 10.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m * m * m;
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
`

const waterVertexShader = /* glsl */ `
uniform float uWaterLevel;
uniform float uTime;
uniform float uWaveHeight;
${glslNoise}

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWaterNormal;

vec3 gerstnerWave(vec2 pos, vec2 dir, float steepness, float wavelength, float speed) {
  float k = 6.28318 / wavelength;
  float c = speed / k;
  float a = steepness / k;
  float phase = k * (dot(dir, pos) - c * uTime);
  return vec3(dir.x * a * cos(phase), a * sin(phase), dir.y * a * cos(phase));
}

void main() {
  vUv = uv;
  vec3 pos = position;

  vec3 wave = vec3(0.0);
  wave += gerstnerWave(pos.xz, normalize(vec2(0.3, 1.0)), 0.15, 18.0, 3.5);
  wave += gerstnerWave(pos.xz, normalize(vec2(-0.2, 0.8)), 0.1,  12.0, 2.8);
  wave += gerstnerWave(pos.xz, normalize(vec2(0.5, 0.6)), 0.06,  7.0, 4.2);
  float fbmDisp = snoise(pos.xz * 0.02 + uTime * 0.06) * uWaveHeight * 0.4;

  pos.x += wave.x;
  pos.z += wave.y * uWaveHeight + fbmDisp;
  pos.y += wave.z;

  float eps = 0.5;
  vec3 waveR = gerstnerWave(pos.xz + vec2(eps, 0.0), normalize(vec2(0.3, 1.0)), 0.15, 18.0, 3.5);
  vec3 waveF = gerstnerWave(pos.xz + vec2(0.0, eps), normalize(vec2(0.3, 1.0)), 0.15, 18.0, 3.5);
  vec3 tangent = normalize(vec3(eps, (waveR.y - wave.y) * uWaveHeight, 0.0));
  vec3 bitangent = normalize(vec3(0.0, (waveF.y - wave.y) * uWaveHeight, eps));
  vWaterNormal = normalize(cross(bitangent, tangent));

  vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

const waterFragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uWaterColor;
uniform vec3 uWaterDeepColor;
uniform float uWaterOpacity;
uniform vec3 uSunDir;
${glslNoise}

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWaterNormal;

float caustics(vec2 p, float t) {
  float c = 0.0;
  vec2 uv1 = p * 3.0 + vec2(t * 0.04, t * 0.03);
  vec2 uv2 = p * 5.0 - vec2(t * 0.03, t * 0.05);
  float n1 = snoise(uv1);
  float n2 = snoise(uv2);
  c = pow(abs(n1 + n2) * 0.5 + 0.5, 3.0);
  return c;
}

void main() {
  float halfCycle = 4.0;
  float phase = mod(uTime, halfCycle * 2.0);
  float blend = abs(phase / halfCycle - 1.0);

  vec2 flowDir = vec2(0.08, 0.12);
  vec2 uv1 = vUv + flowDir * uTime;
  vec2 uv2 = vUv + flowDir * (uTime + halfCycle) + vec2(0.37, 0.19);

  float layer1 = snoise(uv1 * 6.0) * 0.5 + 0.5;
  float layer2 = snoise(uv2 * 6.0) * 0.5 + 0.5;
  float flowPattern = mix(layer1, layer2, blend);

  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - max(dot(viewDir, vWaterNormal), 0.0), 3.0);
  fresnel = mix(0.04, 0.7, fresnel);

  float depth = vUv.y * (0.8 + flowPattern * 0.2);
  vec3 shallowColor = uWaterColor * 1.15;
  vec3 deepColor = uWaterDeepColor;
  vec3 waterColor = mix(shallowColor, deepColor, depth);

  vec3 skyColor = vec3(0.55, 0.72, 0.88);
  waterColor = mix(waterColor, skyColor, fresnel * 0.5);

  float caust = caustics(vUv, uTime);
  waterColor += caust * vec3(0.08, 0.12, 0.15) * 0.5;

  vec3 halfVec = normalize(viewDir + uSunDir);
  float specAngle = max(dot(vWaterNormal, halfVec), 0.0);
  float spec = pow(specAngle, 128.0) * 0.6;
  float scatter = pow(specAngle, 16.0) * 0.15;
  waterColor += (spec + scatter) * vec3(1.0, 0.97, 0.9);

  float microDetail = snoise(vUv * 40.0 + uTime * vec2(0.1, 0.15)) * 0.03;
  waterColor += microDetail;

  gl_FragColor = vec4(waterColor, uWaterOpacity);
}
`

export function WaterSurface() {
  const canvasSize = useStore(s => s.canvasSize)
  const lake = useStore(s => s.lake)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const defaultSunDir = useMemo(() => new THREE.Vector3(0.5, 0.8, 0.3).normalize(), [])

  const waterColors = useMemo(() => {
    const base = new THREE.Color(lake.waterColor)
    const deep = new THREE.Color(lake.waterColor).multiplyScalar(0.45)
    return { base, deep }
  }, [lake.waterColor])

  const uniforms = useMemo(() => ({
    uWaterLevel: { value: lake.waterLevel },
    uTime: { value: 0 },
    uWaveHeight: { value: lake.waveHeight },
    uWaterColor: { value: waterColors.base },
    uWaterDeepColor: { value: waterColors.deep },
    uWaterOpacity: { value: lake.opacity },
    uSunDir: { value: defaultSunDir },
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state, delta) => {
    if (!materialRef.current) return
    const u = materialRef.current.uniforms

    u.uTime.value += delta
    u.uWaterLevel.value = lake.waterLevel
    u.uWaveHeight.value = lake.waveHeight
    u.uWaterColor.value = waterColors.base
    u.uWaterDeepColor.value = waterColors.deep
    u.uWaterOpacity.value = lake.opacity

    const dirLight = state.scene.getObjectByProperty('type', 'DirectionalLight') as THREE.DirectionalLight | undefined
    if (dirLight) {
      u.uSunDir.value.copy(dirLight.position).normalize()
    }
  })

  if (!lake.enabled) return null

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, lake.waterLevel, 0]}
      receiveShadow
    >
      <planeGeometry args={[canvasSize, canvasSize, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}
