/**
 * Dashboard Mẫu KH — mô hình 3D + xuất DXF (AutoCAD).
 * Hình học 3D dùng chung với trình xem Mẫu KH: ../../Mau_KH/tinh_toan/web/spacer_geom.js
 * Trang chính (script nội tuyến) cung cấp window.KH.state() và phát sự kiện 'kh-change' khi đổi cỡ / thanh / vị trí cắt.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildSpacerGeometries } from '../../Mau_KH/tinh_toan/web/spacer_geom.js';
import { Dxf, download, clipPolyline, hatchLines } from './dxf.js';

const $ = id => document.getElementById(id);
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const EN = () => (window.KH && window.KH.state().lang === 'en');
const LT = (vi, en) => (EN() ? en : vi);   // chữ theo ngôn ngữ (T trong export2D là phép đổi toạ độ)
const nf = (x, d = 1) => Number(x).toLocaleString(EN() ? 'en-US' : 'vi-VN', { maximumFractionDigits: d });
const KH = window.KH;

// =====================================================================================
// 1. KHUNG XEM 3D
// =====================================================================================
const host = $('v3d');
let renderer, scene, camera, controls, group, grid, mat, edgeMat, ok3d = false;
let curLen = 400, curView = 'iso', curParts = [], curKey = '';

const viewerLabel = () => LT('Mô hình 3D thanh kê. Kéo để xoay, cuộn để phóng to; bằng bàn phím: phím mũi tên xoay, + và − phóng, Home về góc nhìn ban đầu', '3D model of the spacer. Drag to rotate, scroll to zoom; with the keyboard: arrow keys rotate, + and − zoom, Home resets the view');
/** Điều khiển bằng bàn phím: mũi tên xoay quanh thanh, + / − phóng, Home (hoặc 0) về góc nhìn ban đầu. */
function onViewerKey(e) {
  const k = e.key;
  if (k === 'Home' || k === '0') { e.preventDefault(); setView(curView, true); return; }
  const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  if (k === 'ArrowLeft') sph.theta -= 0.12; else if (k === 'ArrowRight') sph.theta += 0.12;
  else if (k === 'ArrowUp') sph.phi = Math.max(0.08, sph.phi - 0.1); else if (k === 'ArrowDown') sph.phi = Math.min(Math.PI - 0.08, sph.phi + 0.1);
  else if (k === '+' || k === '=') sph.radius *= 0.9; else if (k === '-' || k === '_') sph.radius *= 1.1;
  else return;
  e.preventDefault();
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph)); camera.lookAt(controls.target); controls.update(); render();
}

function init3D() {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  } catch (e) {
    host.innerHTML = '<p class="muted" style="padding:16px">' + LT('Trình duyệt này không chạy được WebGL nên không hiển thị mô hình 3D. Nút xuất DXF vẫn dùng được.', 'This browser cannot run WebGL, so the 3D model is not shown. DXF export still works.') + '</p>';
    return false;
  }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.domElement.setAttribute('aria-label', viewerLabel());
  renderer.domElement.setAttribute('role', 'group');
  renderer.domElement.tabIndex = 0;
  renderer.domElement.addEventListener('keydown', onViewerKey);
  host.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 0.5, 30000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x80858f, 1.15));
  const d1 = new THREE.DirectionalLight(0xffffff, 1.5); d1.position.set(500, 900, 800); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.45); d2.position.set(-700, 300, -600); scene.add(d2);
  mat = new THREE.MeshStandardMaterial({ color: 0xc9cdd4, roughness: 0.6, metalness: 0.02, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  edgeMat = new THREE.LineBasicMaterial({ color: 0x23262b });
  group = new THREE.Group(); scene.add(group);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener('change', render);
  new ResizeObserver(resize).observe(host);
  applyTheme();
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  return true;
}
function applyTheme() {
  if (!scene) return;
  scene.background = new THREE.Color(css('--sheet') || '#ffffff');
  edgeMat.color.set(css('--line') || '#1f1f1d');
  const dark = scene.background.getHSL({}).l < 0.4;
  mat.color.set(dark ? 0x9ea3ad : 0xc9cdd4);
  if (grid) { grid.material.color.set(css('--grid') || '#e1e0d9'); }
  render();
}
function resize() {
  if (!renderer) return;
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  setView(curView, false);
}
function render() { if (renderer) renderer.render(scene, camera); }

/** Nét CAD: bỏ đường nối lưng – thành (sản phẩm đùn liền khối). */
function cadEdges(geo, s) {
  const eg = new THREE.EdgesGeometry(geo, 25), p = eg.attributes.position.array, out = [];
  const sy = s.H - s.t_top, lim = s.W / 2 - s.t_w, e = 0.02;
  for (let i = 0; i < p.length; i += 6) {
    let [x1, y1, z1, x2, y2, z2] = [p[i], p[i + 1], p[i + 2], p[i + 3], p[i + 4], p[i + 5]];
    if (Math.abs(y1 - sy) < e && Math.abs(y2 - sy) < e) {
      if (Math.abs(z1 - z2) < e && Math.abs(z1) > lim - e) continue;
      if (Math.abs(x1 - x2) < e) {
        z1 = Math.max(-lim, Math.min(lim, z1)); z2 = Math.max(-lim, Math.min(lim, z2));
        if (Math.abs(z1 - z2) < e) continue;
      }
    }
    out.push(x1, y1, z1, x2, y2, z2);
  }
  eg.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  return new THREE.LineSegments(eg, edgeMat);
}

function build() {
  const st = KH.state(), s = st.s.geo, L = curLen;
  const key = [st.s.H, st.e, L].join('|');
  const lenTxt = L >= 2000 ? LT(`thanh ${nf(L, 0)} mm`, `${nf(L, 0)} mm bar`) : LT(`đoạn ${L} mm tính từ đầu trái`, `${L} mm from the left end`);
  $('m3d-head').textContent = LT(`H${st.s.H} · thanh ${st.bar} · e = ${nf(st.e)} mm · ${lenTxt}`, `H${st.s.H} · bar ${st.bar} · e = ${nf(st.e)} mm · ${lenTxt}`);
  if (renderer) renderer.domElement.setAttribute('aria-label', viewerLabel());
  if (key === curKey && curParts.length) return;
  curKey = key;
  curParts = buildSpacerGeometries(s, L, st.e, { curveSegs: L > 1000 ? 8 : 14 });
  if (ok3d) {
    group.children.slice().forEach(o => { group.remove(o); o.geometry?.dispose(); });
    for (const p of curParts) {
      group.add(new THREE.Mesh(p.geometry, mat));
      if (p.edges) group.add(cadEdges(p.geometry, s));
    }
    if (grid) { scene.remove(grid); grid.geometry.dispose(); }
    const gs = Math.ceil((L * 1.1) / 100) * 100;
    grid = new THREE.GridHelper(gs, Math.round(gs / (L > 1000 ? 100 : 20)), css('--axis') || '#c3c2b7', css('--grid') || '#e1e0d9');
    grid.material.transparent = true; grid.material.opacity = 0.55;
    grid.position.y = -0.05; scene.add(grid);
    setView(curView, true);
  }
}

function setView(view, reset = true) {
  curView = view;
  if (!ok3d || !curParts.length) return;
  const s = KH.state().s.geo, L = curLen, half = L / 2, big = Math.max(s.W, s.H, s.P);
  const fov = camera.fov * Math.PI / 180, aspect = camera.aspect || 1.6;
  const fitDist = (rad) => rad / Math.sin(Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * aspect)) / 2);
  let target, dir, dist;
  if (view === 'left' || view === 'right') {
    const sg = view === 'left' ? -1 : 1;
    target = new THREE.Vector3(sg * (half - 0.7 * big), s.H * 0.45, 0);
    dir = new THREE.Vector3(sg * 0.95, 0.6, 0.85);
    dist = fitDist(1.15 * big);
  } else if (view === 'side') {
    target = new THREE.Vector3(0, s.H / 2, 0); dir = new THREE.Vector3(0, 0.08, 1);
    dist = (half * 1.08) / Math.tan(Math.atan(Math.tan(fov / 2) * aspect));
  } else if (view === 'top') {
    target = new THREE.Vector3(0, s.H / 2, 0); dir = new THREE.Vector3(0, 1, 0.03);
    dist = (half * 1.08) / Math.tan(Math.atan(Math.tan(fov / 2) * aspect));
  } else {
    target = new THREE.Vector3(0, s.H / 2, 0); dir = new THREE.Vector3(0.6, 0.55, 1);
    dist = fitDist(Math.hypot(half, s.W / 2, s.H / 2) * (L > 1000 ? 0.6 : 0.78));
  }
  if (reset) {
    camera.position.copy(target).add(dir.normalize().multiplyScalar(dist));
    controls.target.copy(target);
    camera.near = Math.max(0.5, dist / 500); camera.far = dist * 20; camera.updateProjectionMatrix();
    controls.update();
  }
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === view));
  render();
}

// =====================================================================================
// 2. XUẤT DXF 3D — lưới đa diện (POLYFACE) từng khối, cạnh phẳng chung được ẩn
// =====================================================================================
function export3D() {
  const st = KH.state(), L = curLen;
  if (!curParts.length) build();
  const dxf = new Dxf();
  const layerOf = { lung: 'BUNG', thanh_A: 'CANH_A', thanh_B: 'CANH_B', vat: 'VAT_GOC', bo_goc: 'VAT_GOC', goc_ngoai: 'BUNG' };
  for (const part of curParts) {
    const g = part.geometry, pos = g.attributes.position, idx = g.index;
    const map = new Map(), verts = [], tris = [];
    const vid = i => {
      // AutoCAD: X dọc thanh từ 0, Y ngang (thành A ở Y âm = mặt trước), Z hướng lên
      const x = pos.getX(i) + L / 2, y = -pos.getZ(i), z = pos.getY(i);
      const k = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
      let v = map.get(k); if (v === undefined) { v = verts.length; verts.push([x, y, z]); map.set(k, v); } return v;
    };
    const cnt = idx ? idx.count : pos.count;
    for (let i = 0; i < cnt; i += 3) {
      const a = vid(idx ? idx.getX(i) : i), b = vid(idx ? idx.getX(i + 1) : i + 1), c = vid(idx ? idx.getX(i + 2) : i + 2);
      if (a === b || b === c || a === c) continue;
      const A = verts[a], B = verts[b], C = verts[c];
      const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-9) continue;
      tris.push({ v: [a, b, c], n: [nx / nl, ny / nl, nz / nl] });
    }
    // cạnh nằm giữa hai tam giác đồng phẳng -> ẩn
    const edges = new Map(), ek = (p, q) => p < q ? p + '_' + q : q + '_' + p;
    tris.forEach((t, ti) => { for (let j = 0; j < 3; j++) { const k = ek(t.v[j], t.v[(j + 1) % 3]); (edges.get(k) || edges.set(k, []).get(k)).push(ti); } });
    const hidden = (t, ti) => [0, 1, 2].map(j => {
      const f = edges.get(ek(t.v[j], t.v[(j + 1) % 3]));
      if (!f || f.length !== 2) return false;
      const o = tris[f[0] === ti ? f[1] : f[0]];
      return t.n[0] * o.n[0] + t.n[1] * o.n[1] + t.n[2] * o.n[2] > 0.9999;
    });
    // chia khối <= 30000 đỉnh / mặt (giới hạn R12)
    let i0 = 0;
    while (i0 < tris.length) {
      const lmap = new Map(), lv = [], lf = [];
      let i = i0;
      for (; i < tris.length && lv.length < 29997 && lf.length < 30000; i++) {
        const t = tris[i], h = hidden(t, i);
        const ids = t.v.map(v => { let l = lmap.get(v); if (l === undefined) { l = lv.length + 1; lv.push(verts[v]); lmap.set(v, l); } return l; });
        lf.push(ids.map((l, j) => h[j] ? -l : l));
      }
      dxf.polyface(layerOf[part.name] || 'BUNG', lv, lf);
      i0 = i;
    }
  }
  const s = st.s;
  download(dxf.toString(), LT(`ThanhKe_${s.code}_3D_${L}mm_e${String(st.e).replace('.', ',')}.dxf`, `Spacer_${s.code}_3D_${L}mm_e${st.e}.dxf`));
}

/** Dấu đỏ HAN CORPORATION (cùng hình dạng với biểu tượng trên trang): viền kép bo góc, "HAN" và "CORPORATION". Tâm (cx, cy), rộng w mm, xoay angDeg (ngược chiều kim đồng hồ). */
function stampDXF(dxf, cx, cy, w, angDeg) {
  const sc = w / 170, a = angDeg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const W = (lx, ly) => { const x = (lx - 85) * sc, y = -(ly - 32) * sc; return [cx + x * ca - y * sa, cy + x * sa + y * ca]; };
  const rr = (x0, y0, x1, y1, r) => {
    const out = [];
    for (const [ox, oy, a0] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
      for (let i = 0; i <= 6; i++) { const t = (a0 + 90 * i / 6) * Math.PI / 180; out.push(W(ox + r * Math.cos(t), oy + r * Math.sin(t))); }
    return out;
  };
  dxf.poly('STAMP', rr(2, 2, 168, 62, 9), true, 3 * sc);          // viền ngoài dày
  dxf.poly('STAMP', rr(8, 8, 162, 56, 5), true, 1.2 * sc);        // viền trong mảnh
  const [hx, hy] = W(85, 35), [cx2, cy2] = W(85, 50);
  dxf.text('STAMP', hx, hy, 26 * 0.72 * sc, 'HAN', 1, angDeg);
  dxf.text('STAMP', cx2, cy2, 11.5 * 0.72 * sc, 'CORPORATION', 1, angDeg);
}

// =====================================================================================
// 3. XUẤT DXF BẢN VẼ 2D — chuyển tờ bản vẽ SVG sang DXF đúng tỷ lệ 1:1 (mm)
// =====================================================================================
const STROKE = { 'ln': 'CONTOUR', 'ln-s': 'CONTOUR', 'brk': 'CONTOUR', 'hid': 'HIDDEN', 'ctr': 'CENTER', 'dim': 'DIM', 'ext': 'DIM', 'callout': 'DETAIL', 'dbox': 'DETAIL', 'cutln': 'CUT', 'cutthin': 'CENTER' };
const FONT = { ttl: 13, sb: 12, tag: 12, dt: 12.5 };

function export2D() {
  const st = KH.state(), s = st.s, svg = $('d-sheet'), k = +svg.dataset.k;
  const T = (X, Y) => [X / k, -Y / k];
  const dxf = new Dxf();
  const clipCache = new Map();
  const clipOf = el => {
    const c = el.closest('[clip-path]'); if (!c) return null;
    const id = (c.getAttribute('clip-path').match(/#([^)]+)/) || [])[1];
    if (!clipCache.has(id)) {
      const r = svg.querySelector('#' + CSS.escape(id) + ' rect');
      clipCache.set(id, r ? (() => { const x = +r.getAttribute('x'), y = +r.getAttribute('y'), w = +r.getAttribute('width'), h = +r.getAttribute('height'); return { x0: x / k, x1: (x + w) / k, y0: -(y + h) / k, y1: -y / k }; })() : null);
    }
    return clipCache.get(id);
  };
  const layerOf = el => { for (const c of (el.getAttribute('class') || '').split(/\s+/)) if (STROKE[c]) return STROKE[c]; return null; };
  const emit = (L, pts, closed, clip) => {
    if (!clip) return dxf.poly(L, pts, closed);
    const inside = pts.every(p => p[0] >= clip.x0 - 1e-6 && p[0] <= clip.x1 + 1e-6 && p[1] >= clip.y0 - 1e-6 && p[1] <= clip.y1 + 1e-6);
    if (inside) return dxf.poly(L, pts, closed);
    clipPolyline(closed ? pts.concat([pts[0]]) : pts, clip).forEach(run => dxf.poly(L, run, false));
  };
  const hatch = (poly, clip) => {
    const sp = 6 / k;
    for (const [a, b] of hatchLines(poly, sp)) {
      if (!clip) dxf.line('HATCH', a[0], a[1], b[0], b[1]);
      else clipPolyline([a, b], clip).forEach(r => dxf.line('HATCH', r[0][0], r[0][1], r[1][0], r[1][1]));
    }
  };
  const arrow = (tip, from) => {               // mũi tên kích thước: dài 8, nửa rộng 2,72 (đơn vị màn hình)
    const dx = tip[0] - from[0], dy = tip[1] - from[1], l = Math.hypot(dx, dy); if (l < 1e-9) return;
    const ux = dx / l, uy = dy / l, al = 8 / k, aw = 2.72 / k, bx = tip[0] - ux * al, by = tip[1] - uy * al;
    dxf.solid('DIM', tip, [bx - uy * aw, by + ux * aw], [bx + uy * aw, by - ux * aw]);
  };
  const markers = (el, pts) => {
    if (el.hasAttribute('marker-end') && pts.length > 1) arrow(pts[pts.length - 1], pts[pts.length - 2]);
    if (el.hasAttribute('marker-start') && pts.length > 1) arrow(pts[0], pts[1]);
  };
  const parsePath = d => {
    const pts = []; let closed = false;
    for (const m of d.matchAll(/([MLZ])([^MLZ]*)/gi)) {
      if (m[1].toUpperCase() === 'Z') { closed = true; continue; }
      const nums = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
      for (let i = 0; i + 1 < nums.length; i += 2) pts.push(T(nums[i], nums[i + 1]));
    }
    return { pts, closed };
  };

  for (const el of svg.querySelectorAll('line, path, circle, rect, text')) {
    if (el.closest('defs, clipPath, marker, pattern')) continue;
    const L = layerOf(el), clip = clipOf(el), tag = el.tagName.toLowerCase();
    const hatchFill = (el.getAttribute('fill') || '').startsWith('url(');
    if (tag === 'line') {
      if (!L) continue;
      const pts = [T(+el.getAttribute('x1'), +el.getAttribute('y1')), T(+el.getAttribute('x2'), +el.getAttribute('y2'))];
      if (L === 'CUT') dxf.poly('CUT', pts, false, 2.6 / k);          // vết cắt: nét dày
      else emit(L, pts, false, clip);
      markers(el, pts);
    } else if (tag === 'path') {
      const { pts, closed } = parsePath(el.getAttribute('d') || '');
      if ((el.getAttribute('class') || '').includes('cutfill') && pts.length === 3) { dxf.solid('CUT', pts[0], pts[1], pts[2]); continue; }   // mũi tên chiều nhìn
      if (hatchFill && closed) { hatch(pts, clip); continue; }
      if (!L) continue;
      emit(L, pts, closed, clip); markers(el, pts);
    } else if (tag === 'circle') {
      if (!L) continue;
      const [cx, cy] = T(+el.getAttribute('cx'), +el.getAttribute('cy')), r = +el.getAttribute('r') / k;
      if (!clip || (cx - r >= clip.x0 && cx + r <= clip.x1 && cy - r >= clip.y0 && cy + r <= clip.y1)) dxf.circle(L, cx, cy, r);
      else emit(L, Array.from({ length: 72 }, (_, i) => [cx + r * Math.cos(i * Math.PI / 36), cy + r * Math.sin(i * Math.PI / 36)]), true, clip);
    } else if (tag === 'rect') {
      const x = +el.getAttribute('x'), y = +el.getAttribute('y'), w = +el.getAttribute('width'), h = +el.getAttribute('height');
      const pts = [T(x, y), T(x + w, y), T(x + w, y + h), T(x, y + h)];
      if (hatchFill) { hatch(pts, clip); continue; }
      if (!L) continue;
      emit(L, pts, true, clip);
    } else if (tag === 'text') {
      const cls = (el.getAttribute('class') || '').split(/\s+/);
      const fs = FONT[cls.find(c => FONT[c])] || 12.5;
      const [x, y] = T(+el.getAttribute('x'), +el.getAttribute('y'));
      const anchor = el.getAttribute('text-anchor'), rotM = (el.getAttribute('transform') || '').match(/rotate\(\s*(-?[\d.]+)/);
      dxf.text(cls.includes('dt') ? 'DIM' : 'TEXT', x, y, fs * 0.7 / k, el.textContent, anchor === 'middle' ? 1 : anchor === 'end' ? 2 : 0, rotM ? -Number(rotM[1]) : 0);
    }
  }

  // khung tên
  const x0 = dxf.min[0], x1 = dxf.max[0], y0 = dxf.min[1], y1 = dxf.max[1], W = x1 - x0;
  const th = Math.max(1.8, W * 0.0105), rh = th * 2.3, m = th * 2;
  const rows = [
    [[LT('Sản phẩm', 'Product'), LT('Thanh kê cốt thép PVC chữ U', 'PVC U-channel rebar spacer')], [LT('Mã / kích thước', 'Code / size'), `${s.code} · ${nf(s.W)} × ${nf(s.H)} mm`]],
    [[LT('Số hiệu bản vẽ', 'Drawing no.'), `${s.code}-BV01 · ${LT('lần sửa đổi', 'rev.')} A · ${LT('tờ', 'sheet')} 1/1`], [LT('Giai đoạn / ngày', 'Stage / date'), LT(`Duyệt thiết kế · ${st.date}`, `Design review · ${st.date}`)]],
    [[LT('Vật liệu', 'Material'), LT('uPVC tái chế', 'Recycled uPVC')], [LT('Công nghệ', 'Process'), LT('Đùn ép biên dạng, dập lỗ liên tục', 'Profile extrusion, continuous punching')]],
    [[LT('Chiều dài thanh', 'Bar length'), LT(`${nf(st.L, 0)} mm, lỗ ở đầu thanh ngẫu nhiên`, `${nf(st.L, 0)} mm, random hole position at bar ends`)], [LT('Đơn vị', 'Units'), 'mm']],
    [[LT('Tỷ lệ', 'Scale'), LT(`Hình chính 1:1 · chi tiết 1, 2 tỷ lệ ${svg.dataset.ratio}:1`, `Main views 1:1 · details 1, 2 at ${svg.dataset.ratio}:1`)], [LT('Phương pháp chiếu', 'Projection'), LT('Góc thứ nhất', 'First angle')]],
    [[LT('Dung sai', 'Tolerances'), LT('Lớp bảo vệ c = H ±1 mm (đề xuất); kích thước khác chờ thống nhất', 'Cover c = H ±1 mm (proposed); other dimensions to be agreed')], [LT('Lập / Kiểm / Duyệt', 'Drawn / Checked / Approved'), '........ / ........ / ........']],
  ];
  const tbTop = y0 - m, tbBot = tbTop - rows.length * rh, mid = x0 + W / 2;
  rows.forEach((r, i) => {
    const yb = tbTop - (i + 1) * rh + rh * 0.32;
    r.forEach(([kk, v], j) => { const xs = (j ? mid : x0) + th * 0.6; dxf.text('TEXT', xs, yb, th * 0.75, kk.toUpperCase()); dxf.text('TEXT', xs + W * 0.14, yb, th, v); });
    dxf.line('FRAME', x0, tbTop - i * rh, x1, tbTop - i * rh);
  });
  dxf.line('FRAME', x0, tbBot, x1, tbBot); dxf.line('FRAME', x0, tbTop, x0, tbBot); dxf.line('FRAME', x1, tbTop, x1, tbBot); dxf.line('FRAME', mid, tbTop, mid, tbBot);
  dxf.poly('FRAME', [[x0 - m, y1 + m], [x1 + m, y1 + m], [x1 + m, tbBot - m], [x0 - m, tbBot - m]], true);
  stampDXF(dxf, x1 - W * 0.13, tbBot + rh * 0.9, W * 0.17, 6);      // dấu đè lên ô Lập / Kiểm / Duyệt
  download(dxf.toString(), LT(`ThanhKe_${s.code}_banve.dxf`, `Spacer_${s.code}_drawing.dxf`));
}

// =====================================================================================
// 4. GẮN GIAO DIỆN
// =====================================================================================
ok3d = init3D();
let tmr = 0;
const schedule = () => { clearTimeout(tmr); tmr = setTimeout(build, 90); };
document.addEventListener('kh-change', schedule);
document.querySelectorAll('[data-len]').forEach(b => b.addEventListener('click', () => {
  curLen = +b.dataset.len; curKey = '';
  document.querySelectorAll('[data-len]').forEach(x => x.setAttribute('aria-pressed', x === b));
  build();
}));
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view, true)));
$('btn-dxf3d').addEventListener('click', export3D);
$('btn-dxf2d').addEventListener('click', export2D);
build();
if (ok3d) resize();
