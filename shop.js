/* Calm Coffee Supply — product picker and newsletter.
   Used by index.html (Vietnamese) and en/index.html (English); text switches on <html lang>.
   Orders are taken by phone/email: each card's "Liên hệ / Contact" button links to the contact section.

   ▶ OWNER SETTINGS: everything you may need to change is in CONFIG below.
     If you change prices, also update lowPrice/highPrice in the Product JSON-LD
     of both HTML files. */
(() => {
  const CONFIG = {
    // Newsletter sign-ups go to their own inbox. For automatic delivery, create a Web3Forms key
    // (https://web3forms.com) with THIS address and put it in newsletterKey (a key always delivers
    // to the address it was created with). Until then, sign-ups open a pre-filled email to it.
    newsletterEmail: "coffeaaroundtheworld@gmail.com",
    newsletterKey: "fce84666-bda6-4b10-8694-68fbe6156da5",

    // Price of one 250g bag of 100% Arabica / 100% Robusta (VND).
    // Blends are priced in between by ratio, rounded to the nearest 1.000₫.
    price250: { arabica: 165000, robusta: 120000 },
    sizes: [["250g", 1], ["500g", 2], ["1kg", 4]],   // bag size → price multiplier vs 250g
    maxQty: 20,
  };

  const T = document.documentElement.lang === "vi" ? {
    beans: "Hạt cà phê", ratio: "Tỉ lệ phối trộn", grind: "Độ xay",
    whole: "Nguyên hạt", ground: "Xay sẵn", size: "Khối lượng", qty: "Số lượng",
    less: "Bớt một túi", more: "Thêm một túi",
    from: "Website Calm Coffee Supply",
    nlSubject: "Đăng ký nhận tin", nlSending: "Đang gửi…",
    nlOkTitle: "Đăng ký thành công!", nlOk: (e) => `Cảm ơn bạn! Chúng tôi sẽ gửi tin về mẻ rang mới đến ${e}.`,
    nlFail: (m) => `Chưa gửi được, có thể do mạng chập chờn. Vui lòng thử lại, hoặc gửi email cho chúng tôi tại ${m}.`,
    nlRetry: "Thử lại",
  } : {
    beans: "Beans", ratio: "Blend ratio", grind: "Grind",
    whole: "Whole bean", ground: "Ground", size: "Bag size", qty: "Quantity",
    less: "One bag fewer", more: "One bag more",
    from: "Calm Coffee Supply website",
    nlSubject: "Newsletter sign-up", nlSending: "Sending…",
    nlOkTitle: "You're signed up!", nlOk: (e) => `Thank you! We'll send news about fresh roasts to ${e}.`,
    nlFail: (m) => `We couldn't send that, maybe a connection hiccup. Please try again, or email us at ${m}.`,
    nlRetry: "Try again",
  };

  const fmt = (n) => n.toLocaleString(document.documentElement.lang === "vi" ? "vi-VN" : "en-US") + "₫";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const price250 = (a) => {
    const { arabica, robusta } = CONFIG.price250;
    return Math.round((robusta + (arabica - robusta) * a / 100) / 1000) * 1000;
  };
  const mult = (size) => (CONFIG.sizes.find(([s]) => s === size) || CONFIG.sizes[0])[1];
  const unitPrice = (it) => price250(it.a) * mult(it.size);
  const clampQty = (v) => Math.min(CONFIG.maxQty, Math.max(1, parseInt(v, 10) || 1));

  async function send(fields, key) {
    // FormData (not JSON) keeps this a "simple" request, so the browser sends it without a CORS pre-check.
    const body = new FormData();
    Object.entries({ access_key: key, from_name: T.from, ...fields }).forEach(([k, v]) => { if (v != null) body.append(k, v); });
    const res = await fetch("https://api.web3forms.com/submit", { method: "POST", headers: { Accept: "application/json" }, body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.message || res.status);
  }
  const openMail = (subject, body, to) => {
    location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  /* ---------- Product picker on each card (shows the price; ordering is by contact) ---------- */
  document.querySelectorAll(".product[data-id]").forEach((card, i) => {
    const id = "p" + i;
    const start = Number(card.dataset.arabica ?? 100);
    const pill = (type, group, value, text, checked) =>
      `<label class="pill"><input type="${type}" name="${group}" value="${value}"${checked ? " checked" : ""}><span>${text}</span></label>`;

    const picker = document.createElement("div");
    picker.className = "picker";
    picker.innerHTML = `
      <fieldset><legend>${T.beans}</legend>
        ${pill("checkbox", id + "-ar", "arabica", "Arabica", start > 0)}
        ${pill("checkbox", id + "-ro", "robusta", "Robusta", start < 100)}
      </fieldset>
      <div class="ratio">
        <label for="${id}-ratio">${T.ratio}: <output for="${id}-ratio"></output></label>
        <input id="${id}-ratio" type="range" min="10" max="90" step="10" value="${start > 0 && start < 100 ? start : 50}">
      </div>
      <fieldset><legend>${T.grind}</legend>
        ${pill("radio", id + "-grind", "whole", T.whole, true)}
        ${pill("radio", id + "-grind", "ground", T.ground, false)}
      </fieldset>
      <fieldset><legend>${T.size}</legend>
        ${CONFIG.sizes.map(([s], k) => pill("radio", id + "-size", s, s, k === 0)).join("")}
      </fieldset>
      <div class="qty"><span class="qty-label" id="${id}-qlabel">${T.qty}</span>
        <button type="button" data-step="-1" aria-label="${T.less}">−</button>
        <input type="number" min="1" max="${CONFIG.maxQty}" value="1" inputmode="numeric" aria-labelledby="${id}-qlabel">
        <button type="button" data-step="1" aria-label="${T.more}">+</button>
      </div>`;
    const buy = card.querySelector(".buy");
    card.insertBefore(picker, buy);

    const $ = (s) => picker.querySelector(s);
    const ar = $(`[name="${id}-ar"]`), ro = $(`[name="${id}-ro"]`);
    const range = $('input[type="range"]'), ratioBox = $(".ratio"), out = $("output");
    const qty = $(".qty input");
    const priceEl = buy.querySelector(".price");
    priceEl.setAttribute("aria-live", "polite");

    const current = () => ({
      a: ar.checked && ro.checked ? Number(range.value) : ar.checked ? 100 : 0,
      grind: $(`[name="${id}-grind"]:checked`).value,
      size: $(`[name="${id}-size"]:checked`).value,
      qty: clampQty(qty.value),
    });
    function update() {
      ratioBox.hidden = !(ar.checked && ro.checked);
      out.textContent = `${range.value}% Arabica · ${100 - range.value}% Robusta`;
      const it = current();
      priceEl.textContent = fmt(unitPrice(it) * it.qty);
    }
    [ar, ro].forEach((cb) => cb.addEventListener("change", () => {
      if (!ar.checked && !ro.checked) (cb === ar ? ro : ar).checked = true;   // keep one ticked
    }));
    picker.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => {
      qty.value = clampQty((parseInt(qty.value, 10) || 1) + Number(b.dataset.step));
      update();
    }));
    qty.addEventListener("blur", () => { qty.value = clampQty(qty.value); update(); });
    picker.addEventListener("input", update);
    picker.addEventListener("change", update);
    update();

  });

  /* ---------- Newsletter ---------- */
  document.querySelectorAll("form.signup").forEach((form) => {
    form.removeAttribute("onsubmit");
    form.onsubmit = null;
    const btn = form.querySelector("button[type=submit], button:not([type])");
    const btnText = btn.textContent;
    const err = document.createElement("p");
    err.className = "signup-msg signup-msg--error";
    err.setAttribute("role", "alert");
    err.hidden = true;
    form.after(err);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = form.querySelector("input[type=email]").value.trim();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const hasNlKey = !CONFIG.newsletterKey.startsWith("YOUR_");
      if (!hasNlKey) { openMail(T.nlSubject, email, CONFIG.newsletterEmail); return; }

      err.hidden = true;
      btn.disabled = true; btn.textContent = T.nlSending;
      try {
        await send({ subject: `${T.nlSubject}: ${email}`, email, Newsletter: email }, CONFIG.newsletterKey);
        const ok = document.createElement("div");
        ok.className = "signup-msg signup-msg--ok";
        ok.setAttribute("role", "status");
        ok.tabIndex = -1;
        ok.innerHTML = `<p class="signup-msg__title"><span aria-hidden="true">✓</span> ${esc(T.nlOkTitle)}</p><p>${esc(T.nlOk(email))}</p>`;
        err.remove();
        form.replaceWith(ok);
        ok.focus({ preventScroll: true });
      } catch {
        btn.disabled = false; btn.textContent = T.nlRetry;
        err.innerHTML = esc(T.nlFail("§")).replace("§", `<a href="mailto:${CONFIG.newsletterEmail}?subject=${encodeURIComponent(T.nlSubject)}&body=${encodeURIComponent(email)}">${CONFIG.newsletterEmail}</a>`);
        err.hidden = false;
      }
    });
  });
})();
