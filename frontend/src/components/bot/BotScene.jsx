import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import * as THREE from 'three'
import Atmosphere from './Atmosphere'
import ProceduralBot from './ProceduralBot'
import { useWindowPointer } from './botPose'
import './BotScene.css'

const damp = THREE.MathUtils.damp

function Stage({ compact, children }) {
  const g = useRef()
  useFrame((_, dt) => {
    const s = compact ? 0.55 : 1
    g.current.scale.setScalar(damp(g.current.scale.x, s, 3, dt))
    g.current.position.x = damp(g.current.position.x, compact ? 2.7 : 0, 3, dt)
    g.current.position.y = damp(g.current.position.y, compact ? 0.5 : 0, 3, dt)
  })
  return <group ref={g}>{children}</group>
}

function Rig({ pointer }) {
  useFrame((state, dt) => {
    const { x, y } = pointer.current
    state.camera.position.x = damp(state.camera.position.x, x * 0.5, 2, dt)
    state.camera.position.y = damp(state.camera.position.y, 0.35 + y * 0.25, 2, dt)
    state.camera.lookAt(0, -0.5, 0)
  })
  return null
}

export default function BotScene({ compact = false }) {
  const pointer = useWindowPointer()

  return (
    <div className="bot-canvas">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0.35, 6], fov: 45 }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
        <color attach="background" args={['#030409']} />
        <fog attach="fog" args={['#030409', 9, 20]} />

        <ambientLight intensity={0.08} />
        <spotLight position={[2.5, 4, 5]} angle={0.5} penumbra={1} intensity={220} color="#dfe8ff" distance={20} decay={2} />
        <pointLight position={[0, 0.5, 5]} intensity={30} color="#9bbcff" distance={14} />
        <pointLight position={[-3.5, 1.5, -2.5]} intensity={40} color="#22d3ee" distance={12} />
        <pointLight position={[3.5, 1, -2.5]} intensity={34} color="#8b5cf6" distance={12} />

        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={3.2} color="#22d3ee" position={[-5, 1, -3]} scale={[1.2, 9, 1]} />
          <Lightformer form="rect" intensity={3} color="#8b5cf6" position={[5, 1, -3]} scale={[1.2, 9, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[0, 6, 2]} scale={[10, 2.5, 1]} />
          <Lightformer form="ring" intensity={0.8} color="#bcd4ff" position={[0, 1, 6]} scale={3} />
        </Environment>

        <Rig pointer={pointer} />
        <Atmosphere />

        <Stage compact={compact}>
          <ProceduralBot pointer={pointer} />
        </Stage>

        <EffectComposer multisampling={2}>
          <Bloom intensity={0.9} luminanceThreshold={0.7} luminanceSmoothing={0.25} mipmapBlur />
          <Noise opacity={0.045} />
          <Vignette offset={0.25} darkness={0.85} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}