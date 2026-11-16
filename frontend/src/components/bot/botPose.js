import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { getBotMood } from './botMood'

const damp = THREE.MathUtils.damp

export const POSE = {
  idle:      { eyeOpen: 1.0,  eyeTilt: 0.06, browLift: 0,     browTilt: 0.12,  smile: 0,    headTilt: 0,     track: 1.0,  gazeX: 0,     gazeY: 0,     glow: 1.0, think: 0, talk: 0 },
  listening: { eyeOpen: 1.25, eyeTilt: 0,    browLift: 0.05,  browTilt: -0.05, smile: 0.05, headTilt: 0.12,  track: 1.2,  gazeX: 0,     gazeY: 0.05,  glow: 1.3, think: 0, talk: 0 },
  thinking:  { eyeOpen: 0.55, eyeTilt: 0.28, browLift: -0.03, browTilt: 0.32,  smile: -0.1, headTilt: -0.1,  track: 0.25, gazeX: -0.35, gazeY: -0.22, glow: 0.8, think: 1, talk: 0 },
  speaking:  { eyeOpen: 0.85, eyeTilt: 0.02, browLift: 0.02,  browTilt: -0.08, smile: 0.5,  headTilt: 0.03,  track: 0.8,  gazeX: 0,     gazeY: 0,     glow: 1.3, think: 0, talk: 1 },
}

export const createPose = () => ({ ...POSE.idle, px: 0, py: 0 })

export const stepPose = (c, dt, pointer) => {
  const target = POSE[getBotMood().mood] || POSE.idle
  for (const k in target) c[k] = damp(c[k], target[k], 5, dt)
  c.px = damp(c.px, pointer.current.x, 6, dt)
  c.py = damp(c.py, pointer.current.y, 6, dt)
  return c
}

export const talkLevel = (t, c) => c.talk * (0.3 + 0.7 * Math.abs(Math.sin(t * 9) * Math.sin(t * 5.3 + 1.3)))

export const blinkValue = (t) => (t % 4.2 > 4.08 ? 1 : 0)

export function useWindowPointer() {
  const p = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const move = (e) => {
      p.current.x = (e.clientX / window.innerWidth) * 2 - 1
      p.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])
  return p
}