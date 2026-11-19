// Phone/tablet menu button: opens and closes the header menu.
(() => {
  const btn = document.querySelector(".menu-toggle");
  const header = document.querySelector(".site-header");
  if (!btn || !header) return;

  const setOpen = (open) => {
    header.classList.toggle("menu-open", open);
    btn.setAttribute("aria-expanded", String(open));
  };

  btn.addEventListener("click", () => setOpen(btn.getAttribute("aria-expanded") !== "true"));
  // Close after picking a section, on Escape, or when the screen gets wide enough for the full menu.
  document.getElementById("site-menu")?.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && header.classList.contains("menu-open")) { setOpen(false); btn.focus(); }
  });
  matchMedia("(min-width: 1008px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
})();
