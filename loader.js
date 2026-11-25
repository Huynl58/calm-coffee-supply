/* Homepage loading screen (both languages).
 *
 * Burgundy screen, the white logo draws itself (styles.css, "Loading screen"), and a white cup
 * fills with coffee 0% → 100% following real progress; when full the pour stops and steam rises,
 * then the screen wipes up to reveal the page.
 * - Shown once per visit: the inline script in <head> adds html.is-loading unless
 *   sessionStorage has "ccs-loaded". No JavaScript → no loader.
 * - Progress: fonts (30) + page images loaded (30) + the 3D roastery (40) on wide screens,
 *   where hero3d.js fires "hero3d:ready" or "hero3d:error". Elsewhere the 3D share is free.
 * - Stays at least MIN_MS so the logo animation can play, at most MAX_MS whatever happens.
 * - hero3d.js holds its build-up intro until html.is-loading is gone.
 */
(() => {
  const root = document.documentElement
  const loader = document.querySelector('.loader')
  if (!loader || !root.classList.contains('is-loading')) {
    loader?.remove()
    return
  }

  const MIN_MS = 2300
  const MAX_MS = 9000
  const STORY_QUERY = '(min-width: 1024px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)'
  const pctEl = loader.querySelector('.loader__pct')
  const liquid = loader.querySelector('.loader__liquid')
  const stream = loader.querySelector('.loader__stream')
  const EMPTY = 92, FULL = 50 // coffee surface in the cup's SVG units (bottom → just under the rim)
  const t0 = performance.now()

  let target = 0
  let shown = 0
  let finished = false
  const add = (n) => { target = Math.min(100, target + n) }

  document.fonts?.ready.then(() => add(30)) ?? add(30)
  if (document.readyState === 'complete') add(30)
  else addEventListener('load', () => add(30), { once: true })
  if (matchMedia(STORY_QUERY).matches) {
    addEventListener('hero3d:ready', () => add(40), { once: true })
    addEventListener('hero3d:error', () => add(40), { once: true })
  } else add(40)

  scrollTo(0, 0)

  const tick = (now) => {
    const elapsed = now - t0
    // Count up smoothly toward real progress, never faster than the logo animation.
    const cap = Math.min(100, (elapsed / MIN_MS) * 100)
    const goal = elapsed > MAX_MS ? 100 : Math.min(target, cap)
    if (goal > shown) shown = Math.min(goal, shown + Math.max((goal - shown) * 0.08, 0.7)) // eased, but never crawling
    pctEl.textContent = String(Math.round(shown))
    const surface = EMPTY - (EMPTY - FULL) * (shown / 100)
    liquid.setAttribute('transform', `translate(0 ${surface.toFixed(2)})`)
    stream.setAttribute('y2', surface.toFixed(2))
    if (shown >= 100 && !finished) return done()
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)

  function done() {
    finished = true
    try { sessionStorage.setItem('ccs-loaded', '1') } catch {}
    loader.classList.add('is-full') // the pour stops, a little steam rises
    setTimeout(() => {
      loader.classList.add('is-leaving')
      // Hand over to the page once the wipe has mostly covered the screen; then clean up.
      setTimeout(() => {
        root.classList.remove('is-loading')
        dispatchEvent(new Event('loader:done'))
      }, 700)
      setTimeout(() => loader.remove(), 1500)
    }, 650)
  }
})()
