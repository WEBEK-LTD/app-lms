// Pharaonic theme pilot: the light/dark switch (?mode=light|dark) and the
// cartouche frame, drawn as an SVG to each .cartouche box's exact size so
// its stroke never stretches. In Flutter this is a CustomPainter (README.md).
(function () {
  const mode = new URLSearchParams(location.search).get("mode") || "dark";
  document.documentElement.dataset.mode = mode;

  const NS = "http://www.w3.org/2000/svg";
  function frame(el) {
    const w = el.offsetWidth, h = el.offsetHeight;
    const rtl = getComputedStyle(el).direction === "rtl";
    const gold = getComputedStyle(document.documentElement).getPropertyValue("--gold").trim();
    const bar = 5;              // the tie bar sits at the inline end of the oval
    const x0 = rtl ? bar + 3 : 1, x1 = rtl ? w - 1 : w - bar - 3;
    const r = (h - 2) / 2;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "frame");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const oval = (inset, sw, op) => {
      const p = document.createElementNS(NS, "rect");
      p.setAttribute("x", x0 + inset); p.setAttribute("y", 1 + inset);
      p.setAttribute("width", x1 - x0 - inset * 2); p.setAttribute("height", h - 2 - inset * 2);
      p.setAttribute("rx", r - inset);
      p.setAttribute("fill", "none"); p.setAttribute("stroke", gold);
      p.setAttribute("stroke-width", sw); p.setAttribute("stroke-opacity", op);
      return p;
    };
    if (el.dataset.fill) {
      const v = el.dataset.fill.match(/^var\((--[\w-]+)\)$/);
      const fill = v ? getComputedStyle(document.documentElement).getPropertyValue(v[1]).trim() : el.dataset.fill;
      const f = oval(0, 0, 0); f.setAttribute("fill", fill); f.removeAttribute("stroke"); svg.appendChild(f);
    }
    svg.appendChild(oval(0.75, 1.5, 1));
    svg.appendChild(oval(4, 0.8, 0.55));
    // The tie bar and the two rope ends that reach it.
    const bx = rtl ? 2.5 : w - 2.5;
    const line = (x1_, y1_, x2_, y2_, sw) => {
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", x1_); l.setAttribute("y1", y1_); l.setAttribute("x2", x2_); l.setAttribute("y2", y2_);
      l.setAttribute("stroke", gold); l.setAttribute("stroke-width", sw); l.setAttribute("stroke-linecap", "round");
      return l;
    };
    svg.appendChild(line(bx, h * 0.18, bx, h * 0.82, 2.2));
    const ex = rtl ? x0 + 2 : x1 - 2;
    svg.appendChild(line(bx, h * 0.38, ex, h * 0.38, 1));
    svg.appendChild(line(bx, h * 0.62, ex, h * 0.62, 1));
    el.prepend(svg);
  }

  function draw() { document.querySelectorAll(".cartouche").forEach(frame); document.body.dataset.ready = "1"; }
  document.fonts.ready.then(() => requestAnimationFrame(draw));
})();
