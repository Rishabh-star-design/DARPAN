import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { createPose, stepPose, talkLevel, blinkValue } from './botPose'

const MODEL_HEIGHT = 4.6
const TOP_Y = 1.2
const FACE_FLIP = false
const YAW_SIGN = 1
const PITCH_SIGN = 1

const damp = THREE.MathUtils.damp

const setMorph = (meshes, name, value) => {
  for (const m of meshes) {
    const i = m.morphTargetDictionary[name]
    if (i !== undefined) m.morphTargetInfluences[i] = value
  }
}

export default function RealBot({ url, pointer }) {
  const { scene } = useGLTF(url)
  const inner = useRef()
  const cur = useRef(createPose())
  const blinkRef = useRef(0)
  const tmpE = useMemo(() => new THREE.Euler(), [])
  const tmpQ = useMemo(() => new THREE.Quaternion(), [])

  const rig = useMemo(() => {
    let head = null
    let neck = null
    const meshes = []
    scene.traverse((o) => {
      if (o.isBone) {
        const n = o.name.toLowerCase()
        if (!head && n.endsWith('head')) head = o
        if (!neck && n.endsWith('neck')) neck = o
      }
      if (o.isMesh) {
        o.frustumCulled = false
        if (o.morphTargetDictionary && o.morphTargetInfluences) meshes.push(o)
      }
    })
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const scale = MODEL_HEIGHT / size.y
    return {
      head,
      neck,
      meshes,
      scale,
      offsetX: -((box.min.x + box.max.x) / 2) * scale,
      offsetY: TOP_Y - box.max.y * scale,
      headBase: head ? head.quaternion.clone() : null,
      neckBase: neck ? neck.quaternion.clone() : null,
    }
  }, [scene])

  const aim = (bone, base, pitch, yaw, roll) => {
    tmpE.set(pitch * PITCH_SIGN, yaw * YAW_SIGN, roll)
    tmpQ.setFromEuler(tmpE)
    bone.quaternion.copy(base).multiply(tmpQ)
  }

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const c = stepPose(cur.current, dt, pointer)

    const yaw = c.px * 0.6 * c.track + c.gazeX + Math.sin(t * 0.6) * 0.03
    const pitch = -c.py * 0.35 * c.track + c.gazeY
    const roll = -c.px * 0.08 * c.track + c.headTilt

    if (rig.head) {
      aim(rig.head, rig.headBase, pitch * 0.7, yaw * 0.7, roll * 0.7)
      if (rig.neck) aim(rig.neck, rig.neckBase, pitch * 0.3, yaw * 0.3, roll * 0.3)
    } else {
      inner.current.rotation.set(pitch * 0.4, yaw * 0.5, roll * 0.3)
    }

    blinkRef.current = damp(blinkRef.current, blinkValue(t), 35, dt)
    const talk = talkLevel(t, c)
    const wide = Math.max(0, c.eyeOpen - 1) * 2
    const squint = Math.max(0, 1 - c.eyeOpen) * 0.8
    const m = rig.meshes

    setMorph(m, 'eyeBlinkLeft', blinkRef.current)
    setMorph(m, 'eyeBlinkRight', blinkRef.current)
    setMorph(m, 'eyeWideLeft', wide)
    setMorph(m, 'eyeWideRight', wide)
    setMorph(m, 'eyeSquintLeft', squint)
    setMorph(m, 'eyeSquintRight', squint)
    setMorph(m, 'browDownLeft', Math.max(0, c.browTilt) * 1.6)
    setMorph(m, 'browDownRight', Math.max(0, c.browTilt) * 1.6)
    setMorph(m, 'browInnerUp', Math.max(0, c.browLift) * 4 + Math.max(0, -c.browTilt) * 2)
    setMorph(m, 'mouthSmileLeft', Math.max(0, c.smile) * 1.2)
    setMorph(m, 'mouthSmileRight', Math.max(0, c.smile) * 1.2)
    setMorph(m, 'mouthFrownLeft', Math.max(0, -c.smile) * 3)
    setMorph(m, 'mouthFrownRight', Math.max(0, -c.smile) * 3)
    setMorph(m, 'jawOpen', talk * 0.45)
  })

  return (
    <group rotation-y={FACE_FLIP ? Math.PI : 0}>
      <group ref={inner} scale={rig.scale} position={[rig.offsetX, rig.offsetY, 0]}>
        <primitive object={scene} />
      </group>
    </group>
  )
}
