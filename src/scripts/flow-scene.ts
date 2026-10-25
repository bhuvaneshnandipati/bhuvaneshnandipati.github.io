/**
 * Hero "test section": particle streaklines in analytic potential flow past a sphere.
 * Particles are advected with RK2 through the exact velocity field and coloured by the
 * local pressure coefficient. A probe on the meridian plane reports u/U∞ and Cp and draws
 * the streamline through the probe point. Loaded lazily; the page works without it.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Line,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Ray,
  Raycaster,
  RingGeometry,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  WireframeGeometry,
} from 'three';
import { sphereVelocity } from '../lib/flow';
import { coolwarm } from '../lib/colormap';

export interface ProbeInfo { x: number; rho: number; speed: number; cp: number }

export interface FlowScene {
  start(): void;
  stop(): void;
  dispose(): void;
  nudgeProbe(dx: number, dy: number): ProbeInfo | null;
}

const X_MIN = -6.5;
const X_MAX = 6.5;
const R_SPAWN = 2.6;
const TRAIL = 14;
const BG = new Color('#0b0f12');

/** Map Cp onto the diverging map, centred at Cp = 0 and clipped to ±0.75 (as stated on the legend). */
export const CP_CLIP = 0.75;
const cpToColor = (cp: number, out: [number, number, number]) => {
  const c = coolwarm(0.5 + cp / (2 * CP_CLIP));
  out[0] = c[0] / 255; out[1] = c[1] / 255; out[2] = c[2] / 255;
  return out;
};

export function createFlowScene(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  opts: { reduced: boolean; onProbe: (p: ProbeInfo | null) => void; onError?: (e: unknown) => void },
): FlowScene | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    opts.onError?.(e);
    return null;
  }
  renderer.setClearColor(BG, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 2, 0.1, 100);
  const group = new Group();
  scene.add(group);

  // --- Sphere: surface coloured by the exact surface Cp, with a faint surface mesh.
  const sphereGeo = new IcosahedronGeometry(1, 4);
  const pos = sphereGeo.getAttribute('position') as BufferAttribute;
  const sCol = new Float32Array(pos.count * 3);
  const tmp: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), z = pos.getZ(i);
    const sin2 = y * y + z * z; // radius 1, so sin²θ = (y² + z²)
    cpToColor(1 - 2.25 * sin2, tmp);
    sCol[i * 3] = tmp[0] * 0.55; sCol[i * 3 + 1] = tmp[1] * 0.55; sCol[i * 3 + 2] = tmp[2] * 0.55;
  }
  sphereGeo.setAttribute('color', new BufferAttribute(sCol, 3));
  const sphere = new Mesh(sphereGeo, new MeshBasicMaterial({ vertexColors: true }));
  group.add(sphere);
  const wire = new LineSegments(
    new WireframeGeometry(new IcosahedronGeometry(1.002, 3)),
    new LineBasicMaterial({ color: 0x9fb0bb, transparent: true, opacity: 0.16 }),
  );
  group.add(wire);

  // --- Particles with trailing history, drawn as additive line segments.
  const isSmall = Math.min(window.innerWidth, window.innerHeight) < 700;
  const N = isSmall ? 650 : 1500;
  const hist = new Float32Array(N * TRAIL * 3);
  // Colour (already weighted by |Cp|) is computed once per sample, when the sample is created.
  const histCol = new Float32Array(N * TRAIL * 3);
  const shade = (x: number, y: number, z: number, out: Float32Array, o: number) => {
    const u = sphereVelocity(x, y, z);
    const cp = 1 - (u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
    const c = cpToColor(cp, [0, 0, 0]);
    const b = 0.2 + 0.8 * Math.min(1, Math.abs(cp) / CP_CLIP);
    out[o] = c[0] * b; out[o + 1] = c[1] * b; out[o + 2] = c[2] * b;
  };
  const age = new Float32Array(N);
  const segPos = new Float32Array(N * (TRAIL - 1) * 2 * 3);
  const segCol = new Float32Array(N * (TRAIL - 1) * 2 * 3);
  const segGeo = new BufferGeometry();
  segGeo.setAttribute('position', new BufferAttribute(segPos, 3));
  segGeo.setAttribute('color', new BufferAttribute(segCol, 3));
  const segMat = new LineBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false });
  const streaks = new LineSegments(segGeo, segMat);
  streaks.frustumCulled = false;
  group.add(streaks);

  const spawn = (i: number, anywhere: boolean) => {
    let x: number, y: number, z: number;
    do {
      const rho = 0.05 + Math.pow(Math.random(), 0.7) * R_SPAWN;
      const phi = Math.random() * Math.PI * 2;
      x = anywhere ? X_MIN + Math.random() * (X_MAX - X_MIN) : X_MIN - Math.random() * 1.2;
      y = rho * Math.cos(phi);
      z = rho * Math.sin(phi);
    } while (x * x + y * y + z * z < 1.1);
    const o = i * TRAIL * 3;
    for (let k = 0; k < TRAIL; k++) { hist[o + k * 3] = x; hist[o + k * 3 + 1] = y; hist[o + k * 3 + 2] = z; }
    shade(x, y, z, histCol, o);
    for (let k = 1; k < TRAIL; k++) histCol.copyWithin(o + k * 3, o, o + 3);
    age[i] = 0;
  };

  const step = (dt: number) => {
    for (let i = 0; i < N; i++) {
      const o = i * TRAIL * 3;
      // shift history back by one sample
      hist.copyWithin(o + 3, o, o + (TRAIL - 1) * 3);
      histCol.copyWithin(o + 3, o, o + (TRAIL - 1) * 3);
      const x = hist[o + 3], y = hist[o + 4], z = hist[o + 5];
      const k1 = sphereVelocity(x, y, z);
      const k2 = sphereVelocity(x + 0.5 * dt * k1[0], y + 0.5 * dt * k1[1], z + 0.5 * dt * k1[2]);
      const nx = x + dt * k2[0], ny = y + dt * k2[1], nz = z + dt * k2[2];
      hist[o] = nx; hist[o + 1] = ny; hist[o + 2] = nz;
      age[i] += dt;
      if (nx > X_MAX || nx * nx + ny * ny + nz * nz < 1.0005 || age[i] > 40) spawn(i, false);
      else shade(nx, ny, nz, histCol, o);
    }
  };

  const FADE = Array.from({ length: TRAIL }, (_, k) => (1 - k / (TRAIL - 1)) ** 1.6);
  const writeSegments = () => {
    let w = 0;
    for (let i = 0; i < N; i++) {
      const o = i * TRAIL * 3;
      for (let k = 0; k < TRAIL - 1; k++) {
        for (let e = 0; e < 2; e++) {
          const j = o + (k + e) * 3;
          segPos[w] = hist[j]; segPos[w + 1] = hist[j + 1]; segPos[w + 2] = hist[j + 2];
          // Brightness follows |Cp| (baked into histCol) so disturbed flow near the body reads first; hue stays the true Cp.
          const f = FADE[k + e];
          segCol[w] = histCol[j] * f; segCol[w + 1] = histCol[j + 1] * f; segCol[w + 2] = histCol[j + 2] * f;
          w += 3;
        }
      }
    }
    (segGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (segGeo.getAttribute('color') as BufferAttribute).needsUpdate = true;
  };

  for (let i = 0; i < N; i++) spawn(i, true);
  for (let s = 0; s < TRAIL + 4; s++) step(0.045);
  writeSegments();

  // --- Probe: marker ring + streamline through the probe point.
  const probeLineGeo = new BufferGeometry();
  const probeLinePos = new Float32Array(1200 * 3);
  probeLineGeo.setAttribute('position', new BufferAttribute(probeLinePos, 3));
  probeLineGeo.setDrawRange(0, 0);
  const probeLine = new Line(probeLineGeo, new LineBasicMaterial({ color: 0xf3f6f8, transparent: true, opacity: 0.95 }));
  probeLine.frustumCulled = false;
  group.add(probeLine);
  const ring = new Mesh(new RingGeometry(0.07, 0.1, 32), new MeshBasicMaterial({ color: 0x93a6ff, side: DoubleSide }));
  ring.visible = false;
  group.add(ring);

  const probe = new Vector3(-2.2, 1.25, 0);
  let probeOn = false;

  const traceStreamline = (p: Vector3) => {
    const unit = (x: number, y: number, z: number) => {
      const u = sphereVelocity(x, y, z);
      const m = Math.hypot(u[0], u[1], u[2]) || 1;
      return [u[0] / m, u[1] / m, u[2] / m];
    };
    const run = (sign: number) => {
      const pts: number[] = [];
      let x = p.x, y = p.y, z = p.z;
      for (let i = 0; i < 590; i++) {
        const k1 = unit(x, y, z);
        const k2 = unit(x + sign * 0.025 * k1[0], y + sign * 0.025 * k1[1], z + sign * 0.025 * k1[2]);
        x += sign * 0.05 * k2[0]; y += sign * 0.05 * k2[1]; z += sign * 0.05 * k2[2];
        if (x < X_MIN - 0.5 || x > X_MAX + 0.5 || x * x + y * y + z * z < 1.0) break;
        pts.push(x, y, z);
      }
      return pts;
    };
    const back = run(-1);
    const fwd = run(1);
    let w = 0;
    for (let i = back.length - 3; i >= 0; i -= 3) { probeLinePos[w++] = back[i]; probeLinePos[w++] = back[i + 1]; probeLinePos[w++] = back[i + 2]; }
    probeLinePos[w++] = p.x; probeLinePos[w++] = p.y; probeLinePos[w++] = p.z;
    for (let i = 0; i < fwd.length; i++) probeLinePos[w++] = fwd[i];
    probeLineGeo.setDrawRange(0, w / 3);
    (probeLineGeo.getAttribute('position') as BufferAttribute).needsUpdate = true;
  };

  const report = (): ProbeInfo | null => {
    if (!probeOn) { opts.onProbe(null); return null; }
    const u = sphereVelocity(probe.x, probe.y, probe.z);
    const speed = Math.hypot(u[0], u[1], u[2]);
    const info = { x: probe.x, rho: Math.hypot(probe.y, probe.z), speed, cp: 1 - speed * speed };
    opts.onProbe(info);
    return info;
  };

  const setProbe = (p: Vector3 | null) => {
    if (!p || p.length() < 1.03 || p.x < X_MIN || p.x > X_MAX || Math.abs(p.y) > 4.2) {
      probeOn = false;
      ring.visible = false;
      probeLineGeo.setDrawRange(0, 0);
      report();
      return;
    }
    probe.copy(p);
    probeOn = true;
    ring.visible = true;
    ring.position.copy(probe);
    traceStreamline(probe);
    report();
  };

  // --- Pointer → meridian plane (z = 0 in the sphere's frame).
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const inv = new Matrix4();
  const localRay = new Ray();
  const hit = new Vector3();
  let pointerX = 0, pointerY = 0;

  const pick = (clientX: number, clientY: number) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    group.updateMatrixWorld();
    inv.copy(group.matrixWorld).invert();
    localRay.copy(raycaster.ray).applyMatrix4(inv);
    const t = -localRay.origin.z / localRay.direction.z;
    if (!isFinite(t) || t < 0) return null;
    return localRay.at(t, hit).clone();
  };

  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointerX = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointerY = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (e.pointerType === 'mouse') setProbe(pick(e.clientX, e.clientY));
    if (opts.reduced) render();
  };
  const onDown = (e: PointerEvent) => { if (e.pointerType !== 'mouse') { setProbe(pick(e.clientX, e.clientY)); if (opts.reduced) render(); } };
  const onLeave = (e: PointerEvent) => { pointerX = 0; pointerY = 0; if (e.pointerType === 'mouse') { setProbe(null); if (opts.reduced) render(); } };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerleave', onLeave);

  // --- Framing: fit roughly x ∈ [−5, 5.5] across the width, closer on portrait screens.
  const frame = () => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    const span = aspect < 1 ? 6.6 : aspect < 1.6 ? 8.6 : 10.5;
    const dist = span / (2 * Math.tan((camera.fov * Math.PI) / 360) * aspect);
    camera.position.set(0, dist * 0.2, dist);
    camera.lookAt(0, 0, 0);
    group.position.x = aspect > 1.6 ? 0.9 : 0;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(() => { frame(); render(); });
  ro.observe(container);
  frame();

  // --- Loop
  let raf = 0;
  let running = false;
  let last = 0;
  let t = 0;
  let yaw = 0.45, pitch = 0.22;

  function render() {
    if (ring.visible) ring.lookAt(camera.position);
    renderer.render(scene, camera);
  }

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    t += dt;
    step(dt * 0.9);
    step(dt * 0.9);
    writeSegments();
    const targetYaw = 0.45 + Math.sin(t * 0.08) * 0.18 + pointerX * 0.32;
    const targetPitch = 0.22 + pointerY * 0.14;
    yaw += (targetYaw - yaw) * 0.04;
    pitch += (targetPitch - pitch) * 0.04;
    group.rotation.set(pitch, yaw, 0);
    render();
  };

  group.rotation.set(pitch, yaw, 0);
  render();

  return {
    start() {
      if (running || opts.reduced) { render(); return; }
      running = true;
      last = 0;
      raf = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    nudgeProbe(dx: number, dy: number) {
      const next = probeOn ? probe.clone() : new Vector3(-2.2, 1.25, 0);
      if (probeOn) { next.x += dx; next.y += dy; }
      setProbe(next);
      render();
      return report();
    },
    dispose() {
      this.stop();
      ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerleave', onLeave);
      renderer.dispose();
      [sphereGeo, segGeo, probeLineGeo, wire.geometry, ring.geometry].forEach((g) => g.dispose());
    },
  };
}
