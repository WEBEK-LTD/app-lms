/*
 * Zad marketplace screens: the shared helpers. Open any screen with
 * ?lang=en|ar&theme=light|dark (defaults: en, light).
 */
(function () {
  const q = new URLSearchParams(location.search);
  const lang = q.get("lang") === "ar" ? "ar" : "en";
  const theme = q.get("theme") === "dark" ? "dark" : "light";
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === "ar" ? "rtl" : "ltr";
  root.dataset.theme = theme;

  const AR = lang === "ar";
  /** The English or the Arabic. */
  const t = (en, ar) => (AR ? ar : en);
  /** A price in Egyptian pounds, as the app writes it: "EGP 45.00" / "45.00 ج.م". */
  const money = (n, opts = {}) => {
    const s = Number(n).toFixed(opts.whole ? 0 : 2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return AR ? `${s}\u00a0ج.م` : `EGP\u00a0${s}`;
  };
  /** A weight: "750 g", "1.25 kg"; "750 غ", "1.25 كغ". */
  const grams = (g) => (g >= 1000 ? `${+(g / 1000).toFixed(2)} ${t("kg", "كغ")}` : `${g} ${t("g", "غ")}`);
  /** A number or range kept left to right inside Arabic text. */
  const n = (x) => `<bdi dir="ltr" class="num">${x}</bdi>`;
  const icon = (name, cls = "", style = "") => `<span class="i ${cls}" style="${style}">${name}</span>`;
  /** A CC0 / public-domain photo from the repo (credits in CREDITS.md). */
  const photo = (file) => {
    const base = "../../../../platform/web/public/";
    return file.includes("/") ? base + file : base + "demo-photos/" + file;
  };
  const bg = (file) => `background-image:url('${photo(file)}')`;
  const statusBar = (light = false) =>
    `<div class="status${light ? " light" : ""}"><span>9:41</span><span class="icons">${icon("signal_cellular_alt")}${icon("wifi")}${icon("battery_full", "", "transform:rotate(90deg)")}</span></div>`;
  const homeInd = (light = false) => `<div class="home-ind${light ? " light" : ""}"></div>`;
  const tabbar = (on, cart = 0) => {
    const tabs = [
      ["home", "home", t("Home", "الرئيسية")],
      ["shops", "storefront", t("Shops", "المتاجر")],
      ["cart", "shopping_bag", t("Cart", "السلة")],
      ["orders", "receipt_long", t("Orders", "الطلبات")],
      ["account", "person", t("Account", "حسابي")],
    ];
    return `<nav class="tabbar">${tabs
      .map(([id, ic, label]) => `<div class="tab${id === on ? " on" : ""}"><span class="ic">${icon(ic, id === on ? "f" : "")}</span>${label}${id === "cart" && cart ? `<span class="badge">${cart}</span>` : ""}</div>`)
      .join("")}</nav>`;
  };
  /** The vendor app's bar: Orders, Picking, Stock, Offers, More. */
  const vtabs = (on, badge = 0) => {
    const tabs = [["orders", "receipt_long", t("Orders", "الطلبات")], ["picking", "checklist", t("Picking", "التجهيز")], ["stock", "inventory_2", t("Stock", "المخزون")], ["offers", "sell", t("Offers", "العروض")], ["more", "menu", t("More", "المزيد")]];
    return `<nav class="vtabs">${tabs.map(([id, ic, l]) => `<div class="vtab${id === on ? " on" : ""}">${icon(ic, id === on ? "f" : "")}${l}${id === "orders" && badge ? `<span class="badge">${badge}</span>` : ""}</div>`).join("")}</nav>`;
  };
  /** Writes the screen, then waits for its fonts and photos. */
  const mount = (html) => {
    document.getElementById("app").innerHTML = html;
    const imgs = [...document.querySelectorAll("[style*='background-image']")].map((el) => {
      const m = /url\('([^']+)'\)/.exec(el.getAttribute("style"));
      return m ? new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = m[1]; }) : null;
    });
    Promise.all([document.fonts.ready, ...imgs]).then(() => document.fonts.load('24px "Material Symbols Rounded"', "home")).then(() => { document.body.dataset.ready = "1"; });
  };
  Object.assign(window, { LANG: lang, THEME: theme, AR, t, n, money, grams, icon, photo, bg, statusBar, homeInd, tabbar, vtabs, mount });
})();
