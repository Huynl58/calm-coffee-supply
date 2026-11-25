/* Homepage hero: scroll story over a 3D roastery diorama (both languages).
 *
 * - Story mode (any screen at least 500px tall, motion allowed; same query as the CSS in styles.css):
 *   the hero is a tall scroll track with a sticky stage. Scrolling moves through 5 stops
 *   (overview + headline → roaster drum → cooling tray → espresso bar → the shop) and
 *   swaps the captions. This part works without WebGL; the poster image stays behind it.
 *   Wide screens (WIDE_QUERY): model beside the text, travelling right → centre → left (STOPS).
 *   Phones/tablets: model centred above the text at the bottom (STOPS_COMPACT), lighter pixel ratio.
 * - three.js is fetched from the CDN once the browser is idle (not with Data Saver or ≤2 GB memory).
 *   When the model is ready the canvas fades in over the poster and the roastery
 *   "builds" itself from the ground up, then the camera follows the scroll.
 * - Short screens (<500px tall) and prefers-reduced-motion: nothing here runs; the poster is the hero.
 *
 * Model: 3d/roastery.glb (Draco). Node names used: Drum, CoolingArm, Chimney (+ every other
 * top-level node drops in during the intro). Swap the file and adjust STOPS if the layout changes.
 */

const STORY_QUERY = '(min-height: 500px) and (prefers-reduced-motion: no-preference)'
/** Wide layout: model beside the text. Otherwise compact: model centred above the text (phones, tablets). */
const WIDE_QUERY = '(min-width: 1024px) and (min-height: 640px)'
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/'

/* Camera stops, in model units. f = point to frame, yaw/pitch in degrees (45 / 35.26 = true isometric),
   zoom = multiple of the "whole model fits" zoom, sx/sy = where f sits on screen (0..1, from top-left). */
const STOPS = [
  { f: [0, 3.2, 0],        yaw: 45, pitch: 35.26, zoom: 0.92, sx: 0.70, sy: 0.49 }, // 1 overview: model right, headline left
  { f: [-2.5, 1.9, -2.6],  yaw: 32, pitch: 26,    zoom: 2.0,  sx: 0.62, sy: 0.50 }, // 2 roaster drum: moving in toward the centre, caption left
  { f: [-0.9, 1.0, -1.5],  yaw: 52, pitch: 55,    zoom: 1.9,  sx: 0.50, sy: 0.40 }, // 3 cooling tray: centre, caption bottom
  { f: [1.55, 1.45, -0.3], yaw: 72, pitch: 24,    zoom: 2.1,  sx: 0.32, sy: 0.50 }, // 4 espresso bar: left, caption right
  { f: [0, 3.2, 0],        yaw: 45, pitch: 35.26, zoom: 0.92, sx: 0.70, sy: 0.49 }, // 5 the shop: back to the first position, caption left
]
/* Compact layout (phones, tablets): the model stays centred in the upper part of the screen,
   drifting a little left/right between stops; captions sit underneath. */
const STOPS_COMPACT = [
  { f: [0, 3.2, 0],        yaw: 45, pitch: 35.26, zoom: 0.95, sx: 0.50, sy: 0.30 },
  { f: [-2.5, 1.9, -2.6],  yaw: 32, pitch: 26,    zoom: 1.9,  sx: 0.54, sy: 0.30 },
  { f: [-0.9, 1.0, -1.5],  yaw: 52, pitch: 55,    zoom: 1.8,  sx: 0.50, sy: 0.28 },
  { f: [1.55, 1.45, -0.3], yaw: 72, pitch: 24,    zoom: 1.9,  sx: 0.46, sy: 0.30 },
  { f: [0, 3.2, 0],        yaw: 45, pitch: 35.26, zoom: 0.95, sx: 0.50, sy: 0.30 },
]

const hero = document.querySelector('[data-hero3d]')
if (hero) init(hero)

function init(hero) {
  const mq = matchMedia(STORY_QUERY)
  let story = null
  const sync = () => {
    if (mq.matches) (story ??= createStory(hero)).resume()
    else story?.pause()
  }
  sync()
  mq.addEventListener('change', sync)
}

/* ------------------------------------------------------------------ scroll story */

function createStory(hero) {
  const stage = hero.querySelector('.hero-stage')
  const steps = [...hero.querySelectorAll('[data-step]')]
  const hudNum = hero.querySelector('.hero-hud-num')
  const hudBar = hero.querySelector('.hero-hud-bar')
  const last = STOPS.length - 1

  let target = 0 // scroll progress 0..1
  let current = 0 // eased progress the camera follows
  let active = -1
  let running = false
  let raf = 0
  let scene3d = null
  let lastT = performance.now()

  const readScroll = () => {
    const r = hero.getBoundingClientRect()
    const range = r.height - stage.offsetHeight
    target = range > 0 ? clamp(-r.top / range, 0, 1) : 0
  }

  const setActive = (k) => {
    if (k === active) return
    active = k
    hero.dataset.step = k
    for (const el of steps) {
      const on = Number(el.dataset.step) === k
      el.classList.toggle('is-active', on)
      el.classList.toggle('is-past', Number(el.dataset.step) < k)
      el.inert = !on // links in hidden captions aren't tabbable
      if (on) el.querySelectorAll('[data-scramble]').forEach(scramble)
    }
    if (hudNum) hudNum.textContent = String(k + 1).padStart(2, '0')
  }

  const frame = (now) => {
    raf = 0
    if (!running) return
    const dt = Math.min((now - lastT) / 1000, 0.1)
    lastT = now
    current = damp(current, target, 5, dt)
    if (Math.abs(current - target) < 1e-4) current = target
    setActive(Math.round(target * last))
    if (hudBar) hudBar.style.transform = `scaleX(${current})`
    scene3d?.render(current * last, dt)
    raf = requestAnimationFrame(frame)
  }

  // Render only while the hero is on screen.
  let visible = true
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    loop()
  }).observe(hero)
  document.addEventListener('visibilitychange', () => loop())

  const loop = () => {
    const should = running && visible && !document.hidden
    if (should && !raf) {
      lastT = performance.now()
      raf = requestAnimationFrame(frame)
    } else if (!should && raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }

  const onScroll = () => readScroll()
  let started = false

  return {
    resume() {
      if (running) return
      running = true
      hero.classList.add('is-story')
      addEventListener('scroll', onScroll, { passive: true })
      addEventListener('resize', onScroll)
      readScroll()
      current = target
      for (const el of steps) el.inert = true
      active = -1
      setActive(Math.round(target * last))
      loop()
      if (!started) {
        started = true
        // Data Saver or a low-memory phone: keep the poster (the story and captions still run).
        const lite = navigator.connection?.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 2)
        if (lite) {
          dispatchEvent(new Event('hero3d:error'))
          return
        }
        whenIdle(() =>
          load3d(hero, stage)
            .then((s) => {
              scene3d = s
              hero.classList.add('is-3d')
              dispatchEvent(new Event('hero3d:ready')) // loader.js waits for this
            })
            .catch((err) => {
              console.warn('[hero3d] keeping the poster:', err)
              dispatchEvent(new Event('hero3d:error'))
            }),
        )
      }
    },
    pause() {
      running = false
      hero.classList.remove('is-story')
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', onScroll)
      for (const el of steps) {
        el.inert = false
        el.classList.remove('is-active')
      }
      loop()
    },
  }
}

/* Scramble-in text, igloo style: letters settle left to right out of random glyphs. */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+<>/'
function scramble(el) {
  const text = (el.dataset.text ??= el.textContent)
  el.setAttribute('aria-label', text)
  const start = performance.now()
  const dur = 700
  cancelAnimationFrame(el._scr)
  const tick = (now) => {
    const t = clamp((now - start) / dur, 0, 1)
    const settled = Math.floor(t * text.length * 1.15)
    let out = ''
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      out += i < settled || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]
    }
    el.textContent = out
    if (t < 1) el._scr = requestAnimationFrame(tick)
    else el.textContent = text
  }
  el._scr = requestAnimationFrame(tick)
}

/* ------------------------------------------------------------------ three.js scene */

async function load3d(hero, stage) {
  const canvas = stage.querySelector('.hero-canvas')
  const [THREE, { GLTFLoader }, { DRACOLoader }] = await Promise.all([
    import(THREE_URL + 'build/three.module.js'),
    import(THREE_URL + 'examples/jsm/loaders/GLTFLoader.js'),
    import(THREE_URL + 'examples/jsm/loaders/DRACOLoader.js'),
  ])

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
  const wideMq = matchMedia(WIDE_QUERY)
  renderer.setPixelRatio(Math.min(devicePixelRatio, wideMq.matches ? 2 : 1.5)) // phones: lighter
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  scene.add(new THREE.AmbientLight(0xffffff, 1))
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400)

  const draco = new DRACOLoader().setDecoderPath(THREE_URL + 'examples/jsm/libs/draco/gltf/')
  const loader = new GLTFLoader().setDRACOLoader(draco)
  const url = new URL(hero.dataset.hero3d, document.baseURI).href
  const gltf = await loader.loadAsync(url)
  draco.dispose()
  const model = gltf.scene
  scene.add(model)

  // Bounds: the "fit" zoom frames the whole diorama.
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const radius = size.length() / 2
  const floorY = box.min.y
  const topY = box.max.y

  // --- Build-up intro: geometry above a rising cut line is discarded, with a warm glow at the edge.
  const build = { cut: { value: floorY - 0.1 }, band: { value: 0.35 }, glow: { value: new THREE.Color('#ffb46b') } }
  const materials = new Set()
  model.traverse((o) => {
    if (!o.isMesh) return
    for (const m of [].concat(o.material)) materials.add(m)
  })
  // --- Night (dark theme): the diorama dims to moonlight, its light sources glow, and a few fake point
  // lights throw warm/cool pools onto the surfaces around them. uNight eases 0 ↔ 1 on theme change.
  const night = { value: isDark() ? 1 : 0 }
  let nightTarget = night.value
  addEventListener('themechange', (e) => { nightTarget = e.detail === 'dark' ? 1 : 0 })
  const glowSources = markGlow(THREE, model) // per-vertex aGlow: 1 = emitter keeps its colour, 2 = window glass → warm
  const LIGHTS = [
    // position (model units)         colour      radius strength
    [[-0.8, 2.55, -0.6],  '#ffc276', 2.4, 1.15], // pendant lamp 1
    [[-0.8, 2.55, 1.6],   '#ffc276', 2.4, 1.15], // pendant lamp 2
    [[3.02, 3.1, -1.6],   '#ffd08a', 3.2, 1.2],  // street lamp
    [[-1.0, 3.2, 0.0],    '#ff9f5e', 3.4, 0.55], // string lights across the café
    [[-2.6, 0.45, -2.0],  '#ff6a2a', 1.5, 1.0],  // roaster burner (flickers)
    [[-2.0, 1.9, -1.85],  '#58c6b0', 1.1, 0.55], // roaster control screen
    [[1.53, 1.35, 0.65],  '#d6ecff', 1.2, 0.7],  // pastry case
    [[1.15, 4.9, -2.0],   '#ffcf86', 1.8, 0.6],  // upstairs room, spilling out of the windows
    // LED strip under the awning's front edge: washes the pavement, the bicycle and the shopfront
    [[-3.1, 2.1, 2.8],    '#ffc983', 2.9, 1.15],
    [[-1.4, 2.1, 2.8],    '#ffc983', 2.9, 1.15],
    [[0.3, 2.1, 2.8],     '#ffc983', 2.9, 1.15],
    [[-2.3, 1.1, 2.75],   '#ffd29a', 2.1, 1.35],  // warm pool on the pavement around the bicycle
  ]
  const lightPos = { value: LIGHTS.map((l) => new THREE.Vector3(...l[0])) }
  const lightCol = { value: LIGHTS.map((l) => new THREE.Color(l[1]).multiplyScalar(l[3])) }
  const lightRad = { value: LIGHTS.map((l) => l[2]) }
  const baseStrength = LIGHTS.map((l) => l[3])
  const NL = LIGHTS.length

  for (const m of materials) {
    m.metalness = 0
    m.roughness = 1
    m.side = THREE.DoubleSide // the cut shows insides; double-sided reads as solid while building
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, {
        uCut: build.cut, uBand: build.band, uGlow: build.glow,
        uNight: night, uLightPos: lightPos, uLightCol: lightCol, uLightRad: lightRad,
      })
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aGlow;\nvarying float vGlow;\nvarying vec3 vWorld;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvGlow = aGlow;')
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying float vGlow;
varying vec3 vWorld;
uniform float uCut, uBand, uNight;
uniform vec3 uGlow;
uniform vec3 uLightPos[${NL}];
uniform vec3 uLightCol[${NL}];
uniform float uLightRad[${NL}];`)
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vWorld.y > uCut) discard;')
        .replace(
          '#include <opaque_fragment>',
          `#include <opaque_fragment>
vec3 day = gl_FragColor.rgb;
vec3 lit = vec3(0.17, 0.19, 0.33);                       // moonlight
for (int i = 0; i < ${NL}; i++) {
  float f = clamp(1.0 - distance(vWorld, uLightPos[i]) / uLightRad[i], 0.0, 1.0);
  lit += uLightCol[i] * f * f;
}
vec3 nightCol = day * lit;
if (vGlow > 1.5) nightCol = vec3(1.0, 0.78, 0.45) * 1.15;      // window glass lit from inside
else if (vGlow > 0.5) nightCol = min(day * 1.35 + 0.08, vec3(1.0)); // bulbs, screens, LEDs
gl_FragColor.rgb = mix(day, nightCol, uNight);
gl_FragColor.rgb = mix(gl_FragColor.rgb, uGlow, smoothstep(uCut - uBand, uCut, vWorld.y) * 0.85);`,
        )
    }
    m.needsUpdate = true
  }

  // LED strip along the underside of the awning's front edge (front pavement, where the bicycle is).
  // By day a pale bar; at night it glows warm (with halos and the three lights above).
  const STRIP = { x0: -3.85, x1: 1.15, y: 2.785, z: 2.93 }
  const stripDay = new THREE.Color('#d9cfbd')
  const stripNight = new THREE.Color(1.0, 0.86, 0.62)
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(STRIP.x1 - STRIP.x0, 0.035, 0.05),
    new THREE.MeshBasicMaterial({ color: stripDay.clone() }),
  )
  strip.position.set((STRIP.x0 + STRIP.x1) / 2, STRIP.y, STRIP.z)
  strip.visible = false // appears once the build-up has finished
  scene.add(strip)
  for (let x = STRIP.x0 + 0.2; x < STRIP.x1; x += 0.42)
    glowSources.push({ pos: new THREE.Vector3(x, STRIP.y - 0.02, STRIP.z + 0.03), hex: '#ffcf8a' })

  // Soft halos around the small emitters (bulbs, fairy lights, LEDs, street lamp, LED strip), visible at night.
  const halos = makeHalos(THREE, glowSources)
  scene.add(halos.points)

  // Moving parts pop in (scale from their pivot) once the cut line has passed them.
  const props = model.children
    .filter((n) => n.name !== 'Static')
    .map((n) => ({ node: n, at: new THREE.Box3().setFromObject(n).max.y, t: 0 }))

  // Keyframed props (fans, lamps, sign) + coded ones (drum, stirring arm).
  const mixer = gltf.animations.length ? new THREE.AnimationMixer(model) : null
  for (const clip of gltf.animations) mixer.clipAction(clip).play()
  const drum = model.getObjectByName('Drum')
  const arm = model.getObjectByName('CoolingArm')

  // --- Smoke from the chimney (GPU points, positions derived in the shader).
  const chimney = model.getObjectByName('Chimney')
  let smoke = null
  if (chimney) {
    const cb = new THREE.Box3().setFromObject(chimney)
    const cw = Math.max(cb.max.x - cb.min.x, cb.max.z - cb.min.z)
    smoke = makeSmoke(THREE, { count: 30, width: cw, height: size.y * 0.32, color: '#bdb2a6' })
    smoke.points.position.set((cb.min.x + cb.max.x) / 2, cb.max.y, (cb.min.z + cb.max.z) / 2)
    smoke.points.visible = false
    scene.add(smoke.points)
  }

  // --- Floating roast chaff around the diorama.
  const chaff = makeChaff(THREE, { count: 70, box, color: '#8a5a3c', night: '#ffab5c' })
  scene.add(chaff.points)

  // --- Layout
  // The stage runs up under the clear header: frame the model in the area below it (sy is measured from there).
  let W = 1, H = 1, top = 0, fitZoom = 1, stops = STOPS
  const resize = () => {
    W = stage.clientWidth
    H = stage.clientHeight
    top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0
    camera.left = -W / 2
    camera.right = W / 2
    camera.top = H / 2
    camera.bottom = -H / 2
    stops = wideMq.matches ? STOPS : STOPS_COMPACT
    fitZoom = wideMq.matches
      ? Math.min((H - top) * 0.8, W * 0.54) / (radius * 1.55)
      : Math.min((H - top) * 0.5, W * 0.92) / (radius * 1.55)
    renderer.setPixelRatio(Math.min(devicePixelRatio, wideMq.matches ? 2 : 1.5))
    renderer.setSize(W, H, false)
  }
  new ResizeObserver(resize).observe(stage)
  resize()

  // --- Cursor parallax (a couple of degrees, eased)
  const pointer = { x: 0, y: 0, cx: 0, cy: 0 }
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return
    pointer.x = (e.clientX / innerWidth) * 2 - 1
    pointer.y = (e.clientY / innerHeight) * 2 - 1
  }, { passive: true })
  document.documentElement.addEventListener('pointerleave', () => { pointer.x = pointer.y = 0 })

  const focus = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const right = new THREE.Vector3()
  const up = new THREE.Vector3()
  const deg = Math.PI / 180

  const placeCamera = (s) => {
    const a = stops[Math.floor(s)]
    const b = stops[Math.min(Math.floor(s) + 1, stops.length - 1)]
    const t = smoothstep(0.12, 0.88, s - Math.floor(s)) // hold a moment at each stop
    const yaw = (lerp(a.yaw, b.yaw, t) + pointer.cx * 2.5) * deg
    const pitch = (lerp(a.pitch, b.pitch, t) - pointer.cy * 2) * deg
    const zoom = fitZoom * lerp(a.zoom, b.zoom, t)
    focus.set(lerp(a.f[0], b.f[0], t), lerp(a.f[1], b.f[1], t), lerp(a.f[2], b.f[2], t))
    dir.set(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw))
    camera.position.copy(focus).addScaledVector(dir, 100)
    camera.up.set(0, 1, 0)
    camera.lookAt(focus)
    camera.updateMatrixWorld()
    // Shift the camera so the focus point lands at (sx, sy) on screen instead of the centre.
    right.setFromMatrixColumn(camera.matrixWorld, 0)
    up.setFromMatrixColumn(camera.matrixWorld, 1)
    const dx = ((lerp(a.sx, b.sx, t) - 0.5) * W) / zoom
    const dy = (0.5 * H - (top + lerp(a.sy, b.sy, t) * (H - top))) / zoom
    camera.position.addScaledVector(right, -dx).addScaledVector(up, -dy)
    camera.zoom = zoom
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
  }

  // --- Intro timeline
  const BUILD = 2.4 // seconds for the cut line to rise from floor to roof
  let clock = 0
  let built = false

  const render = (s, dt) => {
    // Hold the build-up intro while the loading screen is up (loader.js removes html.is-loading).
    if (!document.documentElement.classList.contains('is-loading')) clock += dt
    pointer.cx = damp(pointer.cx, pointer.x, 3, dt)
    pointer.cy = damp(pointer.cy, pointer.y, 3, dt)

    if (!built) {
      const k = clamp(clock / BUILD, 0, 1)
      build.cut.value = lerp(floorY - 0.1, topY + build.band.value + 0.2, easeInOut(k))
      if (k >= 1) {
        built = true
        build.band.value = 0
        for (const m of materials) m.side = THREE.FrontSide
      }
    }
    for (const p of props) {
      if (p.t >= 1) continue
      if (build.cut.value > p.at) p.t = Math.min(p.t + dt / 0.6, 1)
      p.node.scale.setScalar(Math.max(easeOutBack(p.t), 0.0001))
      p.node.visible = p.t > 0
    }
    if (smoke && build.cut.value > topY - 1) smoke.points.visible = true
    if (built) strip.visible = true

    mixer?.update(dt)
    night.value = damp(night.value, nightTarget, 2.2, dt)
    if (Math.abs(night.value - nightTarget) < 0.002) night.value = nightTarget
    strip.material.color.copy(stripDay).lerp(stripNight, night.value)
    // the roaster burner flickers; the pendant lamps breathe very slightly
    const fl = 0.75 + 0.25 * Math.sin(clock * 13.1) * Math.sin(clock * 7.3 + 1.7)
    lightCol.value[4].set(LIGHTS[4][1]).multiplyScalar(baseStrength[4] * fl)
    if (drum) drum.rotation.x += dt * 0.6
    if (arm) arm.rotation.y += dt * 0.35

    placeCamera(s)
    const pxPerUnit = camera.zoom * renderer.getPixelRatio()
    if (smoke) smoke.update(dt, pxPerUnit)
    chaff.update(dt, pxPerUnit, Math.min(clock / 2, 1), night.value)
    halos.update(clock, pxPerUnit, night.value * (built ? 1 : 0))
    renderer.render(scene, camera)
  }

  render(0, 0) // compile shaders before the canvas fades in
  return { render }
}

function makeSmoke(THREE, { count, width, height, color }) {
  const pos = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * width * 0.3
    pos.set([Math.cos(a) * r, 0, Math.sin(a) * r], i * 3)
    seed[i] = i / count + Math.random() * 0.02
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: true,
    uniforms: {
      uTime: { value: 0 },
      uHeight: { value: height },
      uSize: { value: width * 1.6 },
      uScale: { value: 1 },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: `
      attribute float aSeed;
      uniform float uTime, uHeight, uSize, uScale;
      varying float vAlpha;
      void main() {
        float life = fract(uTime * 0.12 + aSeed);
        vec3 p = position;
        p.xz *= 1.0 + life * 2.5;
        p.x += sin(life * 5.0 + aSeed * 31.0) * 0.12 * uHeight * life;
        p.y += life * uHeight;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * uScale * (0.35 + life * 1.1);
        vAlpha = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.45, 1.0, life));
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = 1.0 - smoothstep(0.0, 1.0, d);
        a *= a * vAlpha * 0.5;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  })
  const points = new THREE.Points(g, mat)
  points.frustumCulled = false
  points.renderOrder = 1
  return {
    points,
    update(dt, pxPerUnit) {
      mat.uniforms.uTime.value += dt
      mat.uniforms.uScale.value = pxPerUnit
    },
  }
}

function makeChaff(THREE, { count, box, color, night }) {
  const pos = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  const pad = 1.5
  for (let i = 0; i < count; i++) {
    pos.set(
      [
        lerp(box.min.x - pad, box.max.x + pad, Math.random()),
        lerp(box.min.y, box.max.y + pad, Math.random()),
        lerp(box.min.z - pad, box.max.z + pad, Math.random()),
      ],
      i * 3,
    )
    seed[i] = Math.random()
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: true,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 1 },
      uFade: { value: 0 },
      uRise: { value: box.max.y - box.min.y + pad },
      uColor: { value: new THREE.Color(color) },
      uEmber: { value: new THREE.Color(night) },
      uNight: { value: 0 },
    },
    vertexShader: `
      attribute float aSeed;
      uniform float uTime, uScale, uRise;
      varying float vAlpha;
      void main() {
        float life = fract(uTime * (0.015 + aSeed * 0.02) + aSeed);
        vec3 p = position;
        p.y = mod(p.y + life * uRise, uRise) - 0.4;
        p.x += sin(uTime * 0.4 + aSeed * 40.0) * 0.25;
        p.z += cos(uTime * 0.3 + aSeed * 23.0) * 0.25;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(uScale * (0.035 + aSeed * 0.045), 1.5, 9.0);
        vAlpha = sin(fract(uTime * 0.1 + aSeed) * 3.14159);
      }`,
    fragmentShader: `
      uniform vec3 uColor, uEmber;
      uniform float uFade, uNight;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = (1.0 - smoothstep(0.4, 1.0, d)) * vAlpha * 0.55 * uFade;
        // night: the chaff turns into glowing embers (brighter colour, less coverage → reads as light)
        vec3 c = mix(uColor, uEmber * 1.6, uNight);
        gl_FragColor = vec4(c * a, a * (1.0 - 0.55 * uNight));
      }`,
  })
  const points = new THREE.Points(g, mat)
  points.frustumCulled = false
  return {
    points,
    update(dt, pxPerUnit, fade, nightAmount = 0) {
      mat.uniforms.uTime.value += dt
      mat.uniforms.uScale.value = pxPerUnit
      mat.uniforms.uFade.value = fade
      mat.uniforms.uNight.value = nightAmount
    },
  }
}

/* Is the page in the dark theme? (explicit choice, or the system setting when none was made) */
function isDark() {
  const t = document.documentElement.dataset.theme
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
}

/* The model's lighting is baked into vertex colours; parts that were "lit from within" in the bake
   (windows, bulbs, screens, LEDs…) were written as their exact colour ×1.05. Find those vertices by colour
   and tag them with an aGlow attribute: 2 = window glass (turns warm at night), 1 = any other emitter.
   Also returns small-emitter clusters (bulbs, fairy lights, LEDs, lamps) for the halo sprites. */
function markGlow(THREE, model) {
  const EMITTERS = {
    window: ['#a9cfd6'],
    keep: ['#ffd99a', '#58c6b0', '#cfe3e6', '#efe6d6'],
    halo: ['#ffcf7a', '#ff9f6b', '#fff1c4', '#7be07b', '#ffb347', '#ff6b5b', '#fff0c8', '#ffd9a0'],
  }
  const targets = []
  for (const [kind, hexes] of Object.entries(EMITTERS))
    for (const hex of hexes) targets.push({ kind, hex, c: new THREE.Color(hex).multiplyScalar(1.05) })
  const TOL = 0.012
  const clusters = new Map()
  const v = new THREE.Vector3()
  model.updateMatrixWorld(true)
  model.traverse((o) => {
    if (!o.isMesh) return
    const col = o.geometry.getAttribute('color')
    const pos = o.geometry.getAttribute('position')
    const glow = new Float32Array(pos.count)
    if (col) {
      for (let i = 0; i < col.count; i++) {
        const r = col.getX(i), g = col.getY(i), b = col.getZ(i)
        for (const t of targets) {
          if (Math.abs(r - t.c.r) < TOL && Math.abs(g - t.c.g) < TOL && Math.abs(b - t.c.b) < TOL) {
            glow[i] = t.kind === 'window' ? 2 : 1
            if (t.kind === 'halo' && o.name !== 'Drum') { // the drum spins; a fixed halo would drift off it
              v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
              const key = `${Math.round(v.x / 0.12)},${Math.round(v.y / 0.12)},${Math.round(v.z / 0.12)}`
              const k = clusters.get(key) ?? { sum: new THREE.Vector3(), n: 0, hex: t.hex, node: o }
              k.sum.add(v)
              k.n++
              clusters.set(key, k)
            }
            break
          }
        }
      }
    }
    o.geometry.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1))
  })
  return [...clusters.values()].map((k) => ({ pos: k.sum.divideScalar(k.n), hex: k.hex }))
}

/* Additive glow sprites at each small emitter; size and strength follow the night amount. */
function makeHalos(THREE, sources) {
  const n = sources.length
  const pos = new Float32Array(n * 3)
  const col = new Float32Array(n * 3)
  const seed = new Float32Array(n)
  const c = new THREE.Color()
  sources.forEach((s, i) => {
    pos.set([s.pos.x, s.pos.y, s.pos.z], i * 3)
    c.set(s.hex)
    col.set([c.r, c.g, c.b], i * 3)
    seed[i] = Math.random()
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uNight: { value: 0 } },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSeed;
      uniform float uTime, uScale, uNight;
      varying vec3 vColor;
      varying float vA;
      void main() {
        vColor = aColor;
        vA = uNight * (0.8 + 0.2 * sin(uTime * (1.5 + aSeed * 2.0) + aSeed * 30.0)); // gentle twinkle
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        mv.z += 0.3; // pull toward the camera so the halo isn't cut by the bulb itself
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uScale * 0.55, 6.0, 90.0);
      }`,
    fragmentShader: `
      varying vec3 vColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = exp(-d * d * 5.0) * (1.0 - smoothstep(0.8, 1.0, d)) * vA * 0.55;
        gl_FragColor = vec4(vColor * a, 1.0);
      }`,
  })
  const points = new THREE.Points(g, mat)
  points.frustumCulled = false
  points.renderOrder = 2
  return {
    points,
    count: n,
    update(t, pxPerUnit, nightAmount) {
      mat.uniforms.uTime.value = t
      mat.uniforms.uScale.value = pxPerUnit
      mat.uniforms.uNight.value = nightAmount
      points.visible = nightAmount > 0.01
    },
  }
}

/* ------------------------------------------------------------------ helpers */

function whenIdle(fn) {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 1500 })
  else setTimeout(fn, 200)
}
function clamp(v, a, b) { return Math.min(Math.max(v, a), b) }
function lerp(a, b, t) { return a + (b - a) * t }
function damp(a, b, lambda, dt) { return lerp(a, b, 1 - Math.exp(-lambda * dt)) }
function smoothstep(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t) }
function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
function easeOutBack(t) { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) }
