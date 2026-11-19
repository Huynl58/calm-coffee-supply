/* Calm Coffee Supply — product picker, cart, checkout and newsletter.
   Used by index.html (Vietnamese) and en/index.html (English); text switches on <html lang>.

   ▶ OWNER SETTINGS: everything you may need to change is in CONFIG below.
     If you change prices, also update lowPrice/highPrice in the Product JSON-LD
     of both HTML files. */
(() => {
  const CONFIG = {
    // Where orders are delivered. Get a free key at https://web3forms.com
    // (enter coffeaaroundtheworld@gmail.com; the key arrives by email). Until it is set,
    // checkout falls back to opening a pre-filled email so no order is lost.
    web3formsKey: "YOUR_WEB3FORMS_ACCESS_KEY",
    email: "coffeaaroundtheworld@gmail.com",

    // Newsletter sign-ups go to their own inbox. For automatic delivery, create a second
    // Web3Forms key with THIS address and put it in newsletterKey (a key always delivers to
    // the address it was created with). Until then, sign-ups open a pre-filled email to it.
    newsletterEmail: "coffeaaroundtheworld@gmail.com",
    newsletterKey: "fce84666-bda6-4b10-8694-68fbe6156da5",
    phone: "0327193248",

    // Price of one 250g bag of 100% Arabica / 100% Robusta (VND).
    // Blends are priced in between by ratio, rounded to the nearest 1.000₫.
    price250: { arabica: 165000, robusta: 120000 },
    sizes: [["250g", 1], ["500g", 2], ["1kg", 4]],   // bag size → price multiplier vs 250g
    maxQty: 20,

    // Delivery: free from this subtotal, otherwise a flat fee.
    shipping: { freeOver: 500000, fee: 30000 },

    // Bank transfer QR (VietQR). bankId = bank short name or BIN, e.g. "vietcombank", "mbbank",
    // "techcombank", "970436". Leave accountNo empty to hide the QR.
    bank: { bankId: "", accountNo: "", accountName: "" },

    // MoMo / ZaloPay "receive money" QR images saved from each app, e.g. "img/pay-momo.png"
    // (path from the site root). Leave empty to show the phone number instead.
    momoQr: "",
    zaloQr: "",
  };

  const BASE = new URL(".", document.currentScript.src);   // site root (shop.js lives there)
  const vi = document.documentElement.lang === "vi";
  const HOME = vi ? BASE : new URL("en/", BASE);                // this language's homepage

  // The four coffees. Cart items store the id, so a cart works on every page.
  const CATALOG = {
    xuan: { vi: ["Xuân", "Rang sáng vừa"], en: ["Xuân (Spring)", "Light-medium roast"] },
    ha:   { vi: ["Hạ", "Rang vừa"],        en: ["Hạ (Summer)", "Medium roast"] },
    thu:  { vi: ["Thu", "Rang vừa đậm"],   en: ["Thu (Autumn)", "Medium-dark roast"] },
    dong: { vi: ["Đông", "Rang đậm"],      en: ["Đông (Winter)", "Dark roast"] },
  };
  const IDS = Object.keys(CATALOG);
  const T = vi ? {
    beans: "Hạt cà phê", ratio: "Tỉ lệ phối trộn", grind: "Độ xay",
    whole: "Nguyên hạt", ground: "Xay sẵn", size: "Khối lượng", qty: "Số lượng",
    less: "Bớt một túi", more: "Thêm một túi", bags: "túi",
    add: "Thêm vào giỏ", added: "Đã thêm vào giỏ ✓",
    cart: "Giỏ hàng", cartItems: (n) => `Giỏ hàng, ${n} túi`, close: "Đóng",
    empty: "Giỏ hàng đang trống.", browse: "Xem cà phê", remove: "Xóa",
    subtotal: "Tạm tính", shipping: "Phí giao hàng", free: "Miễn phí", total: "Tổng cộng",
    toFree: (x) => `Mua thêm ${x} để được miễn phí giao hàng.`,
    freeShip: (x) => `Miễn phí giao hàng cho đơn từ ${x}.`,
    checkout: "Thanh toán", back: "← Quay lại giỏ hàng",
    yourInfo: "Thông tin giao hàng", name: "Họ tên", phone: "Số điện thoại",
    emailOpt: "Email (không bắt buộc)", address: "Địa chỉ giao hàng", note: "Ghi chú (không bắt buộc)",
    notePh: "Ví dụ: xay cho phin, giao giờ hành chính…",
    pay: "Phương thức thanh toán",
    methods: { bank: "Chuyển khoản ngân hàng (QR)", momo: "Ví MoMo", zalopay: "ZaloPay", cod: "Thanh toán khi nhận hàng (COD)" },
    placeOrder: (x) => `Đặt hàng · ${x}`, sending: "Đang gửi đơn…",
    thanks: "Cảm ơn bạn! Đơn hàng đã được gửi.",
    thanksMail: "Gần xong! Hãy bấm Gửi trong email vừa mở để gửi đơn cho chúng tôi.",
    mailHelp: (p) => `Nếu email không mở được, hãy gọi ${p} và đọc mã đơn.`,
    orderCode: "Mã đơn hàng", amount: "Số tiền", memo: "Nội dung chuyển khoản",
    bankName: "Ngân hàng", accNo: "Số tài khoản", accName: "Chủ tài khoản",
    bankLater: "Chúng tôi sẽ gửi thông tin chuyển khoản khi gọi xác nhận đơn.",
    scan: (m) => `Quét mã bằng ứng dụng ${m} để thanh toán.`,
    walletPhone: (m, x, p, c) => `Chuyển ${x} qua ${m} đến số ${p}, nội dung: ${c}.`,
    codText: (x) => `Bạn thanh toán ${x} khi nhận hàng.`,
    confirm: "Chúng tôi sẽ gọi cho bạn để xác nhận đơn hàng.",
    done: "Xong", subject: "Đơn hàng mới", from: "Website Calm Coffee Supply",
    hello: "Xin chào Calm Coffee Supply, tôi muốn đặt hàng:",
    errPhone: "Vui lòng nhập số điện thoại hợp lệ.", required: (f) => `Vui lòng điền: ${f}.`,
    nlSubject: "Đăng ký nhận tin", nlSending: "Đang gửi…",
    nlOkTitle: "Đăng ký thành công!", nlOk: (e) => `Cảm ơn bạn! Chúng tôi sẽ gửi tin về mẻ rang mới đến ${e}.`,
    nlFail: (m) => `Chưa gửi được, có thể do mạng chập chờn. Vui lòng thử lại, hoặc gửi email cho chúng tôi tại ${m}.`,
    nlRetry: "Thử lại",
  } : {
    beans: "Beans", ratio: "Blend ratio", grind: "Grind",
    whole: "Whole bean", ground: "Ground", size: "Bag size", qty: "Quantity",
    less: "One bag fewer", more: "One bag more", bags: "bag(s)",
    add: "Add to cart", added: "Added to cart ✓",
    cart: "Cart", cartItems: (n) => `Cart, ${n} bag(s)`, close: "Close",
    empty: "Your cart is empty.", browse: "Browse coffee", remove: "Remove",
    subtotal: "Subtotal", shipping: "Delivery", free: "Free", total: "Total",
    toFree: (x) => `Add ${x} more for free delivery.`,
    freeShip: (x) => `Free delivery on orders from ${x}.`,
    checkout: "Checkout", back: "← Back to cart",
    yourInfo: "Delivery details", name: "Full name", phone: "Phone number",
    emailOpt: "Email (optional)", address: "Delivery address", note: "Notes (optional)",
    notePh: "e.g. grind for phin, deliver during office hours…",
    pay: "Payment method",
    methods: { bank: "Bank transfer (QR)", momo: "MoMo wallet", zalopay: "ZaloPay", cod: "Cash on delivery (COD)" },
    placeOrder: (x) => `Place order · ${x}`, sending: "Sending your order…",
    thanks: "Thank you! Your order has been sent.",
    thanksMail: "Almost done! Press Send in the email that just opened to send us your order.",
    mailHelp: (p) => `If no email opened, call ${p} and read out your order code.`,
    orderCode: "Order code", amount: "Amount", memo: "Transfer note",
    bankName: "Bank", accNo: "Account number", accName: "Account name",
    bankLater: "We'll send you the bank transfer details when we call to confirm.",
    scan: (m) => `Scan the code in your ${m} app to pay.`,
    walletPhone: (m, x, p, c) => `Send ${x} via ${m} to ${p}, with the note: ${c}.`,
    codText: (x) => `You pay ${x} in cash when the coffee arrives.`,
    confirm: "We'll call you to confirm your order.",
    done: "Done", subject: "New order", from: "Calm Coffee Supply website",
    hello: "Hello Calm Coffee Supply, I'd like to order:",
    errPhone: "Please enter a valid phone number.", required: (f) => `Please fill in: ${f}.`,
    nlSubject: "Newsletter sign-up", nlSending: "Sending…",
    nlOkTitle: "You're signed up!", nlOk: (e) => `Thank you! We'll send news about fresh roasts to ${e}.`,
    nlFail: (m) => `We couldn't send that, maybe a connection hiccup. Please try again, or email us at ${m}.`,
    nlRetry: "Try again",
  };

  const hasKey = !CONFIG.web3formsKey.startsWith("YOUR_");
  const fmt = (n) => n.toLocaleString(vi ? "vi-VN" : "en-US") + "₫";
  const phoneFmt = CONFIG.phone.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const price250 = (a) => {
    const { arabica, robusta } = CONFIG.price250;
    return Math.round((robusta + (arabica - robusta) * a / 100) / 1000) * 1000;
  };
  const mult = (size) => (CONFIG.sizes.find(([s]) => s === size) || CONFIG.sizes[0])[1];
  const unitPrice = (it) => price250(it.a) * mult(it.size);
  const beanLabel = (a) => a === 100 ? "100% Arabica" : a === 0 ? "100% Robusta" : `${a}% Arabica · ${100 - a}% Robusta`;
  const clampQty = (v) => Math.min(CONFIG.maxQty, Math.max(1, parseInt(v, 10) || 1));

  async function send(fields, key = CONFIG.web3formsKey) {
    // FormData (not JSON) keeps this a "simple" request, so the browser sends it without a CORS pre-check.
    const body = new FormData();
    Object.entries({ access_key: key, from_name: T.from, ...fields }).forEach(([k, v]) => { if (v != null) body.append(k, v); });
    const res = await fetch("https://api.web3forms.com/submit", { method: "POST", headers: { Accept: "application/json" }, body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.message || res.status);
  }
  const openMail = (subject, body, to = CONFIG.email) => {
    location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  /* ---------- Cart state (remembered in this browser) ---------- */
  const cards = [...document.querySelectorAll(".product[data-id]")];
  const KEY = "ccs-cart";
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch { cart = []; }
  cart.forEach((it) => { if (!it.id && Number.isInteger(it.idx)) it.id = IDS[it.idx]; });   // carts saved before ids existed
  cart = cart.filter((it) => CATALOG[it.id] && Number.isFinite(it.a) && it.qty > 0);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* private mode */ } };
  const coffeeName = (it) => CATALOG[it.id][vi ? "vi" : "en"][0];
  const roastName = (it) => CATALOG[it.id][vi ? "vi" : "en"][1];
  const details = (it) => `${beanLabel(it.a)} · ${it.grind === "whole" ? T.whole : T.ground} · ${it.size}`;
  const count = () => cart.reduce((n, it) => n + it.qty, 0);
  const subtotal = () => cart.reduce((n, it) => n + unitPrice(it) * it.qty, 0);
  const shipFee = (sub) => (sub >= CONFIG.shipping.freeOver ? 0 : CONFIG.shipping.fee);

  /* ---------- Product picker on each card ---------- */
  cards.forEach((card, i) => {
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

    // The no-JS mailto link becomes an "Add to cart" button.
    const oldBtn = buy.querySelector(".order");
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = oldBtn.className;
    addBtn.textContent = T.add;
    oldBtn.replaceWith(addBtn);

    const current = () => ({
      id: card.dataset.id,
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

    addBtn.addEventListener("click", () => {
      const it = current();
      const same = cart.find((c) => c.id === it.id && c.a === it.a && c.grind === it.grind && c.size === it.size);
      if (same) same.qty = Math.min(CONFIG.maxQty, same.qty + it.qty); else cart.push(it);
      save(); refreshBadge();
      addBtn.textContent = T.added;
      setTimeout(() => { addBtn.textContent = T.add; }, 1600);
      openCart("cart");
    });
  });

  /* ---------- Header cart button ---------- */
  const cartBtn = document.createElement("button");
  cartBtn.type = "button";
  cartBtn.className = "cart-btn";
  cartBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 12H6.2L5 8Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" stroke-width="1.4"/></svg><span class="cart-count" aria-hidden="true">0</span>`;
  document.querySelector(".nav-end")?.prepend(cartBtn);
  function refreshBadge() {
    const n = count();
    cartBtn.querySelector(".cart-count").textContent = n;
    cartBtn.classList.toggle("has-items", n > 0);
    cartBtn.setAttribute("aria-label", T.cartItems(n));
  }
  refreshBadge();
  cartBtn.addEventListener("click", () => openCart("cart"));

  /* ---------- Cart drawer (cart → checkout → done) ---------- */
  const dlg = document.createElement("dialog");
  dlg.className = "cart";
  dlg.setAttribute("aria-labelledby", "cart-title");
  dlg.innerHTML = `<div class="cart-head"><h2 id="cart-title">${T.cart}</h2>
    <button type="button" class="cart-close" aria-label="${T.close}">×</button></div>
    <div class="cart-body"></div>`;
  document.body.append(dlg);
  const body = dlg.querySelector(".cart-body");
  dlg.querySelector(".cart-close").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });   // click on backdrop

  let lastOrder = null;
  function openCart(view) {
    render(view);
    if (!dlg.open) dlg.showModal();
  }

  const totalsHtml = () => {
    const sub = subtotal(), fee = shipFee(sub);
    const hint = fee ? T.toFree(fmt(CONFIG.shipping.freeOver - sub)) : T.freeShip(fmt(CONFIG.shipping.freeOver));
    return `<dl class="cart-totals">
        <div><dt>${T.subtotal}</dt><dd>${fmt(sub)}</dd></div>
        <div><dt>${T.shipping}</dt><dd>${fee ? fmt(fee) : T.free}</dd></div>
        <div class="grand"><dt>${T.total}</dt><dd>${fmt(sub + fee)}</dd></div>
      </dl><p class="cart-hint">${hint}</p>`;
  };

  function render(view) {
    dlg.dataset.view = view;
    if (view === "cart") {
      if (!cart.length) {
        body.innerHTML = `<p class="cart-empty">${T.empty}</p><button type="button" class="btn btn-ghost" data-act="browse">${T.browse}</button>`;
      } else {
        body.innerHTML = `<ul class="cart-items">${cart.map((it, k) => `
          <li><div class="ci-main"><p class="ci-name">${esc(coffeeName(it))} <span>${esc(roastName(it))}</span></p>
            <p class="ci-detail">${esc(details(it))}</p>
            <div class="qty"><button type="button" data-act="dec" data-k="${k}" aria-label="${T.less}">−</button>
              <span class="ci-qty" aria-live="polite">${it.qty}</span>
              <button type="button" data-act="inc" data-k="${k}" aria-label="${T.more}">+</button>
              <button type="button" class="ci-remove" data-act="rm" data-k="${k}">${T.remove}</button></div></div>
            <p class="ci-price">${fmt(unitPrice(it) * it.qty)}</p></li>`).join("")}</ul>
          ${totalsHtml()}
          <button type="button" class="btn cart-cta" data-act="checkout">${T.checkout}</button>`;
      }
    } else if (view === "checkout") {
      const radios = Object.entries(T.methods).map(([v, label], k) =>
        `<label class="pay-opt"><input type="radio" name="payment" value="${v}"${k === 0 ? " checked" : ""} required><span>${label}</span></label>`).join("");
      body.innerHTML = `<button type="button" class="cart-back" data-act="back">${T.back}</button>
        <form class="checkout" novalidate>
          <h3>${T.yourInfo}</h3>
          <label>${T.name}<input name="name" autocomplete="name" required></label>
          <label>${T.phone}<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required pattern="[0-9 +().-]{9,16}"></label>
          <label>${T.emailOpt}<input name="email" type="email" autocomplete="email"></label>
          <label>${T.address}<textarea name="address" rows="2" autocomplete="street-address" required></textarea></label>
          <label>${T.note}<textarea name="note" rows="2" placeholder="${T.notePh}"></textarea></label>
          <fieldset><legend>${T.pay}</legend>${radios}</fieldset>
          <input type="checkbox" name="botcheck" class="sr-only" tabindex="-1" autocomplete="off" aria-hidden="true">
          ${totalsHtml()}
          <p class="form-msg" role="alert"></p>
          <button type="submit" class="btn cart-cta">${T.placeOrder(fmt(subtotal() + shipFee(subtotal())))}</button>
        </form>`;
      body.querySelector("form").addEventListener("submit", submitOrder);
      body.querySelector("input[name=name]").focus();
    } else if (view === "done" && lastOrder) {
      body.innerHTML = doneHtml(lastOrder);
    }
  }

  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const k = Number(b.dataset.k);
    switch (b.dataset.act) {
      case "inc": cart[k].qty = Math.min(CONFIG.maxQty, cart[k].qty + 1); break;
      case "dec": cart[k].qty -= 1; if (cart[k].qty < 1) cart.splice(k, 1); break;
      case "rm": cart.splice(k, 1); break;
      case "checkout": render("checkout"); return;
      case "back": render("cart"); return;
      case "close": dlg.close(); return;
      case "browse":
        dlg.close();
        if (document.getElementById("coffee")) document.getElementById("coffee").scrollIntoView();
        else location.href = new URL("#coffee", HOME);
        return;
      default: return;
    }
    save(); refreshBadge(); render("cart");
  });

  function orderText(o) {
    return [
      `${T.orderCode}: ${o.code}`, "",
      ...o.items.map((it, n) => `${n + 1}. ${it.name} (${it.roast}) — ${it.details} — ${it.qty} ${T.bags} — ${fmt(it.line)}`),
      "",
      `${T.subtotal}: ${fmt(o.sub)}`,
      `${T.shipping}: ${o.fee ? fmt(o.fee) : T.free}`,
      `${T.total}: ${fmt(o.total)}`,
      `${T.pay}: ${T.methods[o.payment]}`, "",
      `${T.name}: ${o.name}`, `${T.phone}: ${o.phone}`,
      ...(o.email ? [`Email: ${o.email}`] : []),
      `${T.address}: ${o.address}`,
      ...(o.note ? [`${T.note}: ${o.note}`] : []),
    ].join("\n");
  }

  async function submitOrder(e) {
    e.preventDefault();
    const form = e.target, msg = form.querySelector(".form-msg"), btn = form.querySelector("[type=submit]");
    if (!form.checkValidity()) {
      const bad = form.querySelector(":invalid");
      msg.textContent = bad.name === "phone" && bad.value ? T.errPhone : T.required(bad.closest("label, fieldset")?.firstChild?.textContent.trim() || "");
      bad.focus();
      return;
    }
    if (form.botcheck.checked) return;   // spam bot
    const f = Object.fromEntries(new FormData(form));
    const d = new Date();
    const code = `CCS${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}${Math.floor(1000 + Math.random() * 9000)}`;
    const sub = subtotal(), fee = shipFee(sub);
    const o = {
      code, sub, fee, total: sub + fee, payment: f.payment,
      name: f.name.trim(), phone: f.phone.trim(), email: (f.email || "").trim(),
      address: f.address.trim(), note: (f.note || "").trim(),
      items: cart.map((it) => ({ name: coffeeName(it), roast: roastName(it), details: details(it), qty: it.qty, line: unitPrice(it) * it.qty })),
    };
    btn.disabled = true; btn.textContent = T.sending; msg.textContent = "";

    o.viaMail = !hasKey;
    if (hasKey) {
      try {
        await send({
          subject: `${T.subject} ${code} · ${fmt(o.total)} · ${T.methods[o.payment]}`,
          name: o.name, email: o.email || undefined, phone: o.phone,
          [T.orderCode]: code, Order: orderText(o),
        });
      } catch { o.viaMail = true; }
    }
    if (o.viaMail) openMail(`${T.subject} ${code}`, `${T.hello}\n\n${orderText(o)}`);

    lastOrder = o;
    cart = []; save(); refreshBadge();
    render("done");
  }

  function payHtml(o) {
    const x = fmt(o.total);
    const rows = (pairs) => `<dl class="pay-rows">${pairs.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
    if (o.payment === "cod") return `<p>${T.codText(x)}</p>`;
    if (o.payment === "bank") {
      const b = CONFIG.bank;
      if (!b.accountNo) return `<p>${T.bankLater}</p>`;
      const qr = `https://img.vietqr.io/image/${encodeURIComponent(b.bankId)}-${encodeURIComponent(b.accountNo)}-compact2.png?amount=${o.total}&addInfo=${o.code}&accountName=${encodeURIComponent(b.accountName)}`;
      return `<img class="pay-qr" src="${qr}" width="260" height="260" alt="VietQR ${esc(b.bankId)} ${esc(b.accountNo)}">
        ${rows([[T.bankName, b.bankId], [T.accNo, b.accountNo], [T.accName, b.accountName], [T.amount, x], [T.memo, o.code]])}`;
    }
    const wallet = o.payment === "momo" ? "MoMo" : "ZaloPay";
    const img = o.payment === "momo" ? CONFIG.momoQr : CONFIG.zaloQr;
    if (img) return `<img class="pay-qr" src="${new URL(img, BASE)}" width="260" height="260" alt="${wallet} QR">
        <p>${T.scan(wallet)}</p>${rows([[T.amount, x], [T.memo, o.code]])}`;
    return `<p>${T.walletPhone(wallet, x, phoneFmt, o.code)}</p>`;
  }

  function doneHtml(o) {
    return `<div class="done">
      <p class="done-title">${o.viaMail ? T.thanksMail : T.thanks}</p>
      ${o.viaMail ? `<p class="cart-hint">${T.mailHelp(`<a href="tel:+84${CONFIG.phone.slice(1)}">${phoneFmt}</a>`)}</p>` : ""}
      <p class="done-code">${T.orderCode}: <strong>${o.code}</strong></p>
      <div class="pay-box"><h3>${T.methods[o.payment]}</h3>${payHtml(o)}</div>
      <p>${T.confirm}</p>
      <button type="button" class="btn cart-cta" data-act="close">${T.done}</button></div>`;
  }

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
