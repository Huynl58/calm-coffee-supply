/* Background music with an on/off button (bottom-left, every page).
 *
 * The music is composed live with the Web Audio API: no audio file, nothing to license.
 * A slow lo-fi café loop: warm chords (Rhodes-like keys + pad), a round bass, a soft brushed
 * beat, an occasional plucked melody note, and quiet vinyl crackle.
 *
 * - Off by default. Browsers only allow sound after a click/tap/keypress, so the button starts it.
 * - The choice is remembered (localStorage). If it was on, the next page resumes the music on the
 *   visitor's first click or keypress anywhere.
 * - Pauses while the tab is hidden; fades in and out instead of cutting.
 *
 * To use a real track instead later: set TRACK_URL to an MP3 path (e.g. 'audio/music.mp3').
 */
(() => {
  const TRACK_URL = '' // optional: a looping MP3/M4A path relative to the site root
  const SITE_ROOT = new URL('./', document.currentScript?.src || location.href) // sound.js lives at the site root
  const STORE_KEY = 'ccs-music'
  const VOLUME = 0.55
  const vi = document.documentElement.lang !== 'en'
  const T = vi
    ? { on: 'Bật nhạc nền', off: 'Tắt nhạc nền' }
    : { on: 'Turn background music on', off: 'Turn background music off' }

  // ---------------------------------------------------------------- button
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'sound-toggle'
  btn.setAttribute('aria-pressed', 'false')
  btn.innerHTML =
    '<svg class="sound-toggle__play" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6c0 .5.5.8.9.5l7.2-4.8a.6.6 0 0 0 0-1L5.9 2.7c-.4-.3-.9 0-.9.5z" fill="currentColor"/></svg>' +
    '<span class="sound-toggle__bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'
  document.body.append(btn)

  let wantOn = false
  const show = (on) => {
    btn.classList.toggle('is-on', on)
    btn.setAttribute('aria-pressed', String(on))
    btn.setAttribute('aria-label', on ? T.off : T.on)
    btn.title = on ? T.off : T.on
  }
  const remember = (on) => {
    try { localStorage.setItem(STORE_KEY, on ? 'on' : 'off') } catch {}
  }
  show(false)

  btn.addEventListener('click', () => {
    wantOn = !wantOn
    remember(wantOn)
    show(wantOn)
    wantOn ? start() : stop()
  })

  // Was it on last time? Resume on the first interaction (browsers block sound before one).
  let stored = null
  try { stored = localStorage.getItem(STORE_KEY) } catch {}
  if (stored === 'on') {
    wantOn = true
    show(true)
    const kick = (e) => {
      if (e.target.closest?.('.sound-toggle')) return // the button handles its own click
      removeEventListener('pointerdown', kick, true)
      removeEventListener('keydown', kick, true)
      if (wantOn) start()
    }
    addEventListener('pointerdown', kick, true)
    addEventListener('keydown', kick, true)
  }

  document.addEventListener('visibilitychange', () => {
    if (!wantOn || !engine) return
    document.hidden ? engine.pause() : engine.play()
  })

  // ---------------------------------------------------------------- engine
  let engine = null
  function start() {
    engine ??= TRACK_URL ? fileEngine(TRACK_URL) : synthEngine()
    engine.play()
  }
  function stop() {
    engine?.pause()
  }

  /** A real track, if TRACK_URL is set. */
  function fileEngine(url) {
    const audio = new Audio(new URL(url, SITE_ROOT).href)
    audio.loop = true
    audio.volume = 0
    let fade = 0
    const ramp = (to, done) => {
      cancelAnimationFrame(fade)
      const from = audio.volume, t0 = performance.now()
      const step = (now) => {
        const k = Math.min((now - t0) / 1200, 1)
        audio.volume = from + (to - from) * k
        if (k < 1) fade = requestAnimationFrame(step)
        else done?.()
      }
      fade = requestAnimationFrame(step)
    }
    return {
      play() { audio.play().catch(() => {}); ramp(VOLUME) },
      pause() { ramp(0, () => audio.pause()) },
    }
  }

  /** The generated lo-fi loop. */
  function synthEngine() {
    const AC = window.AudioContext || window.webkitAudioContext
    const ctx = new AC()
    const master = ctx.createGain()
    master.gain.value = 0
    // Warm it up: gentle low-pass, then a soft compressor so nothing pokes out.
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 2600
    tone.Q.value = 0.4
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -20
    comp.ratio.value = 3
    master.connect(tone).connect(comp).connect(ctx.destination)

    // Room: a short generated reverb, mixed in on a send.
    const verb = ctx.createConvolver()
    verb.buffer = impulse(ctx, 2.8, 2.6)
    const verbSend = ctx.createGain()
    verbSend.gain.value = 0.35
    verbSend.connect(verb).connect(master)
    const bus = ctx.createGain() // dry instruments
    bus.connect(master)
    bus.connect(verbSend)

    // ---- vinyl crackle + hiss (always running quietly)
    const noise = noiseBuffer(ctx, 2)
    const hiss = ctx.createBufferSource()
    hiss.buffer = noise
    hiss.loop = true
    const hissF = ctx.createBiquadFilter()
    hissF.type = 'bandpass'
    hissF.frequency.value = 5000
    hissF.Q.value = 0.6
    const hissG = ctx.createGain()
    hissG.gain.value = 0.012
    hiss.connect(hissF).connect(hissG).connect(master)
    hiss.start()

    const crackle = ctx.createBufferSource()
    crackle.buffer = crackleBuffer(ctx, 4)
    crackle.loop = true
    const crackleG = ctx.createGain()
    crackleG.gain.value = 0.05
    crackle.connect(crackleG).connect(master)
    crackle.start()

    // ---- music: 72 bpm, 4 chords × 1 bar, jazzy ii–V–I–vi in C
    const BPM = 72
    const BEAT = 60 / BPM
    const midi = (n) => 440 * Math.pow(2, (n - 69) / 12)
    const CHORDS = [
      { root: 38, notes: [53, 57, 60, 64] }, // Dm9   (F A C E)
      { root: 43, notes: [53, 57, 59, 64] }, // G13   (F A B E)
      { root: 36, notes: [52, 55, 59, 62] }, // Cmaj9 (E G B D)
      { root: 45, notes: [55, 59, 60, 64] }, // Am9   (G B C E)
    ]
    const SCALE = [72, 74, 76, 79, 81, 84] // C major pentatonic, upper register

    const keys = (t, freq, vel, dur) => {
      // Rhodes-ish: sine + a quiet bell partial, fast attack, long exponential decay
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(vel, t + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur)
      g.connect(bus)
      for (const [mult, amp, type] of [[1, 1, 'sine'], [2, 0.18, 'sine'], [3.01, 0.06, 'triangle']]) {
        const o = ctx.createOscillator()
        o.type = type
        o.frequency.value = freq * mult
        o.detune.value = (Math.random() - 0.5) * 8
        const a = ctx.createGain()
        a.gain.value = amp
        o.connect(a).connect(g)
        o.start(t)
        o.stop(t + dur + 0.05)
      }
    }
    const pad = (t, freq, dur) => {
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.018, t + 0.9)
      g.gain.setValueAtTime(0.018, t + dur - 0.6)
      g.gain.linearRampToValueAtTime(0, t + dur + 0.6)
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = 900
      g.connect(f).connect(bus)
      for (const d of [-7, 7]) {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = freq
        o.detune.value = d
        o.connect(g)
        o.start(t)
        o.stop(t + dur + 0.7)
      }
    }
    const bass = (t, freq, dur) => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.22, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
      o.connect(g).connect(master) // dry: keep the low end out of the reverb
      o.start(t)
      o.stop(t + dur + 0.05)
    }
    const kick = (t) => {
      const o = ctx.createOscillator()
      o.frequency.setValueAtTime(110, t)
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.32, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
      o.connect(g).connect(master)
      o.start(t)
      o.stop(t + 0.3)
    }
    const brush = (t, vel, len = 0.09) => {
      const s = ctx.createBufferSource()
      s.buffer = noise
      const f = ctx.createBiquadFilter()
      f.type = 'highpass'
      f.frequency.value = 6500
      const g = ctx.createGain()
      g.gain.setValueAtTime(vel, t)
      g.gain.exponentialRampToValueAtTime(0.0005, t + len)
      s.connect(f).connect(g).connect(bus)
      s.start(t, Math.random() * 1.5, len + 0.02)
    }
    const snare = (t) => {
      const s = ctx.createBufferSource()
      s.buffer = noise
      const f = ctx.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = 1800
      f.Q.value = 0.7
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.07, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
      s.connect(f).connect(g).connect(bus)
      s.start(t, Math.random() * 1.5, 0.25)
    }

    // Lookahead scheduler: queue one bar at a time, a little ahead of the clock.
    let bar = 0
    let nextBar = 0
    let timer = 0
    const swing = BEAT * 0.12
    const scheduleBar = (t0) => {
      const chord = CHORDS[bar % CHORDS.length]
      const barLen = BEAT * 4
      // pad under everything
      for (const n of chord.notes) pad(t0, midi(n), barLen)
      // keys: on 1 and the "and" of 2, slightly strummed
      chord.notes.forEach((n, i) => keys(t0 + i * 0.018, midi(n), 0.05, BEAT * 3.2))
      chord.notes.slice(1).forEach((n, i) => keys(t0 + BEAT * 1.5 + swing + i * 0.015, midi(n), 0.03, BEAT * 2))
      // bass: root on 1, fifth-ish pickup on the "and" of 3
      bass(t0, midi(chord.root), BEAT * 2.4)
      bass(t0 + BEAT * 2.5 + swing, midi(chord.root + 7), BEAT * 1.2)
      // drums: soft kick 1 & 3+, snare on 2 & 4, swung brushes on 8ths (drums sit out every 8th bar)
      if (bar % 8 !== 7) {
        kick(t0)
        kick(t0 + BEAT * 2.5 + swing)
        snare(t0 + BEAT)
        snare(t0 + BEAT * 3)
        for (let i = 0; i < 8; i++) brush(t0 + i * (BEAT / 2) + (i % 2 ? swing : 0), i % 2 ? 0.02 : 0.035)
      }
      // a sparse plucked melody: one or two notes, sometimes none
      const count = Math.random() < 0.3 ? 0 : 1 + (Math.random() < 0.4 ? 1 : 0)
      for (let i = 0; i < count; i++) {
        const beat = [0.5, 1.5, 2, 2.5, 3.5][(Math.random() * 5) | 0]
        const note = SCALE[(Math.random() * SCALE.length) | 0]
        keys(t0 + beat * BEAT + swing, midi(note), 0.035, BEAT * 2.5)
      }
      bar++
    }
    const tick = () => {
      while (nextBar < ctx.currentTime + 0.6) {
        scheduleBar(nextBar)
        nextBar += BEAT * 4
      }
    }

    let stopTimer = 0
    return {
      play() {
        clearTimeout(stopTimer)
        ctx.resume().then(() => {
          if (!timer) {
            nextBar = Math.max(nextBar, ctx.currentTime + 0.1)
            tick()
            timer = setInterval(tick, 150)
          }
          const now = ctx.currentTime
          master.gain.cancelScheduledValues(now)
          master.gain.setValueAtTime(master.gain.value, now)
          master.gain.linearRampToValueAtTime(VOLUME, now + 1.8)
        })
      },
      pause() {
        const now = ctx.currentTime
        master.gain.cancelScheduledValues(now)
        master.gain.setValueAtTime(master.gain.value, now)
        master.gain.linearRampToValueAtTime(0, now + 1)
        clearTimeout(stopTimer)
        stopTimer = setTimeout(() => {
          clearInterval(timer)
          timer = 0
          ctx.suspend()
        }, 1100)
      },
    }
  }

  function noiseBuffer(ctx, seconds) {
    const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    return b
  }
  function crackleBuffer(ctx, seconds) {
    const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      if (Math.random() < 0.0006) {
        const amp = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1)
        const len = 20 + ((Math.random() * 60) | 0)
        for (let j = 0; j < len && i + j < d.length; j++) d[i + j] += amp * Math.exp(-j / 8)
      }
    }
    return b
  }
  function impulse(ctx, seconds, decay) {
    const len = ctx.sampleRate * seconds
    const b = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
    return b
  }
})()
