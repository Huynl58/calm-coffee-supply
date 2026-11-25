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
