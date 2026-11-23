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
    let gold;
    const bar = 5;              // the tie bar sits at the inline end of the oval
    const x0 = rtl ? bar + 3 : 1, x1 = rtl ? w - 1 : w - bar - 3;
    const r = (h - 2) / 2;
    const svg = document.createElementNS(NS, "svg");
    const gid = "metal" + Math.random().toString(36).slice(2, 8);
    const light = document.documentElement.dataset.mode === "light";
    svg.innerHTML = `<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${h}">${(light
      ? [["0", "#E2C27A"], [".45", "#8C6420"], [".7", "#B98A3A"], ["1", "#DDBB6E"]]
      : [["0", "#F7E7B4"], [".4", "#C2953F"], [".55", "#8E6623"], [".8", "#E0BF72"], ["1", "#F3DE9E"]])
      .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient></defs>`;
    svg.setAttribute("class", "frame");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    gold = `url(#${gid})`;
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
    svg.appendChild(oval(0.6, 1.2, 1));
    svg.appendChild(oval(3.8, 0.6, 0.7));
    // The tie bar and the two rope ends that reach it.
    const bx = rtl ? 2.5 : w - 2.5;
    const line = (x1_, y1_, x2_, y2_, sw) => {
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", x1_); l.setAttribute("y1", y1_); l.setAttribute("x2", x2_); l.setAttribute("y2", y2_);
      l.setAttribute("stroke", gold); l.setAttribute("stroke-width", sw); l.setAttribute("stroke-linecap", "round");
      return l;
    };
    svg.appendChild(line(bx, h * 0.2, bx, h * 0.8, 1.8));
    const ex = rtl ? x0 + 2 : x1 - 2;
    svg.appendChild(line(bx, h * 0.4, ex, h * 0.4, 0.6));
    svg.appendChild(line(bx, h * 0.6, ex, h * 0.6, 0.6));
    el.prepend(svg);
  }

  // Round 2: the backdrop (starry ceiling in dark, papyrus in light).
  function backdrop() {
    document.querySelectorAll(".screen").forEach((sc) => {
      const b = document.createElement("div");
      b.className = "backdrop";
      b.innerHTML = '<i class="sky"></i><i class="grain"></i><i class="stars"></i><i class="relief"></i><i class="relief r"></i><i class="vignette"></i>';
      sc.prepend(b);
    });
  }
  backdrop();

  function draw() { document.querySelectorAll(".cartouche").forEach(frame); document.body.dataset.ready = "1"; }
  document.fonts.ready.then(() => requestAnimationFrame(draw));
})();
