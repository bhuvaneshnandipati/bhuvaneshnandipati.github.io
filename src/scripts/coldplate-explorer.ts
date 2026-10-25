/**
 * Interactive cold-plate explorer. Ported from the owner's "Leaf-Vein Cold Plate" explainer:
 * animated coolant on both plates (dots move at the true relative channel speeds, slowed
 * about 25×), and live readouts of the 1-D screening model as the operating point changes.
 */
import { GEOM } from '../data/coldplate-geom';
import { screening, parallelSpeed, segmentGenerations, type Screening } from '../lib/coldplate-model';

const COPPER = '#b5652e', COPPER_INK = '#8a4718', WATER = '#1f6fb2';
const SLOW = 40; // mm of plate per (m/s) per second ≈ 25× slower than real

type Seg = { ax: number; ay: number; bx: number; by: number; w: number; gen: number; len: number };
type Canvas = { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D; s: number; o: number };

const fmt = (x: number, d = 0) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

class ColdplateExplorer extends HTMLElement {
  private state = { Q: 700, V: 1.0, T: 40 };
  private M: Screening = screening(700, 1.0, 40);
  private raf = 0;
  private running = false;
  private io?: IntersectionObserver;

  connectedCallback() {
    const $ = <T extends HTMLElement = HTMLElement>(id: string) => this.querySelector<T>(`#${id}`)!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const g = GEOM.geo, ringMid = g.r_rim + g.ring_w / 2;

    // Tree topology → one path per terminal channel, for particle routing.
    const gens = segmentGenerations();
    const segs: Seg[] = GEOM.tree.map(([ax, ay, bx, by, w], i) => ({ ax, ay, bx, by, w, gen: gens[i], len: Math.hypot(bx - ax, by - ay) }));
    const key = (x: number, y: number) => `${x.toFixed(3)},${y.toFixed(3)}`;
    const byEnd = new Map(segs.map((s) => [key(s.bx, s.by), s]));
    const paths = segs.filter((s) => s.gen === GEOM.rows.length - 1).map((leaf) => {
      const p = [leaf];
      let cur: Seg | undefined = leaf;
      while (cur && cur.gen > 0) { cur = byEnd.get(key(cur.ax, cur.ay)); if (cur) p.unshift(cur); }
      return p;
    });

    const mk = (id: string): Canvas => { const cv = $<HTMLCanvasElement>(id); return { cv, ctx: cv.getContext('2d')!, s: 1, o: 0 }; };
    const T = mk('cvTree'), B = mk('cvBase');
    const fit = (o: Canvas) => {
      const r = o.cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      const n = Math.max(200, Math.round(r.width * dpr));
      if (o.cv.width !== n) { o.cv.width = n; o.cv.height = n; }
      o.s = n / 63; o.o = n / 2;
    };
    const X = (o: Canvas, x: number) => o.o + x * o.s, Y = (o: Canvas, y: number) => o.o - y * o.s;
    const plate = (o: Canvas) => {
      const { ctx } = o, n = o.cv.width;
      ctx.clearRect(0, 0, n, n);
      ctx.fillStyle = COPPER; ctx.fillRect(X(o, -30), Y(o, 30), 60 * o.s, 60 * o.s);
      ctx.strokeStyle = COPPER_INK; ctx.lineWidth = Math.max(1, o.s * 0.15); ctx.strokeRect(X(o, -30), Y(o, 30), 60 * o.s, 60 * o.s);
    };
    const die = (o: Canvas) => {
      const { ctx } = o; ctx.save(); ctx.setLineDash([o.s * 1.2, o.s * 0.9]); ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = Math.max(1, o.s * 0.18); ctx.strokeRect(X(o, -20), Y(o, 20), 40 * o.s, 40 * o.s); ctx.restore();
    };
    const port = (o: Canvas, x: number, y: number, r: number, inlet: boolean) => {
      const { ctx } = o; ctx.beginPath(); ctx.arc(X(o, x), Y(o, y), r * o.s, 0, 7);
      ctx.fillStyle = inlet ? '#ffffff' : '#d5dde2'; ctx.fill(); ctx.lineWidth = Math.max(1, o.s * 0.2); ctx.strokeStyle = WATER; ctx.stroke();
    };
    const drawTree = (o: Canvas) => {
      plate(o); const { ctx } = o;
      ctx.strokeStyle = WATER; ctx.lineCap = 'round';
      for (const s of segs) { ctx.lineWidth = s.w * o.s; ctx.beginPath(); ctx.moveTo(X(o, s.ax), Y(o, s.ay)); ctx.lineTo(X(o, s.bx), Y(o, s.by)); ctx.stroke(); }
      ctx.fillStyle = WATER; ctx.beginPath(); ctx.arc(o.o, o.o, g.r_hub * o.s, 0, 7); ctx.fill();
      ctx.lineWidth = g.ring_w * o.s; ctx.beginPath(); ctx.arc(o.o, o.o, ringMid * o.s, 0, 7); ctx.stroke();
      die(o); port(o, 0, 0, g.d_in / 2, true);
      for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k * Math.PI) / 2; port(o, ringMid * Math.cos(a), ringMid * Math.sin(a), g.d_out / 2, false); }
    };
    const drawBase = (o: Canvas) => {
      plate(o); const { ctx } = o, b = GEOM.base, span = b.span; ctx.fillStyle = WATER;
      for (let k = 0; k < b.n; k++) { const yc = -span / 2 + b.pitch_mm * (k + 0.5); ctx.fillRect(X(o, -span / 2), Y(o, yc + b.w_mm / 2), span * o.s, b.w_mm * o.s); }
      for (const sg of [-1, 1]) ctx.fillRect(X(o, sg * g.x_man - g.man_w / 2), Y(o, span / 2), g.man_w * o.s, span * o.s);
      die(o); port(o, -g.x_man, 0, g.d_out / 2, true); port(o, g.x_man, 0, g.d_out / 2, false);
    };

    const tp: { p: number; seg: number; u: number }[] = [];
    const bp: { ch: number; x: number }[] = [];
    paths.forEach((p, pi) => { for (let k = 0; k < 2; k++) tp.push({ p: pi, seg: Math.floor(Math.random() * p.length), u: Math.random() }); });
    for (let k = 0; k < GEOM.base.n; k++) for (let j = 0; j < 4; j++) bp.push({ ch: k, x: -GEOM.base.span / 2 + Math.random() * GEOM.base.span });

    const step = (dt: number) => {
      const gv = this.M.tree.gens.map((x) => x.v), vb = parallelSpeed(this.state.V);
      for (const q of tp) {
        const path = paths[q.p]; let s = path[q.seg];
        q.u += (gv[s.gen] * SLOW * dt) / s.len;
        while (q.u >= 1) { q.u -= 1; q.seg++; if (q.seg >= path.length) { q.seg = 0; q.u = Math.random() * 0.2; break; } s = path[q.seg]; }
      }
      for (const q of bp) { q.x += vb * SLOW * dt; if (q.x > GEOM.base.span / 2) q.x -= GEOM.base.span; }
    };
    const dots = () => {
      const r = Math.max(1.2, T.s * 0.22);
      T.ctx.fillStyle = 'rgba(255,255,255,.92)';
      for (const q of tp) { const s = paths[q.p][q.seg]; const x = s.ax + (s.bx - s.ax) * q.u, y = s.ay + (s.by - s.ay) * q.u; T.ctx.beginPath(); T.ctx.arc(X(T, x), Y(T, y), r, 0, 7); T.ctx.fill(); }
      const b = GEOM.base; B.ctx.fillStyle = 'rgba(255,255,255,.92)';
      for (const q of bp) { const yc = -b.span / 2 + b.pitch_mm * (q.ch + 0.5); B.ctx.beginPath(); B.ctx.arc(X(B, q.x), Y(B, yc), Math.max(1.2, B.s * 0.2), 0, 7); B.ctx.fill(); }
    };
    let last = 0;
    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
      if (!reduce) step(dt);
      drawTree(T); drawBase(B); dots();
      if (this.running && !reduce) this.raf = requestAnimationFrame(frame);
    };
    const start = () => { if (this.running) return; this.running = true; last = 0; this.raf = requestAnimationFrame(frame); };
    const stop = () => { this.running = false; cancelAnimationFrame(this.raf); };

    // ---- readouts
    const update = () => {
      const { Q, V, T: Tin } = this.state;
      this.M = screening(Q, V, Tin);
      const t = this.M.tree, b = this.M.base, mx = Math.max(t.dp, b.dp);
      $('qo').textContent = `${fmt(Q)} W`; $('vo').textContent = `${fmt(V, 2)} L/min`; $('to').textContent = `${fmt(Tin)} °C`;
      $('dpTreeBig').innerHTML = `${fmt(t.dp)}<small>Pa, 1-D</small>`; $('dpBaseBig').innerHTML = `${fmt(b.dp)}<small>Pa, 1-D</small>`;
      $('bT').style.width = `${(100 * t.dp) / mx}%`; $('bB').style.width = `${(100 * b.dp) / mx}%`;
      $('vT').textContent = `${fmt(t.dp, 1)} Pa`; $('vB').textContent = `${fmt(b.dp, 1)} Pa`;
      $('ratio').innerHTML = `${fmt(b.dp / t.dp, 2)}<small>×</small>`;
      $('wT').innerHTML = `${fmt(t.s.W * 1000, 2)}<small>mW</small>`; $('wB').innerHTML = `${fmt(b.s.W * 1000, 2)}<small>mW</small>`;
      const dpMax = Math.max(...t.gens.map((x) => x.dp));
      $('genTbl').querySelector('tbody')!.innerHTML = t.gens.map((x, i) =>
        `<tr><td>${x.gen}</td><td>${x.n}</td><td>${fmt(GEOM.rows[i].w_mm, 2)} mm</td><td>${fmt(x.v, 2)} m/s</td><td>${fmt(x.Re)}</td><td class="l"><span class="genbar" style="width:${Math.round((36 * x.dp) / dpMax)}px"></span>${fmt(x.dp, 1)} Pa</td></tr>`).join('');
      const th = t.th;
      const steps: [string, number, number][] = [['Inlet water', Tin, Tin], ['+ half the coolant rise', Tin, th.Tbm], ['+ wall-to-water ΔT', th.Tbm, th.Tw], ['+ conduction in the base', th.Tw, th.Tcase]];
      const lo = Math.min(Tin, 20), hi = Math.max(th.Tcase + 5, 80);
      $('ladder').innerHTML = steps.map(([lab, a, z], i) =>
        `<div class="rung"><span>${lab}</span><div class="rung__track"><div class="rung__seg${i === 0 ? ' rung__seg--water' : ''}" style="left:${(100 * (a - lo)) / (hi - lo)}%;width:${Math.max(0.4, (100 * (z - a)) / (hi - lo))}%"></div></div><span class="mono rung__v">${fmt(z, 1)} °C</span></div>`).join('')
        + `<div class="rung rung--total"><span><b>Case temperature</b></span><div class="rung__track"><div class="rung__seg" style="left:0;width:${(100 * (th.Tcase - lo)) / (hi - lo)}%"></div></div><span class="mono rung__v"><b>${fmt(th.Tcase, 1)} °C</b></span></div>`;
      $('tcT').innerHTML = `${fmt(t.th.Tcase, 1)}<small>°C</small>`; $('tcB').innerHTML = `${fmt(b.th.Tcase, 1)}<small>°C</small>`;
      $('tcD').innerHTML = `${fmt(Math.abs(t.th.Tcase - b.th.Tcase), 3)}<small>K</small>`;
      $('sTh').innerHTML = `${fmt(t.s.St * 1000, 1)}<small>mW/K</small>`;
      $('sVT').innerHTML = `${fmt(t.s.Sv * 1e6, 1)}<small>µW/K</small>`; $('sVB').innerHTML = `${fmt(b.s.Sv * 1e6, 1)}<small>µW/K</small>`;
      $('be').textContent = t.s.Be.toFixed(5);
      const shareT = t.s.Sv / t.s.S, shareB = b.s.Sv / b.s.S;
      $('lossLine').innerHTML = `Friction is <b>1 part in ${fmt(1 / shareT)}</b> of the tree’s loss and <b>1 in ${fmt(1 / shareB)}</b> of the parallel plate’s. The thin blue line at the right of the bar is drawn 3 px wide so you can see it; to scale it would be ${(shareT * 100).toFixed(4)}% of the width. Murray’s law optimises that sliver.`;
      const onB = Math.min(50, Math.round(shareB * 100000));
      $('dots').innerHTML = Array.from({ length: 50 }, (_, i) => `<i class="${i < onB ? 'on' : ''}"></i>`).join('');
      $('dotsLabel').textContent = `Per 100,000 units of loss: parallel ${fmt(shareB * 100000, 1)} viscous, tree ${fmt(shareT * 100000, 1)} viscous (each square = 1 unit)`;
      const rePort = ((V / 60000) / ((Math.PI / 4) * Math.pow(GEOM.design.d_inlet_mm * 1e-3, 2))) * GEOM.design.d_inlet_mm * 1e-3 * GEOM.water.rho / GEOM.water.mu;
      $('reG1').textContent = fmt(t.gens[0].Re); $('rePort').textContent = fmt(rePort);
      $('speedNote').textContent = `terminal channel ${fmt(t.gens[5].v, 2)} m/s · parallel channel ${fmt(parallelSpeed(V), 2)} m/s`;
      const Rt = (t.th.Tcase - Tin) / Q;
      $('dcR').innerHTML = `${fmt(Rt, 4)}<small>K/W</small>`;
      $('dcH').innerHTML = `${fmt(0.01 * Q, 1)}<small>K</small>`;
      $('dcRnote').textContent = `Screening value with Nu = 4.5, a conservative bound. OCP reports cold plates reaching below 0.02 °C/W for OAM packages. Case temperature here: ${fmt(t.th.Tcase, 1)} °C at ${fmt(Tin)} °C supply. Coarse CFD at 700 W, 40 °C: tree mean case 63.9 °C, peak 66.1 °C.`;
      $('dcF').innerHTML = `${fmt(72 * V, 0)}<small>L/min</small>`;
      $('dcP').innerHTML = `${fmt((72 * t.s.W) / 0.5, 2)}<small>W</small> / ${fmt((72 * b.s.W) / 0.5, 2)}<small>W</small>`;
      $('dcXt').innerHTML = `${fmt(298.15 * t.s.St, 1)}<small>W per GPU</small>`;
      $('dcXv').innerHTML = `${fmt(298.15 * t.s.Sv * 1000, 2)}<small>mW</small>`;
      this.querySelectorAll<HTMLButtonElement>('.preset').forEach((btn) =>
        btn.setAttribute('aria-pressed', String(+btn.dataset.q! === Q && +btn.dataset.v! === V && +btn.dataset.t! === Tin)));
      if (reduce || !this.running) { drawTree(T); drawBase(B); dots(); }
    };

    const inputs: [string, 'Q' | 'V' | 'T'][] = [['q', 'Q'], ['v', 'V'], ['t', 'T']];
    for (const [id, k] of inputs) $<HTMLInputElement>(id).addEventListener('input', (e) => { this.state[k] = parseFloat((e.target as HTMLInputElement).value); update(); });
    const setState = (Q: number, V: number, Tin: number) => {
      this.state = { Q, V, T: Tin };
      $<HTMLInputElement>('q').value = String(Q); $<HTMLInputElement>('v').value = String(V); $<HTMLInputElement>('t').value = String(Tin);
      update();
    };
    this.querySelectorAll<HTMLButtonElement>('.preset').forEach((btn) => btn.addEventListener('click', () => setState(+btn.dataset.q!, +btn.dataset.v!, +btn.dataset.t!)));
    $('reset').addEventListener('click', () => setState(700, 1.0, 40));

    fit(T); fit(B); update();
    window.addEventListener('resize', () => { fit(T); fit(B); if (!this.running) { drawTree(T); drawBase(B); dots(); } });
    this.classList.add('is-ready');
    if (!reduce) {
      const plates = this.querySelector('.cx-plates')!;
      let onScreen = false;
      this.io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen && !document.hidden) start(); else stop(); }, { threshold: 0.05 });
      this.io.observe(plates);
      document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (onScreen) start(); });
    }
  }

  disconnectedCallback() { this.io?.disconnect(); cancelAnimationFrame(this.raf); }
}
customElements.define('coldplate-explorer', ColdplateExplorer);
