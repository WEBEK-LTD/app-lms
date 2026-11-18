/* Studio's shell around screens 11 and 12, as app/studio/chrome.tsx draws it, with its words in en and ar. */
(function () {
  const brand = "../../../../platform/web/public/brand/yallapp-icon-dark-rounded.svg";
  const rail = [
    ["dashboard", t("Overview", "نظرة عامة")], ["edit_note", t("Editor", "المحرر")], ["auto_stories", t("Stories", "الستوري")], ["play_arrow", t("Preview", "المعاينة")],
    null, ["storefront", t("Your marketplace", "سوقك الإلكتروني"), true], ["smartphone", t("The app", "التطبيق")], ["groups", t("Customers", "العملاء")], ["public", t("Publishing", "النشر")], ["account_circle", t("Account", "الحساب")],
  ];
  const menu = [
    ["map", t("Live map", "الخريطة المباشرة")], ["shopping_bag", t("Marketplace orders", "طلبات السوق")], ["support_agent", t("Complaints", "الشكاوى"), true, 6],
    ["storefront", t("Vendors", "التجار")], ["note_add", t("Joining", "الانضمام")], ["sell", t("Offers & club", "العروض والنادي")], ["receipt_long", t("Statements", "كشوف الحساب")],
    ["deployed_code", t("Courier jobs", "مهام المندوبين")], ["two_wheeler", t("Couriers", "المناديب")], ["payments", t("Paid orders", "الطلبات المدفوعة")], ["local_shipping", t("Delivery settings", "إعدادات التوصيل")], ["tune", t("Marketplace settings", "إعدادات السوق")],
  ];
  window.studioShell = (crumb, inner) => `
  <div class="shell">
    <nav class="rail"><img class="yl" src="${brand}" alt="Yallapp">${rail.map((r) => (r ? `<div class="ri${r[2] ? " on" : ""}"><span class="ic">${icon(r[0])}</span>${r[1]}</div>` : `<span class="rsep"></span>`)).join("")}</nav>
    <aside class="side">
      <div class="appsw"><span class="ic">${icon("storefront", "f")}</span><span class="grow">${t("Zad", "Zad")}</span>${icon("unfold_more", "", "color:#9A96A6")}</div>
      <div class="sp">${icon("search", "", "font-size:18px")}${t("Search pages", "دوّر على صفحة")}<kbd>Ctrl K</kbd></div>
      <div class="navh">${t("Your marketplace", "سوقك الإلكتروني")}</div>
      ${menu.map(([ic, l, on, c]) => `<div class="nav${on ? " on" : ""}">${icon(ic)}<span>${l}</span>${c ? `<span class="count">${c}</span>` : ""}</div>`).join("")}
      <div class="me"><span class="av">${t("N", "ن")}</span><div class="grow"><div style="font-weight:700;font-size:13.5px">${t("Nour", "نور")}</div><div style="font-size:11.5px;color:#9A96A6">${t("Zad support", "دعم زاد")}</div></div></div>
    </aside>
    <div class="panel-wrap"><div class="cpanel">
      <div class="topbar"><span class="cr grow">${t("Zad", "Zad")} ${icon("chevron_right", "flip", "font-size:16px")} ${t("Your marketplace", "سوقك الإلكتروني")} ${icon("chevron_right", "flip", "font-size:16px")} <b>${crumb}</b></span><span class="btn">${icon("play_arrow", "", "font-size:18px")}${t("Preview on the phone", "معاينة على التليفون")}</span><span class="btn dark">${icon("edit_note", "", "font-size:18px;color:var(--ember)")}${t("Open the editor", "افتح المحرر")}</span><span class="av">${t("N", "ن")}</span></div>
      <main class="main">${inner}</main>
    </div></div>
  </div>`;
})();
