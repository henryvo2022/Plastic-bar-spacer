/**
 * Ghi file DXF R12 (AC1009) — AutoCAD mở trực tiếp (Open / DXFIN), rồi Save As .dwg nếu cần.
 * Đơn vị mm. Chữ tiếng Việt ghi bằng mã \U+XXXX, kiểu chữ dùng arial.ttf.
 */
export const LAYERS = {
  CONTOUR: { color: 7, ltype: 'CONTINUOUS' },   // đường bao thấy
  HIDDEN: { color: 8, ltype: 'DASHED' },         // đường bao khuất
  CENTER: { color: 1, ltype: 'CENTER' },         // đường tâm
  DIM: { color: 5, ltype: 'CONTINUOUS' },        // kích thước, mũi tên, chú thích kích thước
  HATCH: { color: 8, ltype: 'CONTINUOUS' },      // gạch mặt cắt
  TEXT: { color: 7, ltype: 'CONTINUOUS' },
  DETAIL: { color: 3, ltype: 'DASHED' },         // vòng chỉ và khung hình trích
  FRAME: { color: 7, ltype: 'CONTINUOUS' },      // khung bản vẽ, khung tên
  BUNG: { color: 7, ltype: 'CONTINUOUS' },       // 3D: bản bụng (mặt đỡ thép)
  CANH_A: { color: 4, ltype: 'CONTINUOUS' },     // 3D: cánh A
  CANH_B: { color: 6, ltype: 'CONTINUOUS' },     // 3D: cánh B
  VAT_GOC: { color: 8, ltype: 'CONTINUOUS' },    // 3D: vát / bo góc trong
};

const n = v => { const r = Math.abs(v) < 1e-9 ? 0 : Math.round(v * 1e4) / 1e4; return String(r); };
const esc = s => Array.from(String(s)).map(ch => { const c = ch.codePointAt(0); return c > 126 ? '\\U+' + c.toString(16).toUpperCase().padStart(4, '0') : ch; }).join('');

export class Dxf {
  constructor() { this.out = []; this.min = [Infinity, Infinity, Infinity]; this.max = [-Infinity, -Infinity, -Infinity]; this.used = new Set(); }
  ext(x, y, z = 0) { const p = [x, y, z]; for (let i = 0; i < 3; i++) { this.min[i] = Math.min(this.min[i], p[i]); this.max[i] = Math.max(this.max[i], p[i]); } }
  g(...a) { for (let i = 0; i < a.length; i += 2) this.out.push(String(a[i]), typeof a[i + 1] === 'number' ? n(a[i + 1]) : String(a[i + 1])); }
  line(L, x1, y1, x2, y2) { this.used.add(L); this.ext(x1, y1); this.ext(x2, y2); this.g(0, 'LINE', 8, L, 10, x1, 20, y1, 30, 0, 11, x2, 21, y2, 31, 0); }
  poly(L, pts, closed = false) {
    if (pts.length < 2) return;
    if (pts.length === 2 && !closed) return this.line(L, pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
    this.used.add(L);
    this.g(0, 'POLYLINE', 8, L, 66, 1, 10, 0, 20, 0, 30, 0, 70, closed ? 1 : 0);
    for (const [x, y] of pts) { this.ext(x, y); this.g(0, 'VERTEX', 8, L, 10, x, 20, y, 30, 0); }
    this.g(0, 'SEQEND', 8, L);
  }
  circle(L, x, y, r) { this.used.add(L); this.ext(x - r, y - r); this.ext(x + r, y + r); this.g(0, 'CIRCLE', 8, L, 10, x, 20, y, 30, 0, 40, r); }
  solid(L, a, b, c) { this.used.add(L); [a, b, c].forEach(p => this.ext(p[0], p[1])); this.g(0, 'SOLID', 8, L, 10, a[0], 20, a[1], 30, 0, 11, b[0], 21, b[1], 31, 0, 12, c[0], 22, c[1], 32, 0, 13, c[0], 23, c[1], 33, 0); }
  /** align: 0 trái, 1 giữa, 2 phải (tại đường chân chữ); rot: độ, ngược chiều kim đồng hồ. */
  text(L, x, y, h, s, align = 0, rot = 0) {
    if (!String(s).trim()) return;
    this.used.add(L); this.ext(x, y);
    this.g(0, 'TEXT', 8, L, 10, x, 20, y, 30, 0, 40, h, 1, esc(s), 50, rot, 7, 'KH');
    if (align) this.g(72, align, 11, x, 21, y, 31, 0);
  }
  /** Lưới đa diện (POLYFACE). verts: [[x,y,z]], faces: [[a,b,c]] chỉ số 1-based, âm = cạnh ẩn. */
  polyface(L, verts, faces) {
    this.used.add(L);
    this.g(0, 'POLYLINE', 8, L, 66, 1, 10, 0, 20, 0, 30, 0, 70, 64, 71, verts.length, 72, faces.length);
    for (const [x, y, z] of verts) { this.ext(x, y, z); this.g(0, 'VERTEX', 8, L, 10, x, 20, y, 30, z, 70, 192); }
    for (const [a, b, c] of faces) this.g(0, 'VERTEX', 8, L, 10, 0, 20, 0, 30, 0, 70, 128, 71, a, 72, b, 73, c);
    this.g(0, 'SEQEND', 8, L);
  }
  toString() {
    // Khung file đủ cấu trúc DXF R12 (AC1009) như AutoCAD tự ghi: HEADER, TABLES (VPORT, LTYPE, LAYER, STYLE, VIEW, UCS, APPID, DIMSTYLE),
    // BLOCKS ($Model_Space, $Paper_Space), ENTITIES. Không có biến chỉ có từ R2000 (như $INSUNITS) và không dùng handle.
    const h = [];
    const G = (...a) => { for (let i = 0; i < a.length; i += 2) h.push(String(a[i]), typeof a[i + 1] === 'number' ? n(a[i + 1]) : String(a[i + 1])); };
    const mn = this.min.map(v => isFinite(v) ? v : 0), mx = this.max.map(v => isFinite(v) ? v : 0);
    const lim = [Math.min(mn[0], 0), Math.min(mn[1], 0), Math.max(mx[0], 420), Math.max(mx[1], 297)];
    G(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 9, '$DWGCODEPAGE', 3, 'ANSI_1252',
      9, '$INSBASE', 10, 0, 20, 0, 30, 0, 9, '$EXTMIN', 10, mn[0], 20, mn[1], 30, mn[2], 9, '$EXTMAX', 10, mx[0], 20, mx[1], 30, mx[2],
      9, '$LIMMIN', 10, lim[0], 20, lim[1], 9, '$LIMMAX', 10, lim[2], 20, lim[3],
      9, '$ORTHOMODE', 70, 0, 9, '$REGENMODE', 70, 1, 9, '$FILLMODE', 70, 1, 9, '$QTEXTMODE', 70, 0, 9, '$MIRRTEXT', 70, 0,
      9, '$LTSCALE', 40, 1, 9, '$ATTMODE', 70, 1, 9, '$TEXTSIZE', 40, 2.5, 9, '$TRACEWID', 40, 1, 9, '$TEXTSTYLE', 7, 'STANDARD',
      9, '$CLAYER', 8, '0', 9, '$CELTYPE', 6, 'BYLAYER', 9, '$CECOLOR', 62, 256,
      9, '$DIMSCALE', 40, 1, 9, '$DIMASZ', 40, 2.5, 9, '$DIMEXO', 40, 0.625, 9, '$DIMDLI', 40, 3.75, 9, '$DIMTXT', 40, 2.5,
      9, '$COORDS', 70, 1, 9, '$HANDLING', 70, 0, 9, '$LUNITS', 70, 2, 9, '$LUPREC', 70, 4, 9, '$AUNITS', 70, 0, 9, '$AUPREC', 70, 2,
      9, '$ELEVATION', 40, 0, 9, '$PELEVATION', 40, 0, 9, '$THICKNESS', 40, 0, 9, '$LIMCHECK', 70, 0,
      9, '$ANGBASE', 50, 0, 9, '$ANGDIR', 70, 0, 9, '$PDMODE', 70, 0, 9, '$PDSIZE', 40, 0, 9, '$PLINEWID', 40, 0,
      9, '$UCSNAME', 2, '', 9, '$UCSORG', 10, 0, 20, 0, 30, 0, 9, '$UCSXDIR', 10, 1, 20, 0, 30, 0, 9, '$UCSYDIR', 10, 0, 20, 1, 30, 0,
      9, '$WORLDVIEW', 70, 1, 9, '$TILEMODE', 70, 1, 9, '$MAXACTVP', 70, 64, 0, 'ENDSEC');
    G(0, 'SECTION', 2, 'TABLES');
    G(0, 'TABLE', 2, 'VPORT', 70, 1);
    G(0, 'VPORT', 2, '*ACTIVE', 70, 0, 10, 0, 20, 0, 11, 1, 21, 1, 12, mx[0] / 2, 22, mx[1] / 2, 13, 0, 23, 0, 14, 0.5, 24, 0.5, 15, 0.5, 25, 0.5,
      16, 0, 26, 0, 36, 1, 17, 0, 27, 0, 37, 0, 40, Math.max(mx[1] - mn[1], 100) * 1.2, 41, 1.34, 42, 50, 43, 0, 44, 0, 50, 0, 51, 0,
      71, 0, 72, 1000, 73, 1, 74, 3, 75, 0, 76, 0, 77, 0, 78, 0);
    G(0, 'ENDTAB');
    G(0, 'TABLE', 2, 'LTYPE', 70, 3);
    G(0, 'LTYPE', 2, 'CONTINUOUS', 70, 0, 3, 'Solid line', 72, 65, 73, 0, 40, 0);
    G(0, 'LTYPE', 2, 'DASHED', 70, 0, 3, '__ __ __', 72, 65, 73, 2, 40, 3, 49, 2, 49, -1);
    G(0, 'LTYPE', 2, 'CENTER', 70, 0, 3, '____ _ ____', 72, 65, 73, 4, 40, 10, 49, 6, 49, -1.5, 49, 1, 49, -1.5);
    G(0, 'ENDTAB');
    const names = ['0', ...Object.keys(LAYERS).filter(k => this.used.has(k))];
    G(0, 'TABLE', 2, 'LAYER', 70, names.length);
    for (const k of names) { const d = LAYERS[k] || { color: 7, ltype: 'CONTINUOUS' }; G(0, 'LAYER', 2, k, 70, 0, 62, d.color, 6, d.ltype); }
    G(0, 'ENDTAB');
    G(0, 'TABLE', 2, 'STYLE', 70, 2);
    G(0, 'STYLE', 2, 'STANDARD', 70, 0, 40, 0, 41, 1, 50, 0, 71, 0, 42, 2.5, 3, 'txt', 4, '');
    G(0, 'STYLE', 2, 'KH', 70, 0, 40, 0, 41, 1, 50, 0, 71, 0, 42, 2.5, 3, 'arial.ttf', 4, '');
    G(0, 'ENDTAB');
    G(0, 'TABLE', 2, 'VIEW', 70, 0, 0, 'ENDTAB');
    G(0, 'TABLE', 2, 'UCS', 70, 0, 0, 'ENDTAB');
    G(0, 'TABLE', 2, 'APPID', 70, 1, 0, 'APPID', 2, 'ACAD', 70, 0, 0, 'ENDTAB');
    G(0, 'TABLE', 2, 'DIMSTYLE', 70, 1);
    G(0, 'DIMSTYLE', 2, 'STANDARD', 70, 0, 3, '', 4, '', 5, '', 6, '', 7, '', 40, 1, 41, 2.5, 42, 0.625, 43, 3.75, 44, 1.25, 45, 0, 46, 0, 47, 0, 48, 0,
      140, 2.5, 141, 2.5, 142, 0, 143, 0.03937007874, 144, 1, 145, 0, 146, 1, 147, 0.625,
      71, 0, 72, 0, 73, 0, 74, 0, 75, 0, 76, 0, 77, 1, 78, 8, 170, 0, 171, 3, 172, 1, 173, 0, 174, 0, 175, 0, 176, 0, 177, 0, 178, 0);
    G(0, 'ENDTAB', 0, 'ENDSEC');
    G(0, 'SECTION', 2, 'BLOCKS');
    G(0, 'BLOCK', 8, '0', 2, '$MODEL_SPACE', 70, 0, 10, 0, 20, 0, 30, 0, 3, '$MODEL_SPACE', 1, '', 0, 'ENDBLK', 8, '0');
    G(0, 'BLOCK', 8, '0', 2, '$PAPER_SPACE', 70, 0, 10, 0, 20, 0, 30, 0, 3, '$PAPER_SPACE', 1, '', 0, 'ENDBLK', 8, '0');
    G(0, 'ENDSEC');
    G(0, 'SECTION', 2, 'ENTITIES');
    const tail = ['0', 'ENDSEC', '0', 'EOF'];
    return h.concat(this.out, tail).join('\r\n') + '\r\n';
  }
}

export function download(text, filename) {
  const blob = new Blob([text], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------------------------------------------------------------- hình học 2D phụ trợ
/** Cắt đoạn thẳng vào hình chữ nhật (Liang–Barsky). */
function clipSeg(a, b, r) {
  let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - r.x0], [dx, r.x1 - a[0]], [-dy, a[1] - r.y0], [dy, r.y1 - a[1]]]) {
    if (Math.abs(p) < 1e-12) { if (q < 0) return null; continue; }
    const t = q / p; if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; }
  }
  return [[a[0] + t0 * dx, a[1] + t0 * dy], [a[0] + t1 * dx, a[1] + t1 * dy]];
}
/** Cắt đường gấp khúc vào hình chữ nhật -> danh sách các đoạn gấp khúc. */
export function clipPolyline(pts, r) {
  const runs = []; let cur = null;
  for (let i = 0; i + 1 < pts.length; i++) {
    const c = clipSeg(pts[i], pts[i + 1], r);
    if (!c) { cur = null; continue; }
    const startsAtA = Math.hypot(c[0][0] - pts[i][0], c[0][1] - pts[i][1]) < 1e-9;
    if (!cur || !startsAtA) { cur = [c[0]]; runs.push(cur); }
    cur.push(c[1]);
    if (Math.hypot(c[1][0] - pts[i + 1][0], c[1][1] - pts[i + 1][1]) > 1e-9) cur = null;
  }
  return runs.filter(r => r.length > 1);
}
/** Đường gạch mặt cắt 45° (khoảng cách sp) cho đa giác, quy tắc chẵn-lẻ. */
export function hatchLines(poly, sp) {
  const c = Math.SQRT1_2, rot = ([x, y]) => [c * x + c * y, -c * x + c * y], back = ([u, v]) => [c * u - c * v, c * u + c * v];
  const P = poly.map(rot); let lo = Infinity, hi = -Infinity;
  for (const p of P) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
  const out = [];
  for (let v = Math.ceil(lo / sp) * sp; v <= hi; v += sp) {
    const xs = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      if ((a[1] <= v && b[1] > v) || (b[1] <= v && a[1] > v)) xs.push(a[0] + (v - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) out.push([back([xs[i], v]), back([xs[i + 1], v])]);
  }
  return out;
}
