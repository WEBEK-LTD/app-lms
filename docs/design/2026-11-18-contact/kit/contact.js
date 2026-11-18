/* Phase 184 contact screens: helpers over kit.js (the hand-drawn map, Karim and Mona). */
(function () {
  /** The same hand-drawn streets as the marketplace's 05b, sized to fit; no map tiles. */
  const map = (w = 390, h = 340, opts = {}) => {
    const dark = THEME === "dark";
    const road = dark ? "#1E2E26" : "#FFFFFF", block = dark ? "#13221B" : "#DCD6C6", water = dark ? "#0F2A33" : "#BFD9E2", green = dark ? "#12291F" : "#CFE3C8";
    const route = opts.route || (dark ? "#8FDDB9" : "#1B644C");
    const bgc = dark ? "#0E1A15" : "#E8E4D8";
    return `<svg viewBox="0 0 390 340" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" style="direction:ltr;display:block;background:${bgc}">
      <path d="M-20 250 C 80 230, 120 300, 220 290 S 360 250, 420 270 L 420 340 L -20 340 Z" fill="${water}"/>
      <rect x="20" y="40" width="110" height="80" rx="10" fill="${block}"/><rect x="150" y="30" width="90" height="100" rx="10" fill="${green}"/>
      <rect x="260" y="50" width="120" height="70" rx="10" fill="${block}"/><rect x="10" y="140" width="80" height="80" rx="10" fill="${block}"/>
      <rect x="110" y="150" width="130" height="70" rx="10" fill="${block}"/><rect x="260" y="140" width="110" height="90" rx="10" fill="${green}"/>
      <path d="M0 132 H390 M140 0 V250 M250 0 V250 M0 228 C 100 222, 200 236, 390 236" stroke="${road}" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M95 0 V140 M0 30 H390" stroke="${road}" stroke-width="5" fill="none"/>
      ${opts.pin ? `<circle cx="${opts.pin[0]}" cy="${opts.pin[1]}" r="26" fill="${route}" opacity=".18"/><circle cx="${opts.pin[0]}" cy="${opts.pin[1]}" r="12" fill="#F2A93B" stroke="#fff" stroke-width="3"/>` : `
      <path d="M58 92 H140 V132 H250 V200 H320" stroke="${route}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M58 92 H140 V132 H196" stroke="${route}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".35"/>
      <circle cx="58" cy="92" r="9" fill="${dark ? "#12201A" : "#fff"}" stroke="${route}" stroke-width="4"/>
      <circle cx="320" cy="200" r="22" fill="${route}" opacity=".18"/><circle cx="320" cy="200" r="11" fill="#F2A93B" stroke="#fff" stroke-width="3"/>
      <circle cx="196" cy="132" r="24" fill="${route}" opacity=".18"/><circle cx="196" cy="132" r="16" fill="${route}"/>
      <text x="196" y="138" text-anchor="middle" font-family="Material Symbols Rounded" font-size="19" fill="${dark ? "#09130E" : "#fff"}">two_wheeler</text>`}
    </svg>`;
  };
  const V = new URLSearchParams(location.search).get("v") || "";
  /** The owner's own Twilio number, a reserved fictional one (555-01xx). */
  const OWNER_NUMBER = "+1 415 555 0142";
  Object.assign(window, { map, V, OWNER_NUMBER });
})();
