"""
Re-render the Orion ANSYS Fluent contour screenshots as clean, comparable figures.

Each screenshot is a scalar field drawn through the rainbow colormap shown in its own
legend. Inverting that colormap recovers the scalar at every pixel. The recovered fields
are then re-rendered:
  * on one physical scale (px per metre) with the nose at the same position,
  * Mach number as M / M_inf so the Mach 2 and Mach 6 cases share one colour scale,
  * temperature in kelvin,
  * with the capsule as a solid silhouette and no vendor chrome.

Usage:  python3 scripts/orion-recolor.py
Inputs: src/assets/img/orion-{mach2,mach6,temperature}.jpg (original exports)
Outputs: src/assets/img/orion-field-{m2,m6,t6}.png, src/data/orion-fields.json,
         logs/orion-recolor.log
Accuracy: values are quantised by the legend gradient and JPEG noise; expect a few
percent of the legend range. Shapes and positions (shock, expansion, wake) are exact
to the pixel of the original export.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "src/assets/img"
LOG = []


def log(*a):
    s = " ".join(str(x) for x in a)
    LOG.append(s)
    print(s)


# Measured from the exports (see logs/orion-recolor.log for the checks).
SOURCES = {
    "m2": dict(file="orion-mach2.jpg", legend_x=(4, 25), legend_y=(59, 383), vmin=8.354e-3, vmax=2.763,
               frame=(342, 89, 916, 662), m_per_px=8.0 / (810 - 427), interior=None, M_inf=2.0),
    "m6": dict(file="orion-mach6.jpg", legend_x=(6, 27), legend_y=(51, 375), vmin=2.985e-3, vmax=5.996,
               frame=(235, 17, 897, 668), m_per_px=7.0 / (814 - 428), interior=None, M_inf=6.0),
    "t6": dict(file="orion-temperature.jpg", legend_x=(5, 26), legend_y=(52, 376), vmin=219.3, vmax=1932.0,
               frame=(234, 18, 896, 669), m_per_px=5.25 / (716 - 427), interior=None, M_inf=None),
}


def recover(cfg):
    a = np.asarray(Image.open(IMG / cfg["file"]).convert("RGB")).astype(np.float32)
    lx0, lx1 = cfg["legend_x"]
    ly0, ly1 = cfg["legend_y"]
    # Legend LUT: median colour across the bar width at each row; top = vmax, bottom = vmin.
    bar = a[ly0 + 2 : ly1 - 1, lx0 + 4 : lx1 - 3]
    lut = np.median(bar, axis=1)
    vals = np.linspace(cfg["vmax"], cfg["vmin"], len(lut))
    x0, y0, x1, y1 = cfg["frame"]
    f = a[y0 + 2 : y1 - 1, x0 + 2 : x1 - 1]
    h, w, _ = f.shape
    flat = f.reshape(-1, 3)
    best = np.empty(len(flat), dtype=np.int32)
    dist = np.empty(len(flat), dtype=np.float32)
    for s in range(0, len(flat), 40000):
        d = ((flat[s : s + 40000, None, :] - lut[None, :, :]) ** 2).sum(-1)
        best[s : s + 40000] = d.argmin(1)
        dist[s : s + 40000] = np.sqrt(d.min(1))
    field = vals[best].reshape(h, w)
    off = (dist > 60).reshape(h, w)  # pixels that are not on the colormap (capsule, text, lines)
    # The capsule is filled with Fluent's pale lavender background colour; it is the largest such
    # off-map component. Everything else that is off the colormap (axis line, scale text) is inpainted.
    r, g, bl = f[..., 0], f[..., 1], f[..., 2]
    lavender = (r > 150) & (r < 225) & (g > 170) & (g < 230) & (bl > 225) & ((bl - r) > 22)
    lab, n = ndimage.label(off & lavender)
    sizes = ndimage.sum(off & lavender, lab, range(1, n + 1))
    body_label = 1 + int(np.argmax(sizes))
    body = lab == body_label
    body = ndimage.binary_fill_holes(body)
    # Inpaint every off-map pixel (including under the body, so edge blending never shows garbage).
    idx = ndimage.distance_transform_edt(off | body, return_distances=False, return_indices=True)
    field = np.where(off | body, field[idx[0], idx[1]], field)
    ys, xs = np.where(body)
    nose_x = xs.min()
    axis_y = 0.5 * (ys.min() + ys.max())
    log(f"{cfg['file']}: field {w}x{h}px, LUT {len(lut)} rows, off-map {off.mean()*100:.1f}%,"
        f" body {body.mean()*100:.1f}%, nose x={nose_x}px, axis y={axis_y:.1f}px,"
        f" {1/cfg['m_per_px']:.2f} px/m, mean LUT distance {dist[~off.reshape(-1)].mean():.1f}")
    # Physical coordinates: x from the nose (flow +x), y from the axis (up +).
    mpp = cfg["m_per_px"]
    ext = dict(x0=(0 - nose_x) * mpp, x1=(w - nose_x) * mpp, y0=(axis_y - h) * mpp, y1=axis_y * mpp)
    body_len = (xs.max() - xs.min()) * mpp
    body_dia = (ys.max() - ys.min()) * mpp
    log(f"   extent x {ext['x0']:.2f}..{ext['x1']:.2f} m, y {ext['y0']:.2f}..{ext['y1']:.2f} m;"
        f" capsule length {body_len:.2f} m, diameter {body_dia:.2f} m")
    return dict(field=field, body=body, ext=ext, mpp=mpp, nose=(nose_x, axis_y))


def resample(rec, X, Y):
    """Sample the recovered field and body mask at physical points (bilinear / nearest)."""
    mpp, (nx, ay) = rec["mpp"], rec["nose"]
    px = X / mpp + nx
    py = ay - Y / mpp
    f = ndimage.map_coordinates(rec["field"], [py, px], order=1, mode="nearest")
    soft = ndimage.gaussian_filter(rec["body"].astype(np.float32), 0.8)
    b = ndimage.map_coordinates(soft, [py, px], order=1, mode="constant", cval=0)
    alpha = np.clip((b - 0.35) / 0.3, 0, 1)
    return f, alpha


def ramp(stops):
    stops = [(p, np.array(c, dtype=np.float32)) for p, c in stops]

    def f(t):
        t = np.clip(t, 0, 1)
        out = np.zeros(t.shape + (3,), dtype=np.float32)
        for (p0, c0), (p1, c1) in zip(stops[:-1], stops[1:]):
            m = (t >= p0) & (t <= p1)
            u = ((t - p0) / (p1 - p0))[m][:, None]
            out[m] = c0 + (c1 - c0) * u
        return out

    return f


# M/M_inf: 0 → 1 dark-to-pale blue (as in the F1 air-speed figures), above 1 into amber (accelerated).
MACH_CMAP = ramp([(0.0, (8, 29, 74)), (0.25, (24, 78, 150)), (0.5, (54, 132, 196)), (0.714, (198, 219, 239)),
                  (0.75, (236, 238, 232)), (0.86, (246, 196, 120)), (1.0, (196, 92, 30))])
MACH_MAX = 1.4  # colour scale spans 0..1.4 M_inf; 1.0 M_inf sits at t = 0.714
TEMP_CMAP = ramp([(0.0, (18, 14, 38)), (0.25, (84, 24, 96)), (0.5, (186, 54, 66)), (0.75, (243, 136, 40)),
                  (1.0, (252, 236, 170))])


def render(rec_list, keys, scale, cmap, norm, window, out_px_per_m):
    x0, x1, y0, y1 = window
    W = int(round((x1 - x0) * out_px_per_m))
    H = int(round((y1 - y0) * out_px_per_m))
    xs = x0 + (np.arange(W) + 0.5) / out_px_per_m
    ys = y1 - (np.arange(H) + 0.5) / out_px_per_m
    X, Y = np.meshgrid(xs, ys)
    outs = {}
    for key, rec in zip(keys, rec_list):
        f, alpha = resample(rec, X, Y)
        rgb = cmap(norm(key, f))
        ink = np.array((16, 19, 21), dtype=np.float32)
        rgb = rgb * (1 - alpha[..., None]) + ink * alpha[..., None]
        b = alpha > 0.5
        outs[key] = Image.fromarray(rgb.astype(np.uint8))
        log(f"   rendered {key}: {W}x{H}px at {out_px_per_m} px/m, value range {f[~b].min():.3g}..{f[~b].max():.3g}")
    return outs, dict(x0=x0, x1=x1, y0=y0, y1=y1, width=W, height=H, pxPerM=out_px_per_m)


def main():
    recs = {k: recover(c) for k, c in SOURCES.items()}
    # Common window: intersection of the Mach 2 and Mach 6 extents, symmetric about the axis.
    e2, e6 = recs["m2"]["ext"], recs["m6"]["ext"]
    x0 = max(e2["x0"], e6["x0"])
    x1 = min(e2["x1"], e6["x1"])
    ylim = min(e2["y1"], -e2["y0"], e6["y1"], -e6["y0"])
    window = (round(x0, 2), round(x1, 2), -round(ylim, 2), round(ylim, 2))
    log(f"common window x {window[0]}..{window[1]} m, y ±{window[3]} m")
    PPM = 90
    mach_norm = lambda key, f: (f / SOURCES[key]["M_inf"]) / MACH_MAX
    mach, meta = render([recs["m2"], recs["m6"]], ["m2", "m6"], None, MACH_CMAP, mach_norm, window, PPM)
    temp_norm = lambda key, f: (f - 200.0) / (1950.0 - 200.0)
    temp, _ = render([recs["t6"]], ["t6"], None, TEMP_CMAP, temp_norm, window, PPM)
    mach["m2"].save(IMG / "orion-field-m2.png", optimize=True)
    mach["m6"].save(IMG / "orion-field-m6.png", optimize=True)
    temp["t6"].save(IMG / "orion-field-t6.png", optimize=True)

    def stops(cmap, n=9):
        t = np.linspace(0, 1, n)
        c = cmap(t)
        return [f"rgb({int(r)} {int(g)} {int(b)}) {p*100:.1f}%" for (r, g, b), p in zip(c, t)]

    out = dict(
        window=meta,
        mach=dict(max=MACH_MAX, gradient=stops(MACH_CMAP, 15)),
        temperature=dict(min=200, max=1950, gradient=stops(TEMP_CMAP)),
        source="Recovered from the ANSYS Fluent contour exports by inverting each legend colormap.",
    )
    (ROOT / "src/data/orion-fields.json").write_text(json.dumps(out, indent=2))
    (ROOT / "logs/orion-recolor.log").write_text("\n".join(LOG) + "\n")
    log("wrote orion-field-{m2,m6,t6}.png and src/data/orion-fields.json")


if __name__ == "__main__":
    sys.exit(main())
