// Menu button (every screen size): opens and closes the slide-in menu panel on the left.
(() => {
  const btn = document.querySelector(".menu-toggle");
  const header = document.querySelector(".site-header");
  const menu = document.getElementById("site-menu");
  if (!btn || !header || !menu) return;

  const setOpen = (open) => {
    header.classList.toggle("menu-open", open);
    document.documentElement.classList.toggle("menu-lock", open); // the page behind doesn't scroll
    btn.setAttribute("aria-expanded", String(open));
    if (open) setTimeout(() => menu.querySelector("a")?.focus({ preventScroll: true }), 350);
  };

  btn.addEventListener("click", () => setOpen(btn.getAttribute("aria-expanded") !== "true"));
  // Close after picking a link, on Escape, or on a click on the dimmed page (the header's ::before).
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });
  header.addEventListener("click", (e) => {
    if (e.target === header && header.classList.contains("menu-open")) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && header.classList.contains("menu-open")) { setOpen(false); btn.focus(); }
  });
})();

// Header height → --header-h (the homepage hero runs up under the header and pins below it),
// and the homepage header's clear → solid switch when section 2 comes up.
(() => {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const root = document.documentElement;
  const measure = () => {
    root.style.setProperty("--header-h", header.offsetHeight + "px");
  };
  new ResizeObserver(measure).observe(header);
  measure();

  const hero = document.querySelector(".hero");
  if (!hero) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    // Story mode (wide screens): fill in as soon as the pinned story ends and section 2 starts coming up.
    // Phones / no story: the roastery picture would slide under the logo, so fill in as soon as the page moves.
    const solid = hero.classList.contains("is-story")
      ? hero.getBoundingClientRect().bottom < innerHeight - 1
      : scrollY > 16;
    header.classList.toggle("is-solid", solid);
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  update();
})();

// Light / dark theme. Follows the system until the visitor picks one (saved as "ccs-theme").
// The <head> script applies a saved choice before first paint; this wires the header button
// (wide screens) and the "Light | Dark" switch in the menu panel, and tells the 3D hero ("themechange").
(() => {
  const root = document.documentElement;
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  const vi = root.lang !== "en";
  const L = vi ? { toDark: "Giao diện tối", toLight: "Giao diện sáng" } : { toDark: "Dark theme", toLight: "Light theme" };
  const current = () => root.dataset.theme || (systemDark.matches ? "dark" : "light");

  const sync = () => {
    const t = current();
    document.querySelectorAll(".theme-toggle").forEach((b) => {
      b.setAttribute("aria-label", t === "dark" ? L.toLight : L.toDark);
      b.title = t === "dark" ? L.toLight : L.toDark;
    });
    document.querySelectorAll("[data-theme-set]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeSet === t)));
    dispatchEvent(new CustomEvent("themechange", { detail: t }));
  };
  const set = (t) => {
    if (t === current()) return;
    root.classList.add("theme-anim");
    root.dataset.theme = t;
    try { localStorage.setItem("ccs-theme", t); } catch {}
    sync();
    setTimeout(() => root.classList.remove("theme-anim"), 700);
  };

  document.querySelectorAll(".theme-toggle").forEach((b) => b.addEventListener("click", () => set(current() === "dark" ? "light" : "dark")));
  document.querySelectorAll("[data-theme-set]").forEach((b) => b.addEventListener("click", () => set(b.dataset.themeSet)));
  systemDark.addEventListener("change", () => { if (!root.dataset.theme) sync(); });
  sync();
})();
