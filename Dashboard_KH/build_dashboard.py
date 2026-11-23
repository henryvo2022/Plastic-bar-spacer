"""Dashboard duyệt thiết kế — bộ Mẫu KH (thanh kê PVC chữ U H20–H70).

Giai đoạn duyệt thiết kế: CHỈ đưa hình học (bản vẽ, kích thước lỗ, bước dập) — bỏ khối lượng,
hệ số an toàn, độ lún, giá. Đọc ../Mau_KH/tinh_toan/spacer_data.json, chèn vào dashboard.src.html
-> dashboard_mau_kh.html (1 file, chạy offline, in được A4).

Sản phẩm: profile PVC đùn + dập lỗ liên tục trên dây chuyền, cắt thanh 2 000 mm
-> vị trí lỗ ở hai đầu thanh là ngẫu nhiên (trang tự vẽ các thanh cắt ngẫu nhiên).

Chạy:  python build_dashboard.py
"""
from __future__ import annotations

import datetime
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "Mau_KH", "tinh_toan"))
WEB = os.path.join(SRC, "web")   # dùng chung bộ công cụ (three, esbuild) và spacer_geom.js của trình xem Mẫu KH
GEO_KEYS = ("kind", "W", "H", "t_w", "t_top", "r_in", "chamfer", "footR", "P", "archW", "archH", "archR", "archDia",
            "archHoleY", "smallDia", "smallHoleY", "slotLen", "slotWid", "slotR", "slotPitch")


def bundle_3d():
    """Gộp web/dash3d.src.js (three + OrbitControls + spacer_geom.js + DXF) thành 1 script IIFE nén."""
    out = os.path.join(HERE, "web", "dist", "dash3d.js")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    env = dict(os.environ, NODE_PATH=os.path.join(WEB, "node_modules"))
    r = subprocess.run(["node", os.path.join(WEB, "node_modules", "esbuild", "bin", "esbuild"),
                        os.path.join(HERE, "web", "dash3d.src.js"), "--bundle", "--format=iife", "--minify",
                        "--target=es2020", "--legal-comments=none", "--outfile=" + out],
                       cwd=HERE, env=env, capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        sys.exit(f"Lỗi esbuild:\n{r.stdout}\n{r.stderr}")
    return open(out, encoding="utf-8").read().replace("</script", r"<\/script")


BAR_LEN = 2000  # mm, chiều dài cắt thanh


def r2(x):
    return None if x is None else round(float(x), 2)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    d = json.load(open(os.path.join(SRC, "spacer_data.json"), encoding="utf-8"))
    sizes = []
    for row in d["customer"]:
        g = row["arch"]
        a = row["audit"] if "audit" in row else g["audit"]
        oval_top = g["slotR"] < 0 or g["slotR"] >= g["slotWid"] / 2
        sizes.append(dict(
            H=row["size"], code=row["code"], W=g["W"], tw=g["t_w"], ttop=g["t_top"],
            chamfer=g.get("chamfer", 0), footR=g.get("footR", 0),
            archW=g["archW"], archH=g["archH"], archR=g["archR"], d=g["archDia"], yh=g["archHoleY"],
            P=g["P"], slotW=g["slotWid"], slotL=g["slotLen"], slotR=g["slotR"], slotP=g.get("slotPitch") or g["P"],
            slotType="oval" if oval_top else "bo góc",
            open=r2(a["open_pct"]),
            geo={**{k: g[k] for k in GEO_KEYS if k in g}, "H": row["size"]},
        ))
    data = dict(sizes=sizes, bar_len=BAR_LEN, date=datetime.date.today().strftime("%d/%m/%Y"))
    page = open(os.path.join(HERE, "dashboard.src.html"), encoding="utf-8").read()
    js = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    page = page.replace("/*@DATA@*/{}", js, 1)
    page = page.replace("/*@DASH3D@*/", bundle_3d(), 1)
    charts = open(os.path.join(HERE, "web", "charts.js"), encoding="utf-8").read().replace("</script", r"<\/script")
    page = page.replace("/*@CHARTS@*/", charts, 1)
    for bad in ("cdn.", "importmap", "/*@"):  # Google Fonts được phép (mất mạng thì dùng font hệ thống)
        if bad in page:
            sys.exit(f"Còn tham chiếu ngoài / chỗ chèn chưa thay: {bad}")
    out = os.path.join(HERE, "dashboard_mau_kh.html")
    open(out, "w", encoding="utf-8").write(page)
    print(f"Đã ghi {out} ({len(page) / 1024:.0f} KB)")
    docs = os.path.normpath(os.path.join(HERE, "..", "docs"))     # trong repo GitHub: bản xuất bản GitHub Pages
    if os.path.isdir(docs):
        open(os.path.join(docs, "index.html"), "w", encoding="utf-8").write(page)
        print(f"Đã ghi {os.path.join(docs, 'index.html')} (GitHub Pages)")
    for s in sizes:
        print(f"  U{s['H']}: {s['W']}x{s['H']}, vòm {s['archW']}x{s['archH']}, Ø{s['d']}, P={s['P']}, lỗ lưng {s['slotL']}x{s['slotW']}")


if __name__ == "__main__":
    main()
