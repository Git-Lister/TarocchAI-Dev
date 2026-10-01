(function () {
  'use strict';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function makeUse(symId, x, y, color, scale) {
    const u = document.createElementNS(SVG_NS, 'use');
    u.setAttribute('href', '#' + symId);
    u.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + symId);
    u.setAttribute('x', x);
    u.setAttribute('y', y);
    u.setAttribute('color', color);
    if (scale !== undefined && scale !== 1) {
      u.setAttribute('transform',
        `translate(${x},${y}) scale(${scale}) translate(${-x},${-y})`);
    }
    return u;
  }

  function build() {
    const container = document.getElementById('slab-pattern');
    if (!container) return;

    const W = 900, H = 500;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

    const defs = document.createElementNS(SVG_NS, 'defs');
    const sunG = document.createElementNS(SVG_NS, 'g');
    sunG.setAttribute('id', 'sun-inline');
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('r', '0.9');
    dot.setAttribute('fill', 'currentColor');
    sunG.appendChild(dot);

    const rays = document.createElementNS(SVG_NS, 'g');
    rays.setAttribute('stroke', 'currentColor');
    rays.setAttribute('stroke-width', '0.45');
    rays.setAttribute('stroke-linecap', 'round');
    rays.setAttribute('fill', 'none');
    [
      [0, -1.6, 0, -2.6], [0, 1.6, 0, 2.6],
      [-1.6, 0, -2.6, 0], [1.6, 0, 2.6, 0],
      [-1.2, -1.2, -1.85, -1.85], [1.2, 1.2, 1.85, 1.85],
      [-1.2, 1.2, -1.85, 1.85], [1.2, -1.2, 1.85, -1.85]
    ].forEach(([x1, y1, x2, y2]) => {
      const l = document.createElementNS(SVG_NS, 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1);
      l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      rays.appendChild(l);
    });
    sunG.appendChild(rays);
    defs.appendChild(sunG);
    svg.appendChild(defs);

    const GOLDEN = Math.PI * (3 - Math.sqrt(5));
    const cx = W / 2, cy = H / 2;
    const count = 1800;
    const maxR = 480;

    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(i / count) * maxR;
      const theta = i * GOLDEN;
      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);
      const dist = r / maxR;
      const op = Math.max(0.15, 1 - dist);
      const size = 0.75 + (1 - dist) * 0.4;
      const col = `rgba(200,168,90,${op * 0.85})`;
      svg.appendChild(makeUse('sun-inline', x, y, col, size));
    }

    const core = document.createElementNS(SVG_NS, 'radialGradient');
    core.setAttribute('id', 'slab-core');
    const s1 = document.createElementNS(SVG_NS, 'stop');
    s1.setAttribute('offset', '0%');
    s1.setAttribute('stop-color', 'rgba(0,0,0,0.5)');
    const s2 = document.createElementNS(SVG_NS, 'stop');
    s2.setAttribute('offset', '35%');
    s2.setAttribute('stop-color', 'rgba(0,0,0,0)');
    core.appendChild(s1); core.appendChild(s2);
    const defs2 = document.createElementNS(SVG_NS, 'defs');
    defs2.appendChild(core);
    svg.insertBefore(defs2, svg.firstChild);

    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', cx);
    c.setAttribute('cy', cy);
    c.setAttribute('r', 90);
    c.setAttribute('fill', 'url(#slab-core)');
    svg.appendChild(c);

    container.appendChild(svg);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();