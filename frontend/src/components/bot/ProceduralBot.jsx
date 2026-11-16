import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createPose, stepPose, talkLevel, blinkValue } from './botPose'

const damp = THREE.MathUtils.damp
const GLOW_EYE = new THREE.Color('#e8fdff').multiplyScalar(2.6)
const GLOW_VIOLET = new THREE.Color('#8b5cf6').multiplyScalar(1.8)
const COWL = new THREE.Color('#0b0c10')
const STEEL = new THREE.Color('#aab4c6')
const MOUTH_Y = -0.55
const MOUTH_Z = 0.72

const FEATURES = [
  [0, 0.33, 0.84, 0.55, 0.09, 0.3, 0.07],
  [-0.26, 0.15, 0.82, 0.15, 0.085, 0.25, -0.06],
  [0.26, 0.15, 0.82, 0.15, 0.085, 0.25, -0.06],
  [0, 0.0, 0.89, 0.06, 0.28, 0.22, 0.08],
  [0, -0.22, 0.88, 0.09, 0.07, 0.2, 0.08],
  [-0.4, -0.08, 0.75, 0.16, 0.11, 0.3, 0.05],
  [0.4, -0.08, 0.75, 0.16, 0.11, 0.3, 0.05],
  [-0.36, -0.4, 0.62, 0.13, 0.12, 0.25, -0.04],
  [0.36, -0.4, 0.62, 0.13, 0.12, 0.25, -0.04],
  [0, -0.55, 0.7, 0.25, 0.04, 0.25, -0.03],
  [0, -0.5, 0.72, 0.2, 0.04, 0.2, 0.025],
  [0, -0.61, 0.72, 0.18, 0.045, 0.2, 0.03],
  [0, -0.86, 0.42, 0.17, 0.12, 0.28, 0.08],
]

const bump = (v, f) => {
  const dx = (v.x - f[0]) / f[3]
  const dy = (v.y - f[1]) / f[4]
  const dz = (v.z - f[2]) / f[5]
  return f[6] * Math.exp(-(dx * dx + dy * dy + dz * dz))
}

const patchJaw = (shader) => {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float aJaw;\nvarying float vJaw;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvJaw = aJaw;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vJaw;')
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.6, 0.2, vJaw);')
    .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(0.1, 0.95, vJaw);')
}

function buildHead() {
  const g = new THREE.SphereGeometry(1, 176, 176)
  g.rotateY(-Math.PI / 2)
  const p = g.attributes.position
  const colors = new Float32Array(p.count * 3)
  const jaw = new Float32Array(p.count)
  const v = new THREE.Vector3()
  const n = new THREE.Vector3()
  const c = new THREE.Color()

  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    v.x *= 0.8
    v.z *= 0.9
    if (v.y < -0.1) {
      const k = THREE.MathUtils.smoothstep(-v.y, 0.1, 1.0)
      v.x *= 1 - 0.42 * k
      v.z *= 1 - 0.12 * k
      v.y *= 0.95
    }
    n.copy(v).normalize()
    let d = 0
    for (const f of FEATURES) d += bump(v, f)
    v.addScaledVector(n, d)
    p.setXYZ(i, v.x, v.y, v.z)

    const line = -0.22 - Math.pow(Math.abs(v.x), 1.4) * 0.45
    let t = THREE.MathUtils.smoothstep(v.y, line - 0.02, line + 0.02)
    const front = THREE.MathUtils.smoothstep(v.z, -0.15, 0.2)
    t = 1 - (1 - t) * front
    c.lerpColors(STEEL, COWL, t)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
    jaw[i] = 1 - t
  }

  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.setAttribute('aJaw', new THREE.BufferAttribute(jaw, 1))
  g.computeVertexNormals()
  return g
}

function makeBand(seg = 32) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((seg + 1) * 6), 3))
  const idx = []
  for (let i = 0; i < seg; i++) {
    const a = i * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  g.setIndex(idx)
  return g
}

function setBand(geo, top, bottom) {
  const pos = geo.attributes.position
  const seg = pos.count / 2 - 1
  for (let i = 0; i <= seg; i++) {
    const u = (i / seg) * 2 - 1
    const a = top(u)
    const b = bottom(u)
    pos.setXYZ(i * 2, a[0], a[1], a[2])
    pos.setXYZ(i * 2 + 1, b[0], b[1], b[2])
  }
  pos.needsUpdate = true
}

export default function ProceduralBot({ pointer }) {
  const headGeo = useMemo(() => buildHead(), [])
  const upper = useMemo(() => makeBand(), [])
  const lower = useMemo(() => makeBand(), [])
  const cavity = useMemo(() => makeBand(), [])

  const eyeGeo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.lineTo(0.3, 0.1)
    s.lineTo(0.35, 0.05)
    s.lineTo(0.07, -0.06)
    s.closePath()
    return new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false })
  }, [])

  const skin = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      metalness: 0.5,
      roughness: 0.4,
      clearcoat: 0.6,
      clearcoatRoughness: 0.35,
      sheen: 1,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color('#3b4a66'),
      envMapIntensity: 1.3,
    })
    m.onBeforeCompile = patchJaw
    m.customProgramCacheKey = () => 'darpan-skin'
    return m
  }, [])

  const armor = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#0b0c10',
        metalness: 0.2,
        roughness: 0.5,
        clearcoat: 0.4,
        clearcoatRoughness: 0.5,
        sheen: 1,
        sheenRoughness: 0.6,
        sheenColor: new THREE.Color('#2a3550'),
        envMapIntensity: 1.2,
      }),
    []
  )

  const eyeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: GLOW_EYE.clone(), toneMapped: false }), [])
  const mouthMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#020203',
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      }),
    []
  )

  const cur = useRef(createPose())
  const blinkRef = useRef(0)
  const body = useRef()
  const head = useRef()
  const eyeGroup = useRef()
  const eyeL = useRef()
  const eyeR = useRef()
  const browL = useRef()
  const browR = useRef()
  const ring = useRef()
  const ringMat = useRef()

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const c = stepPose(cur.current, dt, pointer)

    head.current.rotation.y = c.px * 0.7 * c.track + c.gazeX + Math.sin(t * 0.6) * 0.03
    head.current.rotation.x = -c.py * 0.4 * c.track + c.gazeY
    head.current.rotation.z = -c.px * 0.08 * c.track + c.headTilt

    body.current.rotation.y = c.px * 0.18
    body.current.position.y = -0.3 + Math.sin(t * 1.2) * 0.035

    eyeGroup.current.position.x = c.px * 0.04 * c.track + c.gazeX * 0.08
    eyeGroup.current.position.y = 0.15 + c.py * 0.025 * c.track - c.gazeY * 0.08

    blinkRef.current = damp(blinkRef.current, blinkValue(t), 35, dt)
    const open = Math.max(0.06, c.eyeOpen * (1 - blinkRef.current * 0.94))
    eyeL.current.scale.y = open
    eyeR.current.scale.y = open
    eyeL.current.rotation.z = -c.eyeTilt
    eyeR.current.rotation.z = c.eyeTilt
    eyeMat.color.copy(GLOW_EYE).multiplyScalar(c.glow * (1 + 0.15 * Math.sin(t * 8) * c.think))

    browL.current.position.y = c.browLift
    browR.current.position.y = c.browLift
    browL.current.rotation.z = -c.browTilt
    browR.current.rotation.z = c.browTilt

    const talk = talkLevel(t, c)
    const half = 0.27 + c.smile * 0.05
    const gap = 0.012 + talk * 0.085
    const lip = (u, drop, dy) => {
      const x = u * half
      const y = MOUTH_Y + c.smile * 0.11 * u * u - drop * (1 - u * u) + dy
      return [x, y, MOUTH_Z - 1.45 * x * x]
    }
    setBand(upper, (u) => lip(u, 0, 0.006), (u) => lip(u, 0, -0.006))
    setBand(lower, (u) => lip(u, gap, 0.006), (u) => lip(u, gap, -0.006))
    setBand(cavity, (u) => lip(u, 0, -0.006), (u) => lip(u, gap, 0.006))

    ring.current.visible = c.think > 0.02
    ring.current.rotation.x = t * 1.4
    ring.current.rotation.y = t * 0.9
    ringMat.current.opacity = c.think * 0.85
  })

  return (
    <group ref={body} position={[0, -0.3, 0]}>
      <mesh position={[0, -1.1, -0.05]} material={armor}>
        <cylinderGeometry args={[0.3, 0.42, 0.8, 32]} />
      </mesh>

      <mesh position={[0, -1.85, -0.05]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.75]} material={armor}>
        <capsuleGeometry args={[0.5, 1.7, 8, 32]} />
      </mesh>

      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.95, -1.45, -0.15]} rotation={[0, 0, -s * 0.5]} scale={[1, 1, 0.5]} material={armor}>
          <coneGeometry args={[0.25, 0.9, 4]} />
        </mesh>
      ))}

      <mesh position={[0, -1.8, 0.4]}>
        <circleGeometry args={[0.09, 6]} />
        <meshBasicMaterial color={GLOW_EYE} toneMapped={false} />
      </mesh>

      <mesh ref={ring} position={[0, 0.1, 0]}>
        <torusGeometry args={[1.5, 0.007, 8, 180]} />
        <meshBasicMaterial ref={ringMat} color={GLOW_VIOLET} toneMapped={false} transparent opacity={0} />
      </mesh>

      <group ref={head}>
        <mesh geometry={headGeo} material={skin} />

        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.5, 1.05, -0.05]} rotation={[-0.2, 0, -s * 0.22]} scale={[1, 1, 0.4]} material={armor}>
            <coneGeometry args={[0.14, 0.7, 4]} />
          </mesh>
        ))}

        <group position={[-0.27, 0.37, 0.78]} rotation={[-0.3, -0.35, 0]}>
          <mesh ref={browL} material={armor}>
            <boxGeometry args={[0.42, 0.045, 0.12]} />
          </mesh>
        </group>
        <group position={[0.27, 0.37, 0.78]} rotation={[-0.3, 0.35, 0]}>
          <mesh ref={browR} material={armor}>
            <boxGeometry args={[0.42, 0.045, 0.12]} />
          </mesh>
        </group>

        <group ref={eyeGroup} position={[0, 0.15, 0.92]}>
          <mesh ref={eyeL} geometry={eyeGeo} material={eyeMat} position={[-0.07, 0, 0]} rotation={[0, -0.38, 0]} scale={[-1, 1, 1]} />
          <mesh ref={eyeR} geometry={eyeGeo} material={eyeMat} position={[0.07, 0, 0]} rotation={[0, 0.38, 0]} />
        </group>

        <mesh geometry={cavity} material={mouthMat} frustumCulled={false} />
        <mesh geometry={upper} material={mouthMat} frustumCulled={false} />
        <mesh geometry={lower} material={mouthMat} frustumCulled={false} />
      </group>
    </group>
  )
}
