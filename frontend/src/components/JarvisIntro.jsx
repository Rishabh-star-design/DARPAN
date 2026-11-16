import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import * as sfx from './jarvisAudio'
import './JarvisIntro.css'

gsap.registerPlugin(useGSAP)

const WORD = 'DARPAN'.split('')
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*<>/'
const rand = () => GLYPHS[(Math.random() * GLYPHS.length) | 0]

const BOOT_LINES = [
  'INITIALIZING DARPAN CORE',
  'LOADING NEURAL MODULES',
  'CALIBRATING MIND MIRROR',
  'LINKING AI ENGINES',
  'ALL SYSTEMS ONLINE',
]

function Gate({ onStart }) {
  const ref = useRef(null)

  useGSAP(
    () => {
      gsap.from('.jv-gate-item', { y: 24, opacity: 0, duration: 1, stagger: 0.15, ease: 'expo.out' })
      gsap.to('.jv-gate-ring-a', { rotation: 360, duration: 24, repeat: -1, ease: 'none' })
      gsap.to('.jv-gate-ring-b', { rotation: -360, duration: 40, repeat: -1, ease: 'none' })
      gsap.to('.jv-gate-btn', {
        boxShadow: '0 0 40px rgba(34,211,238,0.55)',
        repeat: -1,
        yoyo: true,
        duration: 1.2,
        ease: 'sine.inOut',
      })
    },
    { scope: ref }
  )

  return (
    <div ref={ref} className="jv jv-gate">
      <div className="jv-gate-ring jv-gate-ring-a" />
      <div className="jv-gate-ring jv-gate-ring-b" />
      <div className="jv-gate-inner">
        <span className="jv-gate-item jv-gate-tag">MIRROR OF THE MIND</span>
        <h1 className="jv-gate-item jv-gate-title">DARPAN</h1>
        <button className="jv-gate-item jv-gate-btn" autoFocus onClick={() => onStart(true)}>
          Initialize
        </button>
        <button className="jv-gate-item jv-gate-skip" onClick={() => onStart(false)}>
          enter without sound
        </button>
      </div>
    </div>
  )
}

function IntroStage({ onReveal, onDone }) {
  const root = useRef(null)
  const pctRef = useRef(null)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        onReveal?.()
        onDone?.()
        return
      }

      const letters = gsap.utils.toArray('.jv-letter')
      const counter = { v: 0 }
      const decode = { p: 0 }
      let locked = 0

      gsap.set('.jv-draw', { strokeDashoffset: 1 })
      gsap.set('.jv-fade, .jv-corner, .jv-tag, .jv-grid, .jv-title, .jv-sub', { opacity: 0 })
      gsap.set('.jv-hud', { scale: 0.5, rotation: -40 })
      gsap.set('.jv-line', { opacity: 0, x: -16 })
      gsap.set('.jv-sub', { letterSpacing: '1em' })

      gsap.to('.jv-spin-a', { rotation: 360, svgOrigin: '300 300', duration: 50, repeat: -1, ease: 'none' })
      gsap.to('.jv-spin-b', { rotation: -360, svgOrigin: '300 300', duration: 30, repeat: -1, ease: 'none' })
      gsap.to('.jv-spin-c', { rotation: 360, svgOrigin: '300 300', duration: 12, repeat: -1, ease: 'none' })
      gsap.to('.jv-core', { scale: 1.2, svgOrigin: '300 300', duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      gsap.fromTo('.jv-scan', { y: 0 }, { y: window.innerHeight, duration: 2.2, repeat: 2, ease: 'none' })

      sfx.startDrone()

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.to('.jv-grid', { opacity: 1, duration: 1 }, 0)
        .to('.jv-hud', { scale: 1, rotation: 0, duration: 1.8, ease: 'expo.out' }, 0)
        .to('.jv-draw', { strokeDashoffset: 0, duration: 1.6, stagger: 0.2, ease: 'power2.inOut' }, 0.1)
        .to('.jv-fade', { opacity: 1, duration: 0.8, stagger: 0.15 }, 0.6)
        .to('.jv-corner, .jv-tag', { opacity: 1, duration: 0.6, stagger: 0.1 }, 0.5)
        .to(
          counter,
          {
            v: 100,
            duration: 2.6,
            ease: 'power1.inOut',
            onUpdate: () => {
              if (pctRef.current) {
                pctRef.current.textContent = String(Math.round(counter.v)).padStart(3, '0')
              }
            },
          },
          0.6
        )
        .to('.jv-line', { opacity: 1, x: 0, duration: 0.35, stagger: 0.5 }, 0.9)

      BOOT_LINES.forEach((_, i) => {
        tl.call(
          () => (i === BOOT_LINES.length - 1 ? sfx.chime() : sfx.blip(900 + i * 220)),
          null,
          0.9 + i * 0.5
        )
      })

      tl
        .to('.jv-flash', { opacity: 0.35, duration: 0.12, yoyo: true, repeat: 1 })
        .to('.jv-pct', { opacity: 0, scale: 0.6, duration: 0.4, ease: 'power2.in' }, '<')
        .addLabel('decode')
        .set('.jv-title', { opacity: 1 })
        .to(decode, {
          p: 1,
          duration: 1.1,
          ease: 'none',
          onUpdate: () => {
            letters.forEach((el, i) => {
              el.textContent = decode.p >= (i + 1) / letters.length ? WORD[i] : rand()
            })
            const n = Math.floor(decode.p * letters.length + 1e-6)
            if (n > locked) {
              locked = n
              sfx.blip(1800, 0.04, 'square', 0.05)
            }
          },
        })
        .to('.jv-title', { x: 4, skewX: 8, duration: 0.04, repeat: 5, yoyo: true, ease: 'none' })
        .set('.jv-title', { x: 0, skewX: 0 })
        .to('.jv-sub', { opacity: 1, letterSpacing: '0.45em', duration: 1, ease: 'power2.out' }, '-=0.5')
        .call(() => sfx.sayWelcome(), null, 'decode+=0.6')
        .addLabel('exit', '+=0.6')
        .call(
          () => {
            sfx.boom()
            sfx.stopDrone()
          },
          null,
          'exit+=0.3'
        )
        .to('.jv-brand, .jv-log, .jv-corner, .jv-tag, .jv-scan, .jv-grid', { opacity: 0, duration: 0.5 }, 'exit')
        .to('.jv-hud', { scale: 2.6, opacity: 0, duration: 1, ease: 'power3.in' }, 'exit')
        .to('.jv-door-l', { xPercent: -100, duration: 1.2, ease: 'expo.inOut' }, 'exit+=0.3')
        .to('.jv-door-r', { xPercent: 100, duration: 1.2, ease: 'expo.inOut' }, 'exit+=0.3')
        .call(() => onReveal?.(), null, 'exit+=0.3')
        .call(() => onDone?.())

      return () => sfx.stopDrone()
    },
    { scope: root }
  )

  return (
    <div ref={root} className="jv">
      <div className="jv-door jv-door-l" />
      <div className="jv-door jv-door-r" />
      <div className="jv-grid" />
      <div className="jv-flash" />
      <div className="jv-scan" />

      <div className="jv-stage">
        <svg className="jv-hud" viewBox="0 0 600 600" fill="none">
          <defs>
            <radialGradient id="jvCore">
              <stop offset="0" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
            </radialGradient>
            <filter id="jvGlow">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g filter="url(#jvGlow)">
            <circle className="jv-draw" cx="300" cy="300" r="292" pathLength="1" strokeDasharray="1" stroke="#8b5cf6" strokeWidth="1.5" />

            <g className="jv-spin-a">
              <circle className="jv-fade" cx="300" cy="300" r="278" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="2 10" />
            </g>

            <g className="jv-spin-b jv-fade" strokeWidth="1.5">
              {Array.from({ length: 90 }, (_, i) => (
                <line
                  key={i}
                  x1="300"
                  y1="50"
                  x2="300"
                  y2={i % 5 === 0 ? 36 : 43}
                  stroke={i % 5 === 0 ? '#22d3ee' : '#8b5cf6'}
                  transform={`rotate(${i * 4} 300 300)`}
                />
              ))}
            </g>

            <g className="jv-spin-c">
              <circle className="jv-fade" cx="300" cy="300" r="215" stroke="#22d3ee" strokeWidth="5" strokeDasharray="260 40 120 40 380 40 120 40" />
            </g>

            <circle className="jv-draw" cx="300" cy="300" r="170" pathLength="1" strokeDasharray="1" stroke="#8b5cf6" strokeWidth="1" />
            <g className="jv-spin-b">
              <circle className="jv-fade" cx="300" cy="300" r="150" stroke="#22d3ee" strokeWidth="2" strokeDasharray="1 7" />
            </g>

            <path className="jv-fade" d="M300 8V30M300 570V592M8 300H30M570 300H592" stroke="#22d3ee" strokeWidth="2" />

            <circle className="jv-core" cx="300" cy="300" r="110" fill="url(#jvCore)" opacity="0.55" />
          </g>
        </svg>

        <div className="jv-center">
          <div className="jv-pct">
            <span ref={pctRef}>000</span>
            <small>%</small>
          </div>
          <div className="jv-brand">
            <h1 className="jv-title">
              {WORD.map((_, i) => (
                <span key={i} className="jv-letter">&nbsp;</span>
              ))}
            </h1>
            <p className="jv-sub">MIRROR OF THE MIND</p>
          </div>
        </div>
      </div>

      <i className="jv-corner tl" />
      <i className="jv-corner tr" />
      <i className="jv-corner bl" />
      <i className="jv-corner br" />
      <span className="jv-tag jv-tag-l">DARPAN // BOOT SEQUENCE</span>
      <span className="jv-tag jv-tag-r">SECURE LINK · ENCRYPTED</span>

      <div className="jv-log">
        {BOOT_LINES.map((t, i) => (
          <div key={t} className={`jv-line ${i === BOOT_LINES.length - 1 ? 'ok' : ''}`}>
            <span>›</span> {t}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function JarvisIntro(props) {
  const [started, setStarted] = useState(false)

  if (!started) {
    return (
      <Gate
        onStart={(withSound) => {
          if (withSound) sfx.initAudio()
          setStarted(true)
        }}
      />
    )
  }
  return <IntroStage {...props} />
}