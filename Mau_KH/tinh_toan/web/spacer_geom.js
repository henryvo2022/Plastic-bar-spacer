/**
 * Hình học 3D thanh kê PVC chữ U — DÙNG CHUNG cho trình xem Mẫu KH (app.src.js) và dashboard (Dashboard_KH).
 *
 * Sản phẩm: profile PVC đùn + dập lỗ liên tục trên dây chuyền; dao cắt không đồng bộ khuôn dập
 * -> lỗ ở hai đầu thanh bị cắt hở ngẫu nhiên.
 *
 * Toạ độ: X dọc thanh trong [-L/2, L/2], Y hướng lên (Y = 0 là mặt ván khuôn), Z ngang thanh.
 * Thành phải (+Z) = "thành A": lỗ lưng đồng tâm vòm thành này; thành trái (-Z) so le P/2.
 * e (cutE) = khoảng cách từ đầu trái (X = -L/2) tới tâm vòm đầu tiên của thành A, 0 ≤ e < P.
 */
import * as THREE from 'three';

/** Mọi vị trí x ≡ res (mod P) trong [lo, hi]. */
export function positionsIn(res, P, lo, hi) {
  const out = [];
  for (let x = res + Math.ceil((lo - res) / P) * P; x <= hi + 1e-9; x += P) out.push(x);
  return out;
}

/** Cắt đường gấp khúc (đi từ trái sang phải) vào khoảng lo ≤ x ≤ hi. */
export function clipPolylineX(pts, lo, hi) {
  const out = [], add = p => { const q = out[out.length - 1]; if (!q || Math.abs(q.x - p.x) > 1e-7 || Math.abs(q.y - p.y) > 1e-7) out.push(p); };
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (i > 0) {
      const q = pts[i - 1];
      for (const X of (p.x >= q.x ? [lo, hi] : [hi, lo])) {
        if ((q.x - X) * (p.x - X) < 0) { const t = (X - q.x) / (p.x - q.x); add(new THREE.Vector2(X, q.y + t * (p.y - q.y))); }
      }
    }
    if (p.x >= lo - 1e-9 && p.x <= hi + 1e-9) add(p);
  }
  return out;
}

/** Phần đường bao lỗ (kín, ngược chiều kim đồng hồ) nằm TRONG thanh tại mặt cắt x = X0.
 *  side = +1: đầu phải (giữ x < X0), -1: đầu trái (giữ x > X0). Điểm trả về đã xếp theo chiều đi của cạnh đầu thanh. */
export function notchAt(pts, X0, side) {
  const n = pts.length, P = i => pts[((i % n) + n) % n], inside = i => side * (P(i).x - X0) < 0;
  let start = -1;
  for (let i = 0; i < n; i++) if (!inside(i - 1) && inside(i)) { start = i; break; }
  if (start < 0) return null;
  const cross = (a, b) => { const t = (X0 - a.x) / (b.x - a.x); return new THREE.Vector2(X0, a.y + t * (b.y - a.y)); };
  const run = [cross(P(start - 1), P(start))];
  let i = start;
  while (inside(i) && i - start < n) { run.push(P(i).clone()); i++; }
  run.push(cross(P(i - 1), P(i)));
  return run.reverse();
}

/** Lỗ nằm trọn trong thanh -> lỗ kín; lỗ cắt ngang đầu thanh -> khía trên cạnh đầu thanh; ngoài thanh -> bỏ. */
export function addCutFeature(shape, path, halfL, notches) {
  const pts = path.getPoints(24);
  if (pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-6) pts.pop();
  let mn = Infinity, mx = -Infinity;
  for (const p of pts) { mn = Math.min(mn, p.x); mx = Math.max(mx, p.x); }
  if (mx <= -halfL || mn >= halfL) return;
  if (mn > -halfL && mx < halfL) { shape.holes.push(path); return; }
  const run = mx >= halfL ? notchAt(pts, halfL, 1) : notchAt(pts, -halfL, -1);
  if (run) (mx >= halfL ? notches.R : notches.L).push(run);
}

/** Đường bao ngoài: cạnh dưới (trái -> phải, đã gồm vòm) -> đầu phải đi lên (kèm khía) -> cạnh trên -> đầu trái đi xuống (kèm khía). */
export function traceEndCutOutline(shape, bottom, halfL, yTop, notches) {
  shape.moveTo(bottom[0].x, bottom[0].y);
  for (let i = 1; i < bottom.length; i++) shape.lineTo(bottom[i].x, bottom[i].y);
  notches.R.sort((a, b) => a[0].y - b[0].y).forEach(run => run.forEach(p => shape.lineTo(p.x, p.y)));
  shape.lineTo(halfL, yTop);
  shape.lineTo(-halfL, yTop);
  notches.L.sort((a, b) => b[0].y - a[0].y).forEach(run => run.forEach(p => shape.lineTo(p.x, p.y)));
  shape.closePath();
}

/** Lỗ chữ nhật bo góc (cornerR < wid/2) hoặc oval (cornerR < 0 hoặc ≥ wid/2), tâm (cx, cy), ngược chiều kim đồng hồ. */
export function createSlotHolePath(cx, cy, len, wid, cornerR = -1) {
  const path = new THREE.Path();
  if (cornerR >= 0 && cornerR < wid / 2) {
    const x0 = cx - len / 2, x1 = cx + len / 2, y0 = cy - wid / 2, y1 = cy + wid / 2, r = cornerR;
    path.moveTo(x0 + r, y0);
    path.lineTo(x1 - r, y0);
    path.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
    path.lineTo(x1, y1 - r);
    path.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
    path.lineTo(x0 + r, y1);
    path.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
    path.lineTo(x0, y0 + r);
    path.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
    path.closePath();
    return path;
  }
  const r = wid / 2;
  const straight = Math.max(0.1, (len - wid) / 2);
  path.absarc(cx - straight, cy, r, Math.PI * 0.5, Math.PI * 1.5, false);
  path.lineTo(cx + straight, cy - r);
  path.absarc(cx + straight, cy, r, -Math.PI * 0.5, Math.PI * 0.5, false);
  path.closePath();
  return path;
}

/**
 * Dựng các khối của thanh (đã đặt đúng vị trí thế giới).
 * spec: bản ghi hình học theo tên trường của spacer_data.json (W, H, t_w, t_top, P, kind, archW, archH, archR,
 *       archDia, archHoleY, smallDia, smallHoleY, slotLen, slotWid, slotR, slotPitch, chamfer, r_in, holeH, holeL, holeY).
 * Trả về [{ name, geometry, edges }]; edges = true với tấm lưng và hai thành (vẽ nét CAD).
 */
export function buildSpacerGeometries(spec, L, cutE, { curveSegs = 12 } = {}) {
  const halfL = L / 2;
  const {
    W, H, t_w, t_top, P: pitch, kind = 'arch',
    holeH, holeL, holeY,
    archW, archH, archR, archDia, archHoleY, smallDia = 0, smallHoleY = 0,
    slotLen, slotWid
  } = spec;
  const r_in = spec.r_in || 0, ch = spec.chamfer || 0;
  const resA = -halfL + cutE;                          // pha tâm vòm thành A (+Z)
  const parts = [];

  // A. Tấm lưng (Y từ H - t_top tới H), lỗ lưng đồng tâm vòm thành A
  const topShape = new THREE.Shape(), topNotches = { L: [], R: [] };
  const slotPitch = spec.slotPitch || pitch;
  if (slotWid > 0) {
    for (const sx of positionsIn(resA, slotPitch, -halfL - slotLen, halfL + slotLen)) {
      addCutFeature(topShape, createSlotHolePath(sx, 0, slotLen, slotWid, spec.slotR ?? -1), halfL, topNotches);
    }
  }
  traceEndCutOutline(topShape, [new THREE.Vector2(-halfL, -W / 2), new THREE.Vector2(halfL, -W / 2)], halfL, W / 2, topNotches);
  const topGeo = new THREE.ExtrudeGeometry(topShape, { depth: t_top, bevelEnabled: false, curveSegments: curveSegs });
  topGeo.rotateX(Math.PI / 2);                        // shape X -> X, shape Y -> Z, đùn -> -Y
  topGeo.translate(0, H, 0);
  parts.push({ name: 'lung', geometry: topGeo, edges: true });

  // B. Hai thành bên (Y từ 0 tới H - t_top)
  const wallHeight = H - t_top;
  const wallGeo = isRight => {
    const wallShape = new THREE.Shape(), notches = { L: [], R: [] };
    const res = resA + (isRight ? 0 : pitch / 2);
    if (kind === 'arch') {
      const r = Math.min(archR, archW / 2 - 0.5, archH - 0.5);
      const archCenters = positionsIn(res, pitch, -halfL - archW, halfL + archW);
      const bottom = [new THREE.Vector2(-halfL - archW - 1, 0)];
      for (const ax of archCenters) {
        const xL = ax - archW / 2, xR = ax + archW / 2;
        bottom.push(new THREE.Vector2(xL, 0), new THREE.Vector2(xL, archH - r));
        for (let i = 1; i <= curveSegs; i++) { const a = Math.PI - (Math.PI / 2) * i / curveSegs; bottom.push(new THREE.Vector2(xL + r + r * Math.cos(a), archH - r + r * Math.sin(a))); }
        for (let i = 1; i <= curveSegs; i++) { const a = Math.PI / 2 - (Math.PI / 2) * i / curveSegs; bottom.push(new THREE.Vector2(xR - r + r * Math.cos(a), archH - r + r * Math.sin(a))); }
        bottom.push(new THREE.Vector2(xR, 0));
      }
      bottom.push(new THREE.Vector2(halfL + archW + 1, 0));
      if (archDia > 0) {
        for (const hx of positionsIn(res + pitch / 2, pitch, -halfL - archDia, halfL + archDia)) {
          const c = new THREE.Path(); c.absarc(hx, archHoleY, archDia / 2, 0, Math.PI * 2, false);
          addCutFeature(wallShape, c, halfL, notches);
        }
      }
      if (smallDia > 0) {
        for (const ax of archCenters) {
          const c = new THREE.Path(); c.absarc(ax, smallHoleY, smallDia / 2, 0, Math.PI * 2, false);
          addCutFeature(wallShape, c, halfL, notches);
        }
      }
      traceEndCutOutline(wallShape, clipPolylineX(bottom, -halfL, halfL), halfL, wallHeight, notches);
    } else {
      if (kind === 'oval' && holeH > 0 && holeL > 0) {
        for (const hx of positionsIn(res, pitch, -halfL - holeL, halfL + holeL)) {
          addCutFeature(wallShape, createSlotHolePath(hx, holeY, holeL, holeH), halfL, notches);
        }
      }
      traceEndCutOutline(wallShape, [new THREE.Vector2(-halfL, 0), new THREE.Vector2(halfL, 0)], halfL, wallHeight, notches);
    }
    const g = new THREE.ExtrudeGeometry(wallShape, { depth: t_w, bevelEnabled: false, curveSegments: curveSegs });
    g.translate(0, 0, isRight ? W / 2 - t_w : -W / 2);
    return g;
  };
  parts.push({ name: 'thanh_A', geometry: wallGeo(true), edges: true });
  parts.push({ name: 'thanh_B', geometry: wallGeo(false), edges: true });

  // C. Bo góc trong r_in (nếu có)
  if (r_in > 0) {
    const yc = H - t_top;
    [1, -1].forEach(side => {
      const zc = side * (W / 2 - t_w), u = z => -z;
      const sh = new THREE.Shape();
      sh.moveTo(u(zc), yc - r_in);
      sh.lineTo(u(zc), yc);
      sh.lineTo(u(zc - side * r_in), yc);
      sh.absarc(u(zc - side * r_in), yc - r_in, r_in, Math.PI / 2, side > 0 ? Math.PI : 0, side < 0);
      sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false, curveSegments: 8 });
      g.rotateY(Math.PI / 2);
      g.translate(-halfL, 0, 0);
      parts.push({ name: 'bo_goc', geometry: g, edges: false });
    });
  }
  // C2. Vát trong 45°: tam giác cạnh c tại góc lưng – thành, đùn liền suốt thanh
  if (ch > 0) {
    const yc = H - t_top;
    [1, -1].forEach(side => {
      const zc = side * (W / 2 - t_w);
      const sh = new THREE.Shape();
      sh.moveTo(-zc, yc);
      sh.lineTo(-zc, yc - ch);
      sh.lineTo(-(zc - side * ch), yc);
      sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false });
      g.rotateY(Math.PI / 2);
      g.translate(-halfL, 0, 0);
      parts.push({ name: 'vat', geometry: g, edges: false });
    });
  }
  return parts;
}
