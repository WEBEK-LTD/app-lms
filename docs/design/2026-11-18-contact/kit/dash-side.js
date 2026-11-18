/* Phase 184: the dashboard's sidebar for screens 08 and 09, as in the marketplace's 11 and 12. */
(function () {
  const logo = (f) => `../../../../platform/web/public/brand/${f}`;
  const navItem = (ic, label, on, count) => `<div class="nav${on ? " on" : ""}">${icon(ic, on ? "f" : "")}<span>${label}</span>${count ? `<span class="count">${count}</span>` : ""}</div>`;
  /** `on`: "orders" or "calls". */
  const side = (on) => `
  <aside class="side">
    <img class="logo l" src="${logo("yallapp-logo-primary-transparent.svg")}" alt="Yallapp">
    <img class="logo d" src="${logo("yallapp-logo-reversed-transparent.svg")}" alt="Yallapp">
    <div class="appcard"><span class="ic">${t("Z", "ز")}</span><div class="grow"><div style="font-weight:700">${t("Zad", "زاد")}</div><div class="small muted"><span class="dot"></span> ${t("Marketplace · Active", "السوق الإلكتروني · نشط")}</div></div>${icon("unfold_more", "", "color:var(--faint)")}</div>
    <div style="height:12px"></div>
    ${navItem("dashboard", t("Overview", "نظرة عامة"))}
    <div class="navh">${t("Your marketplace", "سوقك الإلكتروني")}</div>
    ${navItem("receipt_long", t("Marketplace orders", "طلبات السوق"), on === "orders")}
    ${navItem("support_agent", t("Complaints", "الشكاوى"), false, 6)}
    ${navItem("storefront", t("Vendors", "التجار"))}
    ${navItem("two_wheeler", t("Courier jobs", "مهام المناديب"))}
    ${navItem("tune", t("Marketplace settings", "إعدادات السوق"))}
    <div class="navh">${t("Settings", "الإعدادات")}</div>
    ${navItem("call", t("Calls", "المكالمات"), on === "calls")}
    ${navItem("payments", t("Payments", "الدفع"))}
    ${navItem("notifications", t("App notifications", "إشعارات التطبيق"))}
    <div class="navh">${t("Publish", "النشر")}</div>
    ${navItem("build", t("Builds & downloads", "الإصدارات والتنزيلات"))}
    <div class="me"><span class="av">${on === "orders" ? t("N", "ن") : t("H", "ه")}</span><div class="grow"><div style="font-weight:600">${on === "orders" ? t("Nour, support", "نور، الدعم") : t("Hany, owner", "هاني، المالك")}</div><div class="small muted">${t("Zad team", "فريق زاد")}</div></div>${icon("logout", "flip", "color:var(--faint)")}</div>
  </aside>`;
  Object.assign(window, { side });
})();
