let ctx = null
let master = null
let voiceBuf = null
let drone = null

export function initAudio() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  ctx.resume()
  master = ctx.createGain()
  master.gain.value = 0.9
  master.connect(ctx.destination)

  fetch('/sounds/welcome-boss.mp3')
    .then((r) => {
      if (!r.ok) throw new Error('no file')
      return r.arrayBuffer()
    })
    .then((b) => ctx.decodeAudioData(b))
    .then((buf) => {
      voiceBuf = buf
    })
    .catch(() => {})

  if ('speechSynthesis' in window) window.speechSynthesis.getVoices()
}

const now = () => ctx.currentTime

export function startDrone() {
  if (!ctx) return
  const t = now()
  const out = ctx.createGain()
  out.gain.setValueAtTime(0, t)
  out.gain.linearRampToValueAtTime(0.18, t + 3)

  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 6
  lp.frequency.setValueAtTime(120, t)
  lp.frequency.exponentialRampToValueAtTime(1100, t + 4)

  const oscs = [55, 55.6, 110].map((f, i) => {
    const o = ctx.createOscillator()
    o.type = i === 2 ? 'square' : 'sawtooth'
    o.frequency.value = f
    const g = ctx.createGain()
    g.gain.value = i === 2 ? 0.25 : 0.5
    o.connect(g).connect(lp)
    o.start(t)
    return o
  })

  lp.connect(out).connect(master)
  drone = { out, oscs }
}

export function stopDrone() {
  if (!ctx || !drone) return
  const t = now()
  drone.out.gain.cancelScheduledValues(t)
  drone.out.gain.setValueAtTime(drone.out.gain.value, t)
  drone.out.gain.linearRampToValueAtTime(0, t + 0.8)
  drone.oscs.forEach((o) => o.stop(t + 0.9))
  drone = null
}

export function blip(freq = 1200, dur = 0.07, type = 'square', vol = 0.06, delay = 0) {
  if (!ctx) return
  const t = now() + delay
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export function chime() {
  blip(660, 0.25, 'sine', 0.12, 0)
  blip(990, 0.4, 'sine', 0.12, 0.12)
}

export function boom() {
  if (!ctx) return
  const t = now()

  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(90, t)
  o.frequency.exponentialRampToValueAtTime(28, t + 1.2)
  g.gain.setValueAtTime(0.9, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + 1.5)

  const len = Math.floor(ctx.sampleRate * 1.4)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const n = ctx.createBufferSource()
  n.buffer = buf
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.2
  bp.frequency.setValueAtTime(300, t)
  bp.frequency.exponentialRampToValueAtTime(5000, t + 1.1)
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.0001, t)
  ng.gain.exponentialRampToValueAtTime(0.35, t + 0.5)
  ng.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
  n.connect(bp).connect(ng).connect(master)
  n.start(t)
}

function makeReverb(seconds = 2.2, decay = 2.5) {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * seconds)
  const ir = ctx.createBuffer(2, len, rate)
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  const conv = ctx.createConvolver()
  conv.buffer = ir
  return conv
}

function makeDistortion(amount = 6) {
  const ws = ctx.createWaveShaper()
  const n = 1024
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1
    curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x))
  }
  ws.curve = curve
  ws.oversample = '4x'
  return ws
}

function playVoiceBuffer(buf) {
  const t = now() + 0.05

  const src = ctx.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = 0.86

  const src2 = ctx.createBufferSource()
  src2.buffer = buf
  src2.playbackRate.value = 0.8
  const g2 = ctx.createGain()
  g2.gain.value = 0.35

  const low = ctx.createBiquadFilter()
  low.type = 'lowshelf'
  low.frequency.value = 220
  low.gain.value = 9

  const presence = ctx.createBiquadFilter()
  presence.type = 'peaking'
  presence.frequency.value = 2500
  presence.gain.value = 3

  const dist = makeDistortion(6)
  const comp = ctx.createDynamicsCompressor()
  const dry = ctx.createGain()
  const wet = ctx.createGain()
  wet.gain.value = 0.35
  const verb = makeReverb()

  src.connect(low)
  src2.connect(g2).connect(low)
  low.connect(presence).connect(dist).connect(comp)
  comp.connect(dry).connect(master)
  comp.connect(verb).connect(wet).connect(master)

  src.start(t)
  src2.start(t + 0.03)
}

function speakFallback() {
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance('Welcome, boss.')
  const voices = window.speechSynthesis.getVoices()
  const pick =
    voices.find((v) => /(David|Mark|Guy|Daniel|Google UK English Male|Alex|Fred)/i.test(v.name)) ||
    voices.find((v) => /^en/i.test(v.lang))
  if (pick) u.voice = pick
  u.pitch = 0.3
  u.rate = 0.75
  u.volume = 1
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export function sayWelcome() {
  if (!ctx) return
  if (voiceBuf) playVoiceBuffer(voiceBuf)
  else speakFallback()
}