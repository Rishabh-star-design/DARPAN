import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

const planeVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const smokeFragment = `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  uniform vec2 uSeed;
  uniform float uRound;
  uniform float uSpeed;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float t = uTime * 0.04 * uSpeed;
    vec2 p = vUv * 3.2 + uSeed;
    vec2 q = vec2(fbm(p + vec2(t, 0.0)), fbm(p + vec2(5.2, 1.3) - vec2(0.0, t)));
    float f = fbm(p + 2.2 * q + t);
    float rect = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x) * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
    float rad = smoothstep(0.5, 0.08, distance(vUv, vec2(0.5)));
    float mask = mix(rect, rad, uRound);
    float d = smoothstep(0.2, 0.7, f) * mask;
    vec3 col = mix(uColorA, uColorB, q.x);
    gl_FragColor = vec4(col, d * uOpacity);
  }
`

function Smoke({ position, rotation = [0, 0, 0], size, colorA, colorB, opacity, seed, round = 0, speed = 1 }) {
  const meshRef = useRef(null)
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color(colorA) },
          uColorB: { value: new THREE.Color(colorB) },
          uOpacity: { value: opacity },
          uSeed: { value: new THREE.Vector2(seed[0], seed[1]) },
          uRound: { value: round },
          uSpeed: { value: speed },
        },
        vertexShader: planeVertex,
        fragmentShader: smokeFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [colorA, colorB, opacity, round, seed, speed]
  )

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} material={mat}>
      <planeGeometry args={size} />
    </mesh>
  )
}

function Beam({ position, rotation, color, intensity = 0.45 }) {
  const meshRef = useRef(null)
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uIntensity: { value: intensity },
          uTime: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            vUv = uv;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uIntensity;
          uniform float uTime;
          varying vec2 vUv;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            float along = pow(vUv.y, 0.9);
            float core = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
            float flick = 0.92 + 0.08 * sin(uTime * 0.7 + vUv.x * 6.0);
            gl_FragColor = vec4(uColor, along * core * uIntensity * flick);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [color, intensity]
  )

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} material={mat}>
      <coneGeometry args={[1.8, 9, 48, 1, true]} />
    </mesh>
  )
}

function Pool() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color('#22d3ee') } },
        vertexShader: planeVertex,
        fragmentShader: `
          uniform vec3 uColor;
          varying vec2 vUv;
          void main() {
            float r = distance(vUv, vec2(0.5)) * 2.0;
            float a = pow(clamp(1.0 - r, 0.0, 1.0), 2.4) * 0.45;
            gl_FragColor = vec4(uColor, a);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  )

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -2.49, 0]} material={mat}>
      <circleGeometry args={[4.5, 64]} />
    </mesh>
  )
}

function Floor() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -2.5, 0]}>
      <planeGeometry args={[40, 40]} />
      <MeshReflectorMaterial
        blur={[400, 120]}
        resolution={512}
        mixBlur={1}
        mixStrength={35}
        mirror={0.6}
        roughness={1}
        depthScale={1.1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#07080c"
        metalness={0.6}
      />
    </mesh>
  )
}

export default function Atmosphere() {
  return (
    <>
      <Floor />
      <Pool />
      <Smoke position={[0, 0.5, -6]} size={[26, 14]} colorA="#1fa3c4" colorB="#6d3fd6" opacity={0.6} seed={[0, 0]} />
      <Smoke position={[-3, -0.5, -3.5]} size={[16, 9]} colorA="#1a8fb0" colorB="#3a4fd0" opacity={0.45} seed={[7, 3]} speed={1.3} />
      <Smoke position={[0, -2.35, 0]} rotation={[-Math.PI / 2, 0, 0]} size={[16, 16]} colorA="#2bb5d6" colorB="#7a45e0" opacity={0.6} seed={[3, 9]} round={1} speed={1.6} />
      <Beam position={[-2.8, 1.6, -1.5]} rotation={[0, 0, 0.35]} color="#22d3ee" intensity={1.1} />
      <Beam position={[2.8, 1.6, -1.5]} rotation={[0, 0, -0.35]} color="#8b5cf6" intensity={0.9} />
      <Sparkles count={120} scale={[10, 6, 6]} size={2.2} speed={0.25} opacity={0.8} color="#9be7ff" />
      <Sparkles count={26} scale={[10, 6, 5]} size={8} speed={0.15} opacity={0.22} color="#8b5cf6" />
    </>
  )
}
